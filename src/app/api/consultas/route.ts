import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getCache, setCache, deleteCache, deleteCachePattern, CacheKeys } from '@/lib/redis'

// Schema de validación para crear consulta
const consultaSchema = z.object({
  cita_id: z.string().min(1, 'ID de cita requerido'),
  paciente_id: z.string().min(1, 'ID de paciente requerido'),
  fecha: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Fecha inválida'),
  motivo: z.string().optional(),

  // Mediciones
  peso: z.number().positive().optional(),
  talla: z.number().positive().optional(),
  cintura: z.number().positive().optional(),
  cadera: z.number().positive().optional(),
  brazo: z.number().positive().optional(),
  muslo: z.number().positive().optional(),
  grasa_corporal: z.number().min(0).max(100).optional(),
  presion_sistolica: z.number().positive().optional(),
  presion_diastolica: z.number().positive().optional(),

  // Notas
  notas: z.string().optional(),
  diagnostico: z.string().optional(),
  objetivo: z.string().optional(),
  plan: z.string().optional(),
  observaciones: z.string().optional(),
  proxima_cita: z.string().optional(),
})

// GET /api/consultas?paciente_id=xxx - Obtener consultas de un paciente con paginación (con caché)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paciente_id = searchParams.get('paciente_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!paciente_id) {
      return NextResponse.json(
        { error: 'ID de paciente requerido' },
        { status: 400 }
      )
    }

    // Generar clave de caché
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
        peso: validatedData.peso,
        talla: validatedData.talla,
        imc,
        cintura: validatedData.cintura,
        cadera: validatedData.cadera,
        brazo: validatedData.brazo,
        muslo: validatedData.muslo,
        grasa_corporal: validatedData.grasa_corporal,
        presion_sistolica: validatedData.presion_sistolica,
        presion_diastolica: validatedData.presion_diastolica,
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
