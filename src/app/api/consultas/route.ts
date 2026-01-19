import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getCache, setCache, deleteCache, deleteCachePattern, CacheKeys } from '@/lib/redis'
import { programarSeguimiento } from '@/lib/queue/messages'

// Schema de validación para crear consulta
const consultaSchema = z.object({
  cita_id: z.string().min(1, 'ID de cita requerido'),
  paciente_id: z.string().min(1, 'ID de paciente requerido'),
  fecha: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Fecha inválida'),
  motivo: z.string().optional(),

  // Mediciones básicas
  peso: z.number().positive().optional(),
  talla: z.number().positive().optional(),

  // Composición corporal
  grasa_corporal: z.number().min(0).max(100).optional(),
  porcentaje_agua: z.number().min(0).max(100).optional(),
  masa_muscular_kg: z.number().positive().optional(),
  grasa_visceral: z.number().int().min(0).optional(),

  // Perímetros
  brazo_relajado: z.number().positive().optional(),
  brazo_flexionado: z.number().positive().optional(),
  cintura: z.number().positive().optional(),
  cadera_maximo: z.number().positive().optional(),
  muslo_maximo: z.number().positive().optional(),
  muslo_medio: z.number().positive().optional(),
  pantorrilla_maximo: z.number().positive().optional(),

  // Pliegues cutáneos
  pliegue_tricipital: z.number().positive().optional(),
  pliegue_subescapular: z.number().positive().optional(),
  pliegue_bicipital: z.number().positive().optional(),
  pliegue_cresta_iliaca: z.number().positive().optional(),
  pliegue_supraespinal: z.number().positive().optional(),
  pliegue_abdominal: z.number().positive().optional(),

  // Notas
  notas: z.string().optional(),
  diagnostico: z.string().optional(),
  objetivo: z.string().optional(),
  plan: z.string().optional(),
  observaciones: z.string().optional(),
  proxima_cita: z.string().optional(),
})

// GET /api/consultas?paciente_id=xxx - Obtener consultas de un paciente con paginación (con caché)
// GET /api/consultas?paciente_id=xxx&all=true - Obtener TODAS las consultas (para gráficas)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paciente_id = searchParams.get('paciente_id')
    const all = searchParams.get('all') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!paciente_id) {
      return NextResponse.json(
        { error: 'ID de paciente requerido' },
        { status: 400 }
      )
    }

    // Si se solicitan TODAS las consultas (para gráficas)
    if (all) {
      const cacheKey = `consultations:${paciente_id}:all`

      // Intentar obtener del caché
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        console.log('✅ Cache HIT: all consultations', paciente_id)
        return NextResponse.json(cached)
      }

      console.log('❌ Cache MISS: all consultations', paciente_id)

      // Obtener todas las consultas (solo los datos necesarios para gráficas)
      const consultas = await prisma.consulta.findMany({
        where: { paciente_id },
        orderBy: { fecha: 'desc' },
        select: {
          id: true,
          fecha: true,
          peso: true,
          talla: true,
          imc: true,
          grasa_corporal: true,
          porcentaje_agua: true,
          masa_muscular_kg: true,
          grasa_visceral: true,
          brazo_relajado: true,
          brazo_flexionado: true,
          cintura: true,
          cadera_maximo: true,
          muslo_maximo: true,
          muslo_medio: true,
          pantorrilla_maximo: true,
          pliegue_tricipital: true,
          pliegue_subescapular: true,
          pliegue_bicipital: true,
          pliegue_cresta_iliaca: true,
          pliegue_supraespinal: true,
          pliegue_abdominal: true,
        },
      })

      const response = { consultas }

      // Guardar en caché (5 minutos para datos de gráficas)
      await setCache(cacheKey, response, 300)

      return NextResponse.json(response)
    }

    // Modo normal con paginación
    const cacheKey = CacheKeys.consultationsList(paciente_id, page, limit)

    // Intentar obtener del caché
    const cached = await getCache<any>(cacheKey)
    if (cached) {
      console.log('✅ Cache HIT: consultations list', paciente_id)
      return NextResponse.json(cached)
    }

    console.log('❌ Cache MISS: consultations list', paciente_id)

    const skip = (page - 1) * limit

    // Obtener consultas con paginación y total
    const [consultas, total] = await Promise.all([
      prisma.consulta.findMany({
        where: { paciente_id },
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          archivos: {
            orderBy: { createdAt: 'desc' },
          },
          cita: {
            select: {
              id: true,
              fecha_hora: true,
              motivo_consulta: true,
            },
          },
        },
      }),
      prisma.consulta.count({ where: { paciente_id } }),
    ])

    const response = {
      consultas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Guardar en caché (3 minutos para listas de consultas)
    await setCache(cacheKey, response, 180)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error al obtener consultas:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener consultas', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/consultas - Crear nueva consulta
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = consultaSchema.parse(body)

    // Calcular IMC si hay peso y talla
    let imc: number | undefined
    if (validatedData.peso && validatedData.talla) {
      imc = validatedData.peso / (validatedData.talla * validatedData.talla)
      imc = Math.round(imc * 10) / 10 // Redondear a 1 decimal
    }

    // Crear consulta
    const consulta = await prisma.consulta.create({
      data: {
        cita_id: validatedData.cita_id,
        paciente_id: validatedData.paciente_id,
        fecha: new Date(validatedData.fecha),
        motivo: validatedData.motivo,

        // Mediciones básicas
        peso: validatedData.peso,
        talla: validatedData.talla,
        imc,

        // Composición corporal
        grasa_corporal: validatedData.grasa_corporal,
        porcentaje_agua: validatedData.porcentaje_agua,
        masa_muscular_kg: validatedData.masa_muscular_kg,
        grasa_visceral: validatedData.grasa_visceral,

        // Perímetros
        brazo_relajado: validatedData.brazo_relajado,
        brazo_flexionado: validatedData.brazo_flexionado,
        cintura: validatedData.cintura,
        cadera_maximo: validatedData.cadera_maximo,
        muslo_maximo: validatedData.muslo_maximo,
        muslo_medio: validatedData.muslo_medio,
        pantorrilla_maximo: validatedData.pantorrilla_maximo,

        // Pliegues cutáneos
        pliegue_tricipital: validatedData.pliegue_tricipital,
        pliegue_subescapular: validatedData.pliegue_subescapular,
        pliegue_bicipital: validatedData.pliegue_bicipital,
        pliegue_cresta_iliaca: validatedData.pliegue_cresta_iliaca,
        pliegue_supraespinal: validatedData.pliegue_supraespinal,
        pliegue_abdominal: validatedData.pliegue_abdominal,

        // Notas
        notas: validatedData.notas,
        diagnostico: validatedData.diagnostico,
        objetivo: validatedData.objetivo,
        plan: validatedData.plan,
        observaciones: validatedData.observaciones,
        proxima_cita: validatedData.proxima_cita ? new Date(validatedData.proxima_cita) : null,
      },
      include: {
        archivos: true,
      },
    })

    // Programar recordatorio de seguimiento si tiene próxima cita sugerida
    if (validatedData.proxima_cita) {
      try {
        const fechaSugerida = new Date(validatedData.proxima_cita)
        await programarSeguimiento(consulta.id, fechaSugerida)
        console.log('📅 Recordatorio de seguimiento programado para:', fechaSugerida.toLocaleString('es-MX'))
      } catch (queueError) {
        console.error('Error al programar seguimiento:', queueError)
        // No fallar la creación de la consulta si hay error en la programación
      }
    }

    // Invalidar caché de consultas del paciente y detalle del paciente
    await deleteCachePattern(`consultations:${validatedData.paciente_id}:*`)
    await deleteCache(CacheKeys.patientDetail(validatedData.paciente_id))
    console.log('🗑️  Cache invalidated: consultations and patient detail', validatedData.paciente_id)

    return NextResponse.json(consulta, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear consulta:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al crear consulta', details: errorMessage },
      { status: 500 }
    )
  }
}
