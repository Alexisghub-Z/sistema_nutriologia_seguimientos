import prisma from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { deleteCache, deleteCachePattern, CacheKeys } from '@/lib/redis'
import {
  syncCitaWithGoogleCalendar,
  unsyncCitaFromGoogleCalendar,
  isGoogleCalendarConfigured,
} from '@/lib/services/google-calendar'
import {
  programarConfirmacion,
  programarRecordatorio24h,
  programarRecordatorio1h,
  programarMarcarNoAsistio,
  cancelarJobsCita,
} from '@/lib/queue/messages'

export interface CrearCitaInput {
  pacienteId: string
  fechaHora: Date
  duracionMinutos?: number
  motivoConsulta: string
  tipoCita?: 'PRESENCIAL' | 'EN_LINEA'
  confirmadaPorAdmin?: boolean
  /**
   * Notificar al nutriólogo de la nueva cita. Solo cuando la agenda el PACIENTE
   * (IA de WhatsApp, agendado público). El admin NO notifica: él ya sabe que la creó.
   */
  notificarNueva?: boolean
}

export type CrearCitaResultado =
  | { ok: true; cita: Awaited<ReturnType<typeof crearRegistroCita>> }
  | {
      ok: false
      motivo: 'ya_tiene_cita' | 'ocupado' | 'pasada' | 'error'
      mensaje: string
      citaExistente?: { codigo: string | null; fecha: Date }
    }

async function crearRegistroCita(
  input: Required<Pick<CrearCitaInput, 'pacienteId' | 'fechaHora' | 'motivoConsulta'>> &
    Pick<CrearCitaInput, 'duracionMinutos' | 'tipoCita' | 'confirmadaPorAdmin'>,
  codigoCita: string
) {
  return prisma.cita.create({
    data: {
      paciente_id: input.pacienteId,
      fecha_hora: input.fechaHora,
      duracion_minutos: input.duracionMinutos ?? 60,
      motivo_consulta: input.motivoConsulta,
      tipo_cita: input.tipoCita ?? 'PRESENCIAL',
      estado: 'PENDIENTE',
      codigo_cita: codigoCita,
      confirmada_por_paciente: input.confirmadaPorAdmin ?? false,
      estado_confirmacion: input.confirmadaPorAdmin ? 'CONFIRMADA' : 'PENDIENTE',
      fecha_confirmacion: input.confirmadaPorAdmin ? new Date() : null,
    },
    include: {
      paciente: {
        select: { id: true, nombre: true, email: true, telefono: true },
      },
    },
  })
}

/**
 * Crea una cita para un paciente, encapsulando toda la lógica de negocio:
 * validación de cita activa única, disponibilidad de horario, generación de
 * código, cancelación de recordatorios/seguimientos antiguos, sincronización
 * con Google Calendar y programación de mensajes automáticos.
 *
 * Reutilizable tanto por el endpoint autenticado POST /api/citas como por el
 * agendamiento automático de la IA en WhatsApp.
 */
export async function crearCitaParaPaciente(input: CrearCitaInput): Promise<CrearCitaResultado> {
  const { pacienteId, fechaHora, duracionMinutos = 60, confirmadaPorAdmin = false } = input

  try {
    // No permitir citas en el pasado
    if (fechaHora < new Date()) {
      return { ok: false, motivo: 'pasada', mensaje: 'No se pueden agendar citas en el pasado' }
    }

    // Solo una cita activa (PENDIENTE y futura) por paciente
    const citaActiva = await prisma.cita.findFirst({
      where: {
        paciente_id: pacienteId,
        estado: 'PENDIENTE',
        fecha_hora: { gte: new Date() },
      },
      select: { id: true, codigo_cita: true, fecha_hora: true },
    })

    if (citaActiva) {
      return {
        ok: false,
        motivo: 'ya_tiene_cita',
        mensaje: 'El paciente ya tiene una cita pendiente',
        citaExistente: { codigo: citaActiva.codigo_cita, fecha: citaActiva.fecha_hora },
      }
    }

    // Validar disponibilidad del horario
    const config = await prisma.configuracionGeneral.findFirst()
    if (config) {
      const inicioDia = new Date(fechaHora)
      inicioDia.setHours(0, 0, 0, 0)
      const finDia = new Date(fechaHora)
      finDia.setHours(23, 59, 59, 999)

      const citasExistentes = await prisma.cita.findMany({
        where: {
          fecha_hora: { gte: inicioDia, lte: finDia },
          estado: { not: 'CANCELADA' },
        },
        select: { fecha_hora: true, duracion_minutos: true },
      })

      const finCitaNueva = new Date(fechaHora.getTime() + duracionMinutos * 60000)

      const hayConflicto = citasExistentes.some((cita) => {
        const inicioCita = new Date(cita.fecha_hora)
        const finCita = new Date(inicioCita.getTime() + cita.duracion_minutos * 60000)
        return (
          (fechaHora >= inicioCita && fechaHora < finCita) ||
          (finCitaNueva > inicioCita && finCitaNueva <= finCita) ||
          (fechaHora <= inicioCita && finCitaNueva >= finCita)
        )
      })

      if (hayConflicto && citasExistentes.length >= config.citas_simultaneas_max) {
        return {
          ok: false,
          motivo: 'ocupado',
          mensaje: 'Este horario ya no está disponible. Por favor, elige otro.',
        }
      }
    }

    // Generar código único
    let codigoCita = randomBytes(4).toString('hex').toUpperCase().substring(0, 8)
    while (await prisma.cita.findUnique({ where: { codigo_cita: codigoCita } })) {
      codigoCita = randomBytes(4).toString('hex').toUpperCase().substring(0, 8)
    }

    const cita = await crearRegistroCita(
      {
        pacienteId,
        fechaHora,
        motivoConsulta: input.motivoConsulta,
        duracionMinutos,
        tipoCita: input.tipoCita,
        confirmadaPorAdmin,
      },
      codigoCita
    )

    // Invalidar caché del paciente
    await deleteCache(CacheKeys.patientDetail(pacienteId))

    // Cancelar recordatorios antiguos de otras citas del mismo paciente
    try {
      const { mensajesQueue } = await import('@/lib/queue/messages')
      const jobs = await mensajesQueue.getJobs(['waiting', 'delayed'])
      for (const job of jobs) {
        if (job.data.citaId && job.data.citaId !== cita.id) {
          const citaDelJob = await prisma.cita.findUnique({
            where: { id: job.data.citaId },
            select: { paciente_id: true },
          })
          if (citaDelJob && citaDelJob.paciente_id === pacienteId) {
            await job.remove()
          }
        }
      }
    } catch (recordatoriosError) {
      console.error('Error al cancelar recordatorios antiguos:', recordatoriosError)
    }

    // Cancelar seguimientos de próxima cita sugerida cercana (±3 días)
    try {
      const inicioPeriodo = new Date(fechaHora)
      inicioPeriodo.setDate(inicioPeriodo.getDate() - 3)
      const finPeriodo = new Date(fechaHora)
      finPeriodo.setDate(finPeriodo.getDate() + 3)

      const consultasConSeguimiento = await prisma.consulta.findMany({
        where: {
          paciente_id: pacienteId,
          seguimiento_programado: true,
          proxima_cita: { gte: inicioPeriodo, lte: finPeriodo },
        },
      })

      if (consultasConSeguimiento.length > 0) {
        const { mensajesQueue } = await import('@/lib/queue/messages')
        const jobs = await mensajesQueue.getJobs(['waiting', 'delayed'])
        for (const consulta of consultasConSeguimiento) {
          for (const job of jobs) {
            if (job.data.consultaId === consulta.id) {
              await job.remove()
            }
          }
          await prisma.consulta.update({
            where: { id: consulta.id },
            data: { seguimiento_programado: false },
          })
        }
      }
    } catch (seguimientoError) {
      console.error('Error al cancelar seguimientos:', seguimientoError)
    }

    // Sincronizar con Google Calendar
    try {
      if (await isGoogleCalendarConfigured()) {
        await syncCitaWithGoogleCalendar(cita.id)
      }
    } catch (calendarError) {
      console.error('Error al sincronizar con Google Calendar:', calendarError)
    }

    // Programar mensajes automáticos
    try {
      if (config?.confirmacion_automatica_activa && !confirmadaPorAdmin) {
        await programarConfirmacion(cita.id)
      }
      if (config?.recordatorio_24h_activo) {
        await programarRecordatorio24h(cita.id, fechaHora)
      }
      if (config?.recordatorio_1h_activo) {
        await programarRecordatorio1h(cita.id, fechaHora)
      }
      await programarMarcarNoAsistio(cita.id, fechaHora)
    } catch (queueError) {
      console.error('Error al programar mensajes:', queueError)
    }

    // Cancelar recordatorios de "agendar" pendientes (el paciente ya agendó)
    try {
      const { cancelarRecordatoriosAgendar } = await import('@/lib/queue/messages')
      await cancelarRecordatoriosAgendar(pacienteId, fechaHora)
    } catch (cancelError) {
      console.error('Error al cancelar recordatorios de agendar:', cancelError)
    }

    // Notificar al nutriólogo SOLO si la cita la agendó el paciente (no el admin).
    if (input.notificarNueva) {
      try {
        const { notificarNuevaCita } = await import('@/lib/services/notificaciones')
        await notificarNuevaCita({
          id: cita.id,
          codigo_cita: cita.codigo_cita,
          fecha_hora: cita.fecha_hora,
          tipo_cita: cita.tipo_cita,
          motivo_consulta: cita.motivo_consulta,
          paciente: {
            nombre: cita.paciente.nombre,
            telefono: cita.paciente.telefono,
            email: cita.paciente.email,
          },
        })
      } catch (notifError) {
        console.error('Error al notificar nueva cita:', notifError)
      }
    }

    return { ok: true, cita }
  } catch (error) {
    console.error('Error al crear cita (servicio):', error)
    return {
      ok: false,
      motivo: 'error',
      mensaje: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

export type CancelarCitaResultado =
  | { ok: true; cita: { id: string; codigo_cita: string | null; fecha_hora: Date } }
  | { ok: false; motivo: 'no_encontrada' | 'ya_cancelada' | 'error'; mensaje: string }

/**
 * Cancela la cita de un paciente encapsulando toda la lógica de negocio:
 * marca CANCELADA/CANCELADA_PACIENTE, cancela los jobs de mensajería, elimina
 * el evento de Google Calendar, invalida caché y notifica al nutriólogo.
 *
 * Reutilizable por el endpoint público /api/citas/codigo/[codigo] y por la
 * cancelación automática de la IA en WhatsApp.
 */
export async function cancelarCitaParaPaciente(where: {
  citaId?: string
  codigo?: string
}): Promise<CancelarCitaResultado> {
  try {
    const cita = await prisma.cita.findFirst({
      where: where.citaId ? { id: where.citaId } : { codigo_cita: where.codigo },
      include: {
        paciente: { select: { id: true, nombre: true, telefono: true, email: true } },
      },
    })

    if (!cita) {
      return { ok: false, motivo: 'no_encontrada', mensaje: 'No se encontró la cita' }
    }
    if (cita.estado === 'CANCELADA') {
      return { ok: false, motivo: 'ya_cancelada', mensaje: 'La cita ya estaba cancelada' }
    }

    await prisma.cita.update({
      where: { id: cita.id },
      data: { estado: 'CANCELADA', estado_confirmacion: 'CANCELADA_PACIENTE' },
    })

    // Cancelar jobs de mensajería pendientes
    try {
      await cancelarJobsCita(cita.id)
    } catch (jobError) {
      console.error('Error al cancelar jobs de la cita cancelada:', jobError)
    }

    // Eliminar evento de Google Calendar si existe
    try {
      if (cita.google_event_id && (await isGoogleCalendarConfigured())) {
        await unsyncCitaFromGoogleCalendar(cita.id)
      }
    } catch (calendarError) {
      console.error('Error al eliminar evento de Google Calendar:', calendarError)
    }

    // Invalidar caché
    await deleteCache(CacheKeys.patientDetail(cita.paciente.id))
    await deleteCachePattern('patients:list:*')

    // Notificar al nutriólogo
    try {
      const { notificarCancelacion } = await import('@/lib/services/notificaciones')
      await notificarCancelacion({
        id: cita.id,
        codigo_cita: cita.codigo_cita,
        fecha_hora: cita.fecha_hora,
        tipo_cita: cita.tipo_cita,
        motivo_consulta: cita.motivo_consulta,
        paciente: {
          nombre: cita.paciente.nombre,
          telefono: cita.paciente.telefono,
          email: cita.paciente.email,
        },
      })
    } catch (notifError) {
      console.error('Error al notificar cancelación:', notifError)
    }

    return {
      ok: true,
      cita: { id: cita.id, codigo_cita: cita.codigo_cita, fecha_hora: cita.fecha_hora },
    }
  } catch (error) {
    console.error('Error al cancelar cita (servicio):', error)
    return {
      ok: false,
      motivo: 'error',
      mensaje: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
