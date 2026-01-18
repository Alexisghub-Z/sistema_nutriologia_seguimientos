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
      codigo_cita: cita.codigo_cita,
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
      codigo_cita: cita.codigo_cita,
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
        contenido: mensaje.contenido || `Recordatorio 24h enviado (Template: ${mensaje.contentSid})`,
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
      codigo_cita: cita.codigo_cita,
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
export async function procesarSeguimiento(consultaId: string): Promise<void> {
  console.log(`[Job] Procesando seguimiento para consulta: ${consultaId}`)

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

    const hora = fechaSugerida.toTimeString().substring(0, 5)

    // Preparar variables para la plantilla
    const variables: VariablesPlantilla = {
      nombre: consulta.paciente.nombre,
      email: consulta.paciente.email || undefined,
      telefono: consulta.paciente.telefono,
      fecha_cita: fechaSugerida,
      hora_cita: hora,
      codigo_cita: '', // No hay c�digo porque no es una cita agendada a�n
      motivo: consulta.motivo || 'Seguimiento nutricional',
    }

    // Generar mensaje (sandbox o producci�n)
    const mensaje = await generarMensaje(TipoPlantilla.SEGUIMIENTO, variables)

    // Enviar mensaje
    let messageSid: string
    if (mensaje.modo === 'sandbox') {
      const resultado = await sendWhatsAppMessage(consulta.paciente.telefono, mensaje.contenido!)
      messageSid = resultado.messageSid
    } else {
      const resultado = await sendWhatsAppMessage(
        consulta.paciente.telefono,
        '',
        mensaje.contentSid,
        mensaje.contentVariables
      )
      messageSid = resultado.messageSid
    }

    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: consulta.paciente.id,
        direccion: 'SALIENTE',
        contenido: mensaje.contenido || `Seguimiento enviado (Template: ${mensaje.contentSid})`,
        tipo: 'AUTOMATICO_SEGUIMIENTO',
        twilio_sid: messageSid,
        estado: 'ENVIADO',
      },
    })

    console.log(` [Job] Seguimiento enviado para cita: ${consultaId}`)
  } catch (error) {
    console.error(`L [Job] Error al procesar seguimiento:`, error)
    throw error
  }
}
