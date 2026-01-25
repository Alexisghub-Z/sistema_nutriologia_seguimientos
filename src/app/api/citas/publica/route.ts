import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import {
  programarConfirmacion,
  programarRecordatorio24h,
  programarRecordatorio1h,
  programarMarcarNoAsistio,
} from '@/lib/queue/messages'
import {
  syncCitaWithGoogleCalendar,
  isGoogleCalendarConfigured,
} from '@/lib/services/google-calendar'
import { normalizarTelefonoMexico } from '@/lib/utils/phone'
import { deleteCache, CacheKeys } from '@/lib/redis'

// Schema de validación para crear cita pública
const citaPublicaSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z
    .string()
    .regex(/^\d{10}$/, 'El teléfono debe tener exactamente 10 dígitos')
    .transform((val) => normalizarTelefonoMexico(val)),
  fecha_nacimiento: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime()) && parsed < new Date()
  }, 'Fecha de nacimiento inválida'),
  fecha_cita: z.string(), // YYYY-MM-DD
  hora_cita: z
    .string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:mm)'),
  motivo: z.string().min(10, 'Describe el motivo de tu consulta (mínimo 10 caracteres)'),
  tipo_cita: z.enum(['PRESENCIAL', 'EN_LINEA']).optional().default('PRESENCIAL'),
})

function generarCodigo(): string {
  return randomBytes(4).toString('hex').toUpperCase().substring(0, 8)
}

/**
 * POST /api/citas/publica
 * Crear cita desde el portal público (sin autenticación)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = citaPublicaSchema.parse(body)

    // Combinar fecha y hora
    const [year, month, day] = validatedData.fecha_cita.split('-').map(Number)
    const [hour, minute] = validatedData.hora_cita.split(':').map(Number)
    const fechaHoraCita = new Date(year!, month! - 1, day!, hour!, minute!)

    // Validar que la fecha/hora no sea pasada
    if (fechaHoraCita < new Date()) {
      return NextResponse.json(
        { error: 'No se pueden agendar citas en el pasado' },
        { status: 400 }
      )
    }

    // Obtener configuración
    const config = await prisma.configuracionGeneral.findFirst()
    if (!config) {
      return NextResponse.json(
        { error: 'Configuración del sistema no encontrada' },
        { status: 500 }
      )
    }

    // Validar que el horario esté disponible
    const inicioDia = new Date(year!, month! - 1, day!, 0, 0, 0)
    const finDia = new Date(year!, month! - 1, day!, 23, 59, 59)

    const citasExistentes = await prisma.cita.findMany({
      where: {
        fecha_hora: {
          gte: inicioDia,
          lte: finDia,
        },
        estado: { not: 'CANCELADA' },
      },
      select: {
        fecha_hora: true,
        duracion_minutos: true,
      },
    })

    // Verificar solapamiento
    const finCitaNueva = new Date(fechaHoraCita.getTime() + config.duracion_cita_default * 60000)

    const hayConflicto = citasExistentes.some((cita) => {
      const inicioCita = new Date(cita.fecha_hora)
      const finCita = new Date(inicioCita.getTime() + cita.duracion_minutos * 60000)

      return (
        (fechaHoraCita >= inicioCita && fechaHoraCita < finCita) ||
        (finCitaNueva > inicioCita && finCitaNueva <= finCita) ||
        (fechaHoraCita <= inicioCita && finCitaNueva >= finCita)
      )
    })

    if (hayConflicto && citasExistentes.length >= config.citas_simultaneas_max) {
      return NextResponse.json(
        { error: 'Este horario ya no está disponible. Por favor, elige otro.' },
        { status: 409 }
      )
    }

    // Buscar o crear paciente
    let paciente = await prisma.paciente.findUnique({
      where: { email: validatedData.email },
    })

    if (paciente) {
      // Verificar si el paciente ya tiene una cita activa (PENDIENTE y futura)
      const citaActiva = await prisma.cita.findFirst({
        where: {
          paciente_id: paciente.id,
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
            error: 'Ya tienes una cita pendiente',
            mensaje:
              'Solo puedes tener una cita activa a la vez. Puedes cancelar o reagendar tu cita actual.',
            cita_existente: {
              codigo: citaActiva.codigo_cita,
              fecha: citaActiva.fecha_hora,
              motivo: citaActiva.motivo_consulta,
            },
          },
          { status: 409 }
        )
      }

      // Paciente ya existe, verificar si hay cambios

      // Verificar si el teléfono cambió y si está en uso por otro paciente
      if (paciente.telefono !== validatedData.telefono) {
        const telefonoEnUso = await prisma.paciente.findUnique({
          where: { telefono: validatedData.telefono },
        })
        if (telefonoEnUso && telefonoEnUso.id !== paciente.id) {
          return NextResponse.json(
            { error: 'Este teléfono ya está registrado con otra cuenta' },
            { status: 400 }
          )
        }
      }

      // Actualizar datos del paciente si hay cambios
      const datosActualizados: any = {}

      if (paciente.nombre !== validatedData.nombre) {
        datosActualizados.nombre = validatedData.nombre
      }

      if (paciente.telefono !== validatedData.telefono) {
        datosActualizados.telefono = validatedData.telefono
      }

      const fechaNacimientoNueva = new Date(validatedData.fecha_nacimiento)
      const fechaNacimientoActual = new Date(paciente.fecha_nacimiento)
      if (fechaNacimientoNueva.getTime() !== fechaNacimientoActual.getTime()) {
        datosActualizados.fecha_nacimiento = fechaNacimientoNueva
      }

      // Si hay cambios, actualizar paciente
      if (Object.keys(datosActualizados).length > 0) {
        paciente = await prisma.paciente.update({
          where: { id: paciente.id },
          data: datosActualizados,
        })
        console.log(
          `✏️  Datos del paciente actualizados: ${paciente.id}`,
          Object.keys(datosActualizados)
        )
      }
    } else {
      // Verificar que el teléfono no esté en uso
      const telefonoExiste = await prisma.paciente.findUnique({
        where: { telefono: validatedData.telefono },
      })

      if (telefonoExiste) {
        return NextResponse.json(
          {
            error: 'Este teléfono ya está registrado. Si ya tienes una cuenta, usa el mismo email.',
          },
          { status: 400 }
        )
      }

      // Crear nuevo paciente
      paciente = await prisma.paciente.create({
        data: {
          nombre: validatedData.nombre,
          email: validatedData.email,
          telefono: validatedData.telefono,
          fecha_nacimiento: new Date(validatedData.fecha_nacimiento),
        },
      })
    }

    // Generar código único
    let codigoCita = generarCodigo()
    let intentos = 0
    while (await prisma.cita.findUnique({ where: { codigo_cita: codigoCita } })) {
      codigoCita = generarCodigo()
      intentos++
      if (intentos > 10) {
        throw new Error('No se pudo generar un código único')
      }
    }

    // Crear la cita
    const cita = await prisma.cita.create({
      data: {
        paciente_id: paciente.id,
        fecha_hora: fechaHoraCita,
        duracion_minutos: config.duracion_cita_default,
        motivo_consulta: validatedData.motivo,
        tipo_cita: validatedData.tipo_cita,
        codigo_cita: codigoCita,
        estado: 'PENDIENTE',
        estado_confirmacion: 'PENDIENTE',
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
    await deleteCache(CacheKeys.patientDetail(paciente.id))
    console.log('🗑️  Cache invalidated: patient detail after public appointment created', paciente.id)

    // Programar mensajes automáticos
    try {
      if (config.confirmacion_automatica_activa) {
        await programarConfirmacion(cita.id)
      }
      if (config.recordatorio_24h_activo) {
        await programarRecordatorio24h(cita.id, fechaHoraCita)
      }
      if (config.recordatorio_1h_activo) {
        await programarRecordatorio1h(cita.id, fechaHoraCita)
      }

      // Programar auto-marcar como NO_ASISTIO 2h después de la cita
      await programarMarcarNoAsistio(cita.id, fechaHoraCita)
    } catch (queueError) {
      console.error('Error al programar mensajes:', queueError)
      // No fallar la creación de la cita si hay error en los jobs
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

    // Cancelar recordatorios de agendar si el paciente ya agendó
    try {
      const { cancelarRecordatoriosAgendar } = await import('@/lib/queue/messages')
      await cancelarRecordatoriosAgendar(cita.paciente_id, fechaHoraCita)
      console.log('🗑️  Recordatorios de agendar cancelados (paciente agendó cita)')
    } catch (cancelError) {
      console.error('Error al cancelar recordatorios:', cancelError)
      // No fallar la creación de la cita si hay error al cancelar
    }

    console.log(`✅ Cita creada desde portal público: ${cita.id} (${codigoCita})`)

    return NextResponse.json(
      {
        cita: {
          id: cita.id,
          codigo_cita: cita.codigo_cita,
          fecha_hora: cita.fecha_hora,
          paciente: cita.paciente,
        },
        mensaje: 'Cita agendada exitosamente',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error al crear cita pública:', error)
    return NextResponse.json({ error: 'Error al crear la cita' }, { status: 500 })
  }
}
