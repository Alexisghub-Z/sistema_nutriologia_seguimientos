import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { deleteCache, CacheKeys } from '@/lib/redis'
import { syncCitaWithGoogleCalendar, isGoogleCalendarConfigured } from '@/lib/services/google-calendar'
import { programarConfirmacion, programarRecordatorio24h, programarRecordatorio1h } from '@/lib/queue/messages'

// Schema de validación para crear cita
const citaSchema = z.object({
  paciente_id: z.string().min(1, 'ID de paciente requerido'),
  fecha_hora: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Fecha y hora inválidas'),
  duracion_minutos: z.number().positive().default(60),
  motivo_consulta: z.string().min(3, 'El motivo debe tener al menos 3 caracteres'),
  confirmada_por_admin: z.boolean().optional().default(false),
})

// GET /api/citas?paciente_id=xxx - Obtener citas de un paciente
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paciente_id = searchParams.get('paciente_id')

    if (!paciente_id) {
      return NextResponse.json(
        { error: 'ID de paciente requerido' },
        { status: 400 }
      )
    }

    const citas = await prisma.cita.findMany({
      where: { paciente_id },
      orderBy: { fecha_hora: 'desc' },
      include: {
        consulta: {
          select: {
            id: true,
            peso: true,
            imc: true,
          },
        },
      },
    })

    return NextResponse.json({ citas })
  } catch (error) {
    console.error('Error al obtener citas:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener citas', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/citas - Crear nueva cita
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = citaSchema.parse(body)

    // Verificar si el paciente ya tiene una cita activa (PENDIENTE y futura)
    const citaActiva = await prisma.cita.findFirst({
      where: {
        paciente_id: validatedData.paciente_id,
        estado: 'PENDIENTE',
        fecha_hora: {
          gte: new Date(), // Solo citas futuras
        },
      },
      select: {
        id: true,
        codigo_cita: true,
        fecha_hora: true,
        motivo_consulta: true,
      },
    })

    if (citaActiva) {
      return NextResponse.json(
        {
          error: 'El paciente ya tiene una cita pendiente',
          mensaje:
            'Solo se permite una cita activa por paciente. Cancela o completa la cita actual antes de crear una nueva.',
          cita_existente: {
            codigo: citaActiva.codigo_cita,
            fecha: citaActiva.fecha_hora,
            motivo: citaActiva.motivo_consulta,
          },
        },
        { status: 409 }
      )
    }

    // Crear cita
    const cita = await prisma.cita.create({
      data: {
        paciente_id: validatedData.paciente_id,
        fecha_hora: new Date(validatedData.fecha_hora),
        duracion_minutos: validatedData.duracion_minutos,
        motivo_consulta: validatedData.motivo_consulta,
        estado: 'PENDIENTE',
        // Si fue confirmada por admin, marcarla como confirmada desde el inicio
        confirmada_por_paciente: validatedData.confirmada_por_admin,
        estado_confirmacion: validatedData.confirmada_por_admin ? 'CONFIRMADA' : 'PENDIENTE',
        fecha_confirmacion: validatedData.confirmada_por_admin ? new Date() : null,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
    })

    // Invalidar caché del paciente
    await deleteCache(CacheKeys.patientDetail(validatedData.paciente_id))
    console.log('🗑️  Cache invalidated: patient detail after appointment created', validatedData.paciente_id)

    // Sincronizar con Google Calendar si está configurado
    try {
      const isConfigured = await isGoogleCalendarConfigured()
      if (isConfigured) {
        await syncCitaWithGoogleCalendar(cita.id)
        console.log('📅 Cita sincronizada con Google Calendar:', cita.id)
      }
    } catch (calendarError) {
      console.error('Error al sincronizar con Google Calendar:', calendarError)
      // No fallar la creación de la cita si hay error en la sincronización
    }

    // Programar mensajes automáticos
    try {
      const config = await prisma.configuracionGeneral.findFirst()
      const fechaCita = new Date(validatedData.fecha_hora)

      // Solo enviar confirmación automática si NO fue confirmada por admin
      if (config?.confirmacion_automatica_activa && !validatedData.confirmada_por_admin) {
        await programarConfirmacion(cita.id)
        console.log('📧 Mensaje de confirmación programado')
      } else if (validatedData.confirmada_por_admin) {
        console.log('✅ Cita pre-confirmada por admin - no se envía mensaje de confirmación')
      }

      // Los recordatorios se envían siempre (tanto para citas admin como públicas)
      if (config?.recordatorio_24h_activo) {
        await programarRecordatorio24h(cita.id, fechaCita)
      }
      if (config?.recordatorio_1h_activo) {
        await programarRecordatorio1h(cita.id, fechaCita)
      }
    } catch (queueError) {
      console.error('Error al programar mensajes:', queueError)
      // No fallar la creación de la cita si hay error en los jobs
    }

    return NextResponse.json(cita, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear cita:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al crear cita', details: errorMessage },
      { status: 500 }
    )
  }
}
