import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { deleteCachePattern, deleteCache, CacheKeys } from '@/lib/redis'

// Schema de validación para consulta histórica (SIN cita_id, SIN programación de mensajes)
const consultaHistoricaSchema = z.object({
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

// POST /api/consultas/historica - Crear consulta histórica (sin cita, sin recordatorios)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = consultaHistoricaSchema.parse(body)

    // Calcular IMC si hay peso y talla
    let imc: number | undefined
    if (validatedData.peso && validatedData.talla) {
      imc = validatedData.peso / (validatedData.talla * validatedData.talla)
      imc = Math.round(imc * 10) / 10 // Redondear a 1 decimal
    }

    // Crear consulta histórica (sin cita_id)
    const consulta = await prisma.consulta.create({
      data: {
        // NO incluir cita_id - es null para consultas históricas
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

    console.log('📋 Consulta histórica creada:', consulta.id)

    // ⚠️ NO PROGRAMAR SEGUIMIENTO - es una consulta histórica
    // ⚠️ NO PROGRAMAR RECORDATORIOS - no tiene cita asociada

    // Solo invalidar caché de consultas del paciente y detalle del paciente
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

    console.error('Error al crear consulta histórica:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al crear consulta histórica', details: errorMessage },
      { status: 500 }
    )
  }
}
