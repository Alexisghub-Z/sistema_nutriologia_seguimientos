import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación
const configuracionSchema = z.object({
  // Configuración de mensajería
  recordatorio_24h_activo: z.boolean().optional(),
  recordatorio_1h_activo: z.boolean().optional(),
  seguimiento_activo: z.boolean().optional(),
  seguimiento_dias_despues: z.number().int().min(1).max(30).optional(),
  confirmacion_automatica_activa: z.boolean().optional(),
  url_portal: z.string().url().optional().nullable(),
  nombre_consultorio: z.string().min(1).optional(),

  // Configuración de calendario
  horario_inicio: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  horario_fin: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  horario_sabado_inicio: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  horario_sabado_fin: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .nullable(),
  duracion_cita_default: z.number().int().min(15).max(240).optional(),
  dias_laborales: z.string().optional(),
  dias_anticipacion_max: z.number().int().min(1).max(90).optional(),
  horas_anticipacion_min: z.number().int().min(0).max(72).optional(),
})

// GET /api/configuracion - Obtener configuración general
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar la primera (y única) configuración
    let config = await prisma.configuracionGeneral.findFirst()

    // Si no existe, crearla con defaults
    if (!config) {
      config = await prisma.configuracionGeneral.create({
        data: {
          // Mensajería
          recordatorio_24h_activo: true,
          recordatorio_1h_activo: true,
          seguimiento_activo: true,
          seguimiento_dias_despues: 2,
          confirmacion_automatica_activa: true,
          url_portal: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          nombre_consultorio: 'Consultorio',

          // Calendario
          horario_inicio: '09:00',
          horario_fin: '18:00',
          duracion_cita_default: 60,
          intervalo_entre_citas: 0,
          dias_laborales: '1,2,3,4,5', // Lun-Vie
          citas_simultaneas_max: 1,
          dias_anticipacion_max: 30,
          horas_anticipacion_min: 2,
        },
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

// PUT /api/configuracion - Actualizar configuración general
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = configuracionSchema.parse(body)

    // Buscar configuración existente
    let config = await prisma.configuracionGeneral.findFirst()

    // Agregar valores fijos para campos eliminados de la UI
    const dataWithDefaults = {
      ...validatedData,
      intervalo_entre_citas: 0, // Sin intervalo entre citas
      citas_simultaneas_max: 1, // Solo 1 cita a la vez
    }

    if (!config) {
      // Si no existe, crear con los datos proporcionados
      config = await prisma.configuracionGeneral.create({
        data: {
          ...dataWithDefaults,
          url_portal: validatedData.url_portal || process.env.NEXT_PUBLIC_APP_URL,
          nombre_consultorio: validatedData.nombre_consultorio || 'Consultorio',
        },
      })
    } else {
      // Actualizar configuración existente
      config = await prisma.configuracionGeneral.update({
        where: { id: config.id },
        data: dataWithDefaults,
      })
    }

    console.log('✅ Configuración actualizada:', config.id)
    console.log('📋 Valores guardados:', {
      horario_inicio: config.horario_inicio,
      horario_fin: config.horario_fin,
      horas_anticipacion_min: config.horas_anticipacion_min,
      dias_laborales: config.dias_laborales,
    })

    return NextResponse.json(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error al actualizar configuración:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
