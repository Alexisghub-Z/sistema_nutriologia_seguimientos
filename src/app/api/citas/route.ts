import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { deleteCache, CacheKeys } from '@/lib/redis'
import {
  syncCitaWithGoogleCalendar,
  isGoogleCalendarConfigured,
} from '@/lib/services/google-calendar'
import {
  programarConfirmacion,
  programarRecordatorio24h,
  programarRecordatorio1h,
  programarMarcarNoAsistio,
} from '@/lib/queue/messages'

// Schema de validación para crear cita
const citaSchema = z.object({
  paciente_id: z.string().min(1, 'ID de paciente requerido'),
  fecha_hora: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Fecha y hora inválidas'),
  duracion_minutos: z.number().positive().default(60),
  motivo_consulta: z.string().min(3, 'El motivo debe tener al menos 3 caracteres'),
  tipo_cita: z.enum(['PRESENCIAL', 'EN_LINEA']).optional().default('PRESENCIAL'),
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
      return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 })
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
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
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
        tipo_cita: validatedData.tipo_cita,
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
    console.log(
      '🗑️  Cache invalidated: patient detail after appointment created',
      validatedData.paciente_id
    )

    // Cancelar TODOS los recordatorios antiguos del paciente (citas anteriores)
    try {
      const { mensajesQueue } = await import('@/lib/queue/messages')
      const jobs = await mensajesQueue.getJobs(['waiting', 'delayed'])

      let recordatoriosCancelados = 0

      // Buscar jobs de recordatorios de OTRAS citas del mismo paciente
      for (const job of jobs) {
        // Jobs de recordatorios tienen citaId
        if (job.data.citaId && job.data.citaId !== cita.id) {
          // Verificar si es del mismo paciente
          const citaDelJob = await prisma.cita.findUnique({
            where: { id: job.data.citaId },
            select: { paciente_id: true },
          })

          if (citaDelJob && citaDelJob.paciente_id === validatedData.paciente_id) {
            await job.remove()
            recordatoriosCancelados++
            console.log(`🗑️  Recordatorio cancelado de cita antigua: ${job.data.citaId}`)
          }
        }
      }

      if (recordatoriosCancelados > 0) {
        console.log(`✅ ${recordatoriosCancelados} recordatorio(s) de citas antiguas cancelados`)
      }
    } catch (recordatoriosError) {
      console.error('Error al cancelar recordatorios antiguos:', recordatoriosError)
      // No fallar la creación de la cita si hay error
    }

    // Cancelar seguimientos programados si la fecha de la cita es cercana a alguna próxima cita sugerida
    try {
      const fechaCita = new Date(validatedData.fecha_hora)

      // Buscar consultas del paciente que tengan próxima cita sugerida cercana (±3 días)
      const inicioPeriodo = new Date(fechaCita)
      inicioPeriodo.setDate(inicioPeriodo.getDate() - 3)

      const finPeriodo = new Date(fechaCita)
      finPeriodo.setDate(finPeriodo.getDate() + 3)

      const consultasConSeguimiento = await prisma.consulta.findMany({
        where: {
          paciente_id: validatedData.paciente_id,
          seguimiento_programado: true,
          proxima_cita: {
            gte: inicioPeriodo,
            lte: finPeriodo,
          },
        },
      })

      if (consultasConSeguimiento.length > 0) {
        // Cancelar jobs de seguimiento
        const { mensajesQueue } = await import('@/lib/queue/messages')
        const jobs = await mensajesQueue.getJobs(['waiting', 'delayed'])

        for (const consulta of consultasConSeguimiento) {
          // Buscar y cancelar jobs de esta consulta
          for (const job of jobs) {
            if (job.data.consultaId === consulta.id) {
              await job.remove()
              console.log(`🗑️  Job de seguimiento cancelado para consulta: ${consulta.id}`)
            }
          }

          // Actualizar flag en BD
          await prisma.consulta.update({
            where: { id: consulta.id },
            data: { seguimiento_programado: false },
          })
        }

        console.log(
          `✅ ${consultasConSeguimiento.length} seguimiento(s) cancelado(s) automáticamente - paciente agendó cita`
        )
      }
    } catch (seguimientoError) {
      console.error('Error al cancelar seguimientos:', seguimientoError)
      // No fallar la creación de la cita si hay error al cancelar seguimientos
    }

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

      // Programar auto-marcar como NO_ASISTIO 2h después de la cita
      await programarMarcarNoAsistio(cita.id, fechaCita)
    } catch (queueError) {
      console.error('Error al programar mensajes:', queueError)
      // No fallar la creación de la cita si hay error en los jobs
    }

    // Cancelar recordatorios de agendar si el paciente ya agendó
    try {
      const { cancelarRecordatoriosAgendar } = await import('@/lib/queue/messages')
      await cancelarRecordatoriosAgendar(
        validatedData.paciente_id,
        new Date(validatedData.fecha_hora)
      )
      console.log('🗑️  Recordatorios de agendar cancelados (paciente agendó cita desde admin)')
    } catch (cancelError) {
      console.error('Error al cancelar recordatorios:', cancelError)
      // No fallar la creación de la cita si hay error al cancelar
    }

    // Enviar notificación por email al nutriólogo (INSTANTÁNEA) - solo si NO fue confirmada por admin
    if (!validatedData.confirmada_por_admin) {
      try {
        const { notificarNuevaCita } = await import('@/lib/services/email-notifications')
        const fechaCita = new Date(validatedData.fecha_hora)
        const horaCita = fechaCita.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        })

        await notificarNuevaCita({
          pacienteNombre: cita.paciente.nombre,
          pacienteEmail: cita.paciente.email,
          pacienteTelefono: cita.paciente.telefono,
          fechaCita: fechaCita,
          horaCita: horaCita,
          motivoConsulta: cita.motivo_consulta,
          tipoCita: cita.tipo_cita,
          codigoCita: cita.codigo_cita || '',
          totalCitas: (await prisma.cita.count({ where: { paciente_id: validatedData.paciente_id } })) || 1,
        })
        console.log('📧 Email de notificación enviado al nutriólogo')
      } catch (emailError) {
        console.error('Error al enviar email de notificación:', emailError)
        // No fallar la creación de la cita si hay error en el email
      }
    }

    return NextResponse.json(cita, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error al crear cita:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al crear cita', details: errorMessage },
      { status: 500 }
    )
  }
}
