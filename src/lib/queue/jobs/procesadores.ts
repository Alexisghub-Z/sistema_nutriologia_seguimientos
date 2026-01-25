import prisma from '@/lib/prisma'
import { sendWhatsAppMessage } from '@/lib/services/twilio'
import { generarMensaje, TipoPlantilla, VariablesPlantilla } from '@/lib/utils/plantillas'

/**
 * Procesa el env�o de confirmaci�n de cita
 */
export async function procesarConfirmacion(citaId: string): Promise<void> {
  console.log(`[Job] Procesando confirmaci�n para cita: ${citaId}`)

  try {
    // Buscar la cita con datos del paciente
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
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

    if (!cita) {
      throw new Error(`Cita ${citaId} no encontrada`)
    }

    if (cita.estado === 'CANCELADA') {
      console.log(`[Job] Cita ${citaId} est� cancelada, no se env�a confirmaci�n`)
      return
    }

    // Extraer hora de la fecha
    const fechaCita = new Date(cita.fecha_hora)
    const hora = fechaCita.toTimeString().substring(0, 5) // HH:mm

    // Preparar variables
    const variables: VariablesPlantilla = {
      nombre: cita.paciente.nombre,
      email: cita.paciente.email || undefined,
      telefono: cita.paciente.telefono,
      fecha_cita: fechaCita,
      hora_cita: hora,
      codigo_cita: cita.codigo_cita || undefined,
      motivo: cita.motivo_consulta || undefined,
    }

    // Generar mensaje (sandbox o producci�n)
    const mensaje = await generarMensaje(TipoPlantilla.CONFIRMACION, variables)

    // Enviar mensaje
    let messageSid: string
    if (mensaje.modo === 'sandbox') {
      const resultado = await sendWhatsAppMessage(cita.paciente.telefono, mensaje.contenido!)
      messageSid = resultado.messageSid
    } else {
      // Para producci�n con plantillas aprobadas
      const resultado = await sendWhatsAppMessage(
        cita.paciente.telefono,
        '',
        mensaje.contentSid,
        mensaje.contentVariables
      )
      messageSid = resultado.messageSid
    }

    // Guardar registro del mensaje
    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: cita.paciente.id,
        direccion: 'SALIENTE',
        contenido: mensaje.contenido || `Confirmaci�n enviada (Template: ${mensaje.contentSid})`,
        tipo: 'AUTOMATICO_CONFIRMACION',
        twilio_sid: messageSid,
        estado: 'ENVIADO',
      },
    })

    console.log(` [Job] Confirmaci�n enviada para cita: ${citaId}`)
  } catch (error) {
    console.error(`L [Job] Error al procesar confirmaci�n:`, error)
    throw error // Re-lanzar para que Bull lo marque como fallido y reintente
  }
}

/**
 * Procesa el env�o de recordatorio 24 horas antes
 */
export async function procesarRecordatorio24h(citaId: string): Promise<void> {
  console.log(`[Job] Procesando recordatorio 24h para cita: ${citaId}`)

  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
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

    if (!cita) {
      throw new Error(`Cita ${citaId} no encontrada`)
    }

    if (cita.estado === 'CANCELADA') {
      console.log(`[Job] Cita ${citaId} est� cancelada, no se env�a recordatorio`)
      return
    }

    const fechaCita = new Date(cita.fecha_hora)
    const hora = fechaCita.toTimeString().substring(0, 5)

    const variables: VariablesPlantilla = {
      nombre: cita.paciente.nombre,
      email: cita.paciente.email || undefined,
      telefono: cita.paciente.telefono,
      fecha_cita: fechaCita,
      hora_cita: hora,
      codigo_cita: cita.codigo_cita || undefined,
      motivo: cita.motivo_consulta || undefined,
    }

    const mensaje = await generarMensaje(TipoPlantilla.RECORDATORIO_24H, variables)

    let messageSid: string
    if (mensaje.modo === 'sandbox') {
      const resultado = await sendWhatsAppMessage(cita.paciente.telefono, mensaje.contenido!)
      messageSid = resultado.messageSid
    } else {
      const resultado = await sendWhatsAppMessage(
        cita.paciente.telefono,
        '',
        mensaje.contentSid,
        mensaje.contentVariables
      )
      messageSid = resultado.messageSid
    }

    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: cita.paciente.id,
        direccion: 'SALIENTE',
        contenido:
          mensaje.contenido || `Recordatorio 24h enviado (Template: ${mensaje.contentSid})`,
        tipo: 'AUTOMATICO_RECORDATORIO',
        twilio_sid: messageSid,
        estado: 'ENVIADO',
      },
    })

    console.log(` [Job] Recordatorio 24h enviado para cita: ${citaId}`)
  } catch (error) {
    console.error(`L [Job] Error al procesar recordatorio 24h:`, error)
    throw error
  }
}

/**
 * Procesa el env�o de recordatorio 1 hora antes
 */
export async function procesarRecordatorio1h(citaId: string): Promise<void> {
  console.log(`[Job] Procesando recordatorio 1h para cita: ${citaId}`)

  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
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

    if (!cita) {
      throw new Error(`Cita ${citaId} no encontrada`)
    }

    if (cita.estado === 'CANCELADA') {
      console.log(`[Job] Cita ${citaId} est� cancelada, no se env�a recordatorio`)
      return
    }

    const fechaCita = new Date(cita.fecha_hora)
    const hora = fechaCita.toTimeString().substring(0, 5)

    const variables: VariablesPlantilla = {
      nombre: cita.paciente.nombre,
      email: cita.paciente.email || undefined,
      telefono: cita.paciente.telefono,
      fecha_cita: fechaCita,
      hora_cita: hora,
      codigo_cita: cita.codigo_cita || undefined,
      motivo: cita.motivo_consulta || undefined,
    }

    const mensaje = await generarMensaje(TipoPlantilla.RECORDATORIO_1H, variables)

    let messageSid: string
    if (mensaje.modo === 'sandbox') {
      const resultado = await sendWhatsAppMessage(cita.paciente.telefono, mensaje.contenido!)
      messageSid = resultado.messageSid
    } else {
      const resultado = await sendWhatsAppMessage(
        cita.paciente.telefono,
        '',
        mensaje.contentSid,
        mensaje.contentVariables
      )
      messageSid = resultado.messageSid
    }

    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: cita.paciente.id,
        direccion: 'SALIENTE',
        contenido: mensaje.contenido || `Recordatorio 1h enviado (Template: ${mensaje.contentSid})`,
        tipo: 'AUTOMATICO_RECORDATORIO',
        twilio_sid: messageSid,
        estado: 'ENVIADO',
      },
    })

    console.log(` [Job] Recordatorio 1h enviado para cita: ${citaId}`)
  } catch (error) {
    console.error(`L [Job] Error al procesar recordatorio 1h:`, error)
    throw error
  }
}

/**
 * Procesa el env�o de seguimiento post-consulta
 * Envia recordatorio 1 dia antes de la proxima cita sugerida
 */
export async function procesarSeguimiento(
  consultaId: string,
  tipoSeguimiento: string = 'SOLO_RECORDATORIO'
): Promise<void> {
  console.log(`[Job] Procesando seguimiento para consulta: ${consultaId}`)
  console.log(`[Job] Tipo de seguimiento: ${tipoSeguimiento}`)

  try {
    // Buscar la consulta con datos del paciente y pr�xima cita
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
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

    if (!consulta) {
      throw new Error(`Consulta ${consultaId} no encontrada`)
    }

    if (!consulta.proxima_cita) {
      console.log(`[Job] Consulta ${consultaId} no tiene pr�xima cita sugerida`)
      return
    }

    // Validar que la fecha sugerida no haya pasado
    const fechaSugerida = new Date(consulta.proxima_cita)
    if (fechaSugerida < new Date()) {
      console.log(`[Job] La fecha sugerida para consulta ${consultaId} ya pas�`)
      return
    }

    const fechaFormateada = fechaSugerida.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Obtener configuración para URL del portal
    const config = await prisma.configuracionGeneral.findFirst()
    const urlPortal = config?.url_portal || 'https://portal.example.com'

    // Generar mensaje según el tipo
    let mensajeTexto: string
    switch (tipoSeguimiento) {
      case 'SOLO_SEGUIMIENTO':
        mensajeTexto = `Hola ${consulta.paciente.nombre} 👋

¿Cómo has estado desde tu última consulta?

¿Has tenido alguna duda o dificultad con el plan nutricional que te asigné?

Si necesitas orientación o tienes preguntas, puedes responder este mensaje.

¡Estoy aquí para apoyarte! 💪`
        break

      case 'RECORDATORIO_Y_SEGUIMIENTO':
        mensajeTexto = `Hola ${consulta.paciente.nombre} 👋

¿Cómo has estado? Espero que estés siguiendo bien tu plan nutricional.

Te recordamos que tu próxima cita de seguimiento está sugerida para el ${fechaFormateada}.

Si tienes dudas sobre el plan o necesitas algo, responde este mensaje.

Si aún no has agendado tu cita, puedes hacerlo aquí:
${urlPortal}

¡Te esperamos! 🥗`
        break

      case 'SOLO_RECORDATORIO':
      default:
        mensajeTexto = `Hola ${consulta.paciente.nombre} 👋

Te recordamos que tu próxima cita de seguimiento nutricional está sugerida para el ${fechaFormateada}.

Si aún no has agendado tu cita, puedes hacerlo aquí:
${urlPortal}

¡Te esperamos! 🥗`
        break
    }

    // Enviar mensaje directamente
    const resultado = await sendWhatsAppMessage(consulta.paciente.telefono, mensajeTexto)
    const messageSid = resultado.messageSid

    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: consulta.paciente.id,
        direccion: 'SALIENTE',
        contenido: mensajeTexto,
        tipo: 'AUTOMATICO_SEGUIMIENTO',
        twilio_sid: messageSid,
        estado: 'ENVIADO',
      },
    })

    console.log(
      `✅ [Job] Seguimiento enviado para consulta: ${consultaId} (Tipo: ${tipoSeguimiento})`
    )
  } catch (error) {
    console.error(`L [Job] Error al procesar seguimiento:`, error)
    throw error
  }
}

/**
 * Procesa el envío de seguimiento inicial (3-5 días después de la consulta)
 */
export async function procesarSeguimientoInicial(consultaId: string): Promise<void> {
  console.log(`[Job] Procesando seguimiento inicial para consulta: ${consultaId}`)

  try {
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
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

    if (!consulta) {
      throw new Error(`Consulta ${consultaId} no encontrada`)
    }

    // Verificar que el seguimiento siga activo
    if (!consulta.seguimiento_programado) {
      console.log(`[Job] El seguimiento para consulta ${consultaId} fue cancelado`)
      return
    }

    // Preparar variables
    const variables: VariablesPlantilla = {
      nombre: consulta.paciente.nombre,
      email: consulta.paciente.email || undefined,
      telefono: consulta.paciente.telefono,
      fecha_cita: consulta.proxima_cita || new Date(),
      hora_cita: '',
      codigo_cita: '',
    }

    // Generar mensaje usando el sistema de plantillas
    const mensaje = await generarMensaje(TipoPlantilla.SEGUIMIENTO_INICIAL, variables)

    // Enviar mensaje
    const resultado = await sendWhatsAppMessage(
      consulta.paciente.telefono,
      mensaje.contenido || '',
      mensaje.contentSid,
      mensaje.contentVariables
    )

    // Registrar en BD
    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: consulta.paciente.id,
        direccion: 'SALIENTE',
        contenido: mensaje.contenido || `Seguimiento inicial programado`,
        tipo: 'AUTOMATICO_SEGUIMIENTO',
        twilio_sid: resultado.messageSid,
        estado: 'ENVIADO',
      },
    })

    console.log(`✅ [Job] Seguimiento inicial enviado para consulta: ${consultaId}`)
  } catch (error) {
    console.error(`❌ [Job] Error al procesar seguimiento inicial:`, error)
    throw error
  }
}

/**
 * Procesa el envío de seguimiento intermedio (mitad del periodo)
 */
export async function procesarSeguimientoIntermedio(consultaId: string): Promise<void> {
  console.log(`[Job] Procesando seguimiento intermedio para consulta: ${consultaId}`)

  try {
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
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

    if (!consulta) {
      throw new Error(`Consulta ${consultaId} no encontrada`)
    }

    if (!consulta.seguimiento_programado) {
      console.log(`[Job] El seguimiento para consulta ${consultaId} fue cancelado`)
      return
    }

    const variables: VariablesPlantilla = {
      nombre: consulta.paciente.nombre,
      email: consulta.paciente.email || undefined,
      telefono: consulta.paciente.telefono,
      fecha_cita: consulta.proxima_cita || new Date(),
      hora_cita: '',
      codigo_cita: '',
    }

    const mensaje = await generarMensaje(TipoPlantilla.SEGUIMIENTO_INTERMEDIO, variables)

    const resultado = await sendWhatsAppMessage(
      consulta.paciente.telefono,
      mensaje.contenido || '',
      mensaje.contentSid,
      mensaje.contentVariables
    )

    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: consulta.paciente.id,
        direccion: 'SALIENTE',
        contenido: mensaje.contenido || `Seguimiento intermedio programado`,
        tipo: 'AUTOMATICO_SEGUIMIENTO',
        twilio_sid: resultado.messageSid,
        estado: 'ENVIADO',
      },
    })

    console.log(`✅ [Job] Seguimiento intermedio enviado para consulta: ${consultaId}`)
  } catch (error) {
    console.error(`❌ [Job] Error al procesar seguimiento intermedio:`, error)
    throw error
  }
}

/**
 * Procesa el envío de seguimiento previo a la cita (7-10 días antes)
 */
export async function procesarSeguimientoPrevioCita(consultaId: string): Promise<void> {
  console.log(`[Job] Procesando seguimiento previo cita para consulta: ${consultaId}`)

  try {
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
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

    if (!consulta) {
      throw new Error(`Consulta ${consultaId} no encontrada`)
    }

    if (!consulta.seguimiento_programado) {
      console.log(`[Job] El seguimiento para consulta ${consultaId} fue cancelado`)
      return
    }

    const variables: VariablesPlantilla = {
      nombre: consulta.paciente.nombre,
      email: consulta.paciente.email || undefined,
      telefono: consulta.paciente.telefono,
      fecha_cita: consulta.proxima_cita || new Date(),
      hora_cita: '',
      codigo_cita: '',
    }

    const mensaje = await generarMensaje(TipoPlantilla.SEGUIMIENTO_PREVIO_CITA, variables)

    const resultado = await sendWhatsAppMessage(
      consulta.paciente.telefono,
      mensaje.contenido || '',
      mensaje.contentSid,
      mensaje.contentVariables
    )

    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: consulta.paciente.id,
        direccion: 'SALIENTE',
        contenido: mensaje.contenido || `Seguimiento previo cita programado`,
        tipo: 'AUTOMATICO_SEGUIMIENTO',
        twilio_sid: resultado.messageSid,
        estado: 'ENVIADO',
      },
    })

    console.log(`✅ [Job] Seguimiento previo cita enviado para consulta: ${consultaId}`)
  } catch (error) {
    console.error(`❌ [Job] Error al procesar seguimiento previo cita:`, error)
    throw error
  }
}

/**
 * Procesa el envío de recordatorio para agendar cita (3-5 días antes)
 */
export async function procesarRecordatorioAgendar(consultaId: string): Promise<void> {
  console.log(`[Job] Procesando recordatorio agendar para consulta: ${consultaId}`)

  try {
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
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

    if (!consulta) {
      throw new Error(`Consulta ${consultaId} no encontrada`)
    }

    if (!consulta.seguimiento_programado) {
      console.log(`[Job] El seguimiento para consulta ${consultaId} fue cancelado`)
      return
    }

    // Verificar si el paciente ya tiene cita agendada cerca de la fecha sugerida
    if (consulta.proxima_cita) {
      const citaExistente = await prisma.cita.findFirst({
        where: {
          paciente_id: consulta.paciente.id,
          estado: { in: ['PENDIENTE', 'COMPLETADA'] },
          fecha_hora: {
            gte: new Date(consulta.proxima_cita.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 días antes
            lte: new Date(consulta.proxima_cita.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 días después
          },
        },
      })

      if (citaExistente) {
        console.log(
          `[Job] ✅ Paciente ya tiene cita agendada (${citaExistente.fecha_hora}), no se envía recordatorio`
        )
        return
      }
    }

    // Obtener URL del portal
    const config = await prisma.configuracionGeneral.findFirst()
    const urlPortal =
      config?.url_portal || process.env.NEXT_PUBLIC_APP_URL || 'https://portal.example.com'

    const variables: VariablesPlantilla = {
      nombre: consulta.paciente.nombre,
      email: consulta.paciente.email || undefined,
      telefono: consulta.paciente.telefono,
      fecha_cita: consulta.proxima_cita || new Date(),
      hora_cita: '',
      codigo_cita: '',
      url_portal: urlPortal,
    }

    const mensaje = await generarMensaje(TipoPlantilla.RECORDATORIO_AGENDAR, variables)

    const resultado = await sendWhatsAppMessage(
      consulta.paciente.telefono,
      mensaje.contenido || '',
      mensaje.contentSid,
      mensaje.contentVariables
    )

    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: consulta.paciente.id,
        direccion: 'SALIENTE',
        contenido: mensaje.contenido || `Recordatorio agendar programado`,
        tipo: 'AUTOMATICO_RECORDATORIO',
        twilio_sid: resultado.messageSid,
        estado: 'ENVIADO',
      },
    })

    console.log(`✅ [Job] Recordatorio agendar enviado para consulta: ${consultaId}`)
  } catch (error) {
    console.error(`❌ [Job] Error al procesar recordatorio agendar:`, error)
    throw error
  }
}

/**
 * Marca automáticamente una cita como NO_ASISTIO si sigue en estado PENDIENTE
 * Se ejecuta 2 horas después de la hora programada
 */
export async function procesarMarcarNoAsistio(citaId: string): Promise<void> {
  console.log(`[Job] Verificando estado de cita para auto-marcar: ${citaId}`)

  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        paciente: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    })

    if (!cita) {
      console.warn(`⚠️  [Job] Cita ${citaId} no encontrada, posiblemente eliminada`)
      return
    }

    // Solo marcar como NO_ASISTIO si la cita sigue en estado PENDIENTE
    if (cita.estado !== 'PENDIENTE') {
      console.log(
        `ℹ️  [Job] Cita ${citaId} ya tiene estado ${cita.estado}, no se marca como NO_ASISTIO`
      )
      return
    }

    // Actualizar estado a NO_ASISTIO
    await prisma.cita.update({
      where: { id: citaId },
      data: {
        estado: 'NO_ASISTIO',
      },
    })

    console.log(
      `✅ [Job] Cita ${citaId} marcada automáticamente como NO_ASISTIO (Paciente: ${cita.paciente.nombre})`
    )

    // Invalidar caché del paciente
    const { deleteCache, CacheKeys } = await import('@/lib/redis')
    await deleteCache(CacheKeys.patientDetail(cita.paciente_id))
    console.log(`🗑️  [Job] Cache invalidado para paciente ${cita.paciente_id}`)

    // Actualizar en Google Calendar si está configurado
    try {
      const { syncCitaWithGoogleCalendar, isGoogleCalendarConfigured } = await import(
        '@/lib/services/google-calendar'
      )
      const isConfigured = await isGoogleCalendarConfigured()
      if (isConfigured && cita.google_event_id) {
        await syncCitaWithGoogleCalendar(citaId)
        console.log(`📅 [Job] Cita actualizada en Google Calendar`)
      }
    } catch (calendarError) {
      console.error(`⚠️  [Job] Error al actualizar Google Calendar:`, calendarError)
      // No fallar el job si hay error en Google Calendar
    }
  } catch (error) {
    console.error(`❌ [Job] Error al procesar marcar NO_ASISTIO:`, error)
    throw error
  }
}
