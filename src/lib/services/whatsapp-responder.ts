import { obtenerRespuestaIA, isOpenAIConfigured, type PacienteContexto } from './openai-assistant'
import { buscarEnFAQ, requiereDerivacion } from '@/lib/knowledge-base'
import prisma from '@/lib/prisma'
import { horaEnMexico } from '@/lib/utils/proxima-cita'
import { formatearHora } from '@/lib/utils/plantillas'

/**
 * Resultado del procesamiento de un mensaje
 */
export interface ResultadoProcesamiento {
  respuesta: string | null
  debe_responder_automaticamente: boolean
  debe_derivar_humano: boolean
  razon: string
  metadata?: {
    fuente: 'faq' | 'ia' | 'sistema' | 'manual'
    confidence?: number
    tokens_usados?: number
  }
}

/**
 * Procesa un mensaje entrante y decide cómo responder
 */
export async function procesarMensajeEntrante(
  mensajePaciente: string,
  pacienteId: string,
  nombrePaciente: string
): Promise<ResultadoProcesamiento> {
  try {
    console.log('📨 Procesando mensaje entrante:', {
      paciente: nombrePaciente,
      mensaje: mensajePaciente.substring(0, 50) + '...',
    })

    // PASO 1: Verificar si es respuesta a recordatorio de cita
    // (confirmar/cancelar - ya manejado en el webhook)
    const esRespuestaCita = await esRespuestaARecordatorio(mensajePaciente, pacienteId)
    if (esRespuestaCita) {
      return {
        respuesta: null,
        debe_responder_automaticamente: false,
        debe_derivar_humano: false,
        razon: 'Es respuesta a recordatorio de cita (ya manejado por sistema)',
        metadata: {
          fuente: 'sistema',
        },
      }
    }

    // PASO 1.5: Si el paciente tiene una próxima cita SUGERIDA (con hora) y
    // confirma agendar, crear la cita real automáticamente.
    const contextoPaciente = await obtenerContextoPaciente(pacienteId)
    const resultadoAgendar = await intentarAgendarCitaSugerida(
      mensajePaciente,
      pacienteId,
      nombrePaciente,
      contextoPaciente
    )
    if (resultadoAgendar) {
      console.log('📅 Cita sugerida agendada automáticamente por confirmación del paciente')
      return resultadoAgendar
    }

    // PASO 1.6: Cancelación de cita por chat (con doble confirmación vía historial)
    const historialConv = await obtenerHistorialConversacion(pacienteId)
    const resultadoCancelar = await intentarCancelarCita(
      mensajePaciente,
      pacienteId,
      nombrePaciente,
      contextoPaciente,
      historialConv
    )
    if (resultadoCancelar) {
      console.log('🚫 Cancelación de cita procesada por chat')
      return resultadoCancelar
    }

    // PASO 2: Buscar en FAQ (tiene prioridad sobre derivación por palabras clave)
    const respuestaFAQ = buscarEnFAQ(mensajePaciente)
    if (respuestaFAQ) {
      console.log('✅ Respuesta encontrada en FAQ')

      return {
        respuesta: respuestaFAQ,
        debe_responder_automaticamente: true,
        debe_derivar_humano: false,
        razon: 'Encontrada respuesta exacta en FAQ',
        metadata: {
          fuente: 'faq',
          confidence: 1.0,
        },
      }
    }

    // PASO 3: Verificar si contiene palabras que requieren derivación automática
    if (requiereDerivacion(mensajePaciente)) {
      const respuesta = generarMensajeDerivacion(nombrePaciente, mensajePaciente)

      return {
        respuesta,
        debe_responder_automaticamente: true,
        debe_derivar_humano: true,
        razon: 'Detectadas palabras clave nutricionales/médicas - deriva a humano',
        metadata: {
          fuente: 'sistema',
        },
      }
    }

    // PASO 4: Usar IA si está configurada
    if (!isOpenAIConfigured()) {
      console.log('⚠️ IA no configurada, derivando a humano')

      return {
        respuesta: generarMensajeDerivacion(nombrePaciente, mensajePaciente),
        debe_responder_automaticamente: true,
        debe_derivar_humano: true,
        razon: 'IA no configurada',
        metadata: {
          fuente: 'sistema',
        },
      }
    }

    // Reutilizar el contexto y el historial ya obtenidos en los pasos previos
    const contexto = contextoPaciente
    const historial = historialConv

    // Consultar a la IA
    const respuestaIA = await obtenerRespuestaIA(mensajePaciente, contexto, historial)

    // Verificar umbral de confianza
    const umbralConfianza = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || '0.7')

    if (respuestaIA.confidence < umbralConfianza) {
      console.log(`⚠️ Confianza baja (${respuestaIA.confidence}), derivando a humano`)

      return {
        respuesta: generarMensajeDerivacion(nombrePaciente, mensajePaciente),
        debe_responder_automaticamente: true,
        debe_derivar_humano: true,
        razon: `Confianza de IA baja: ${respuestaIA.confidence}`,
        metadata: {
          fuente: 'ia',
          confidence: respuestaIA.confidence,
          tokens_usados: respuestaIA.tokens_usados,
        },
      }
    }

    // Si la IA dice que debe derivar, hacerlo
    if (respuestaIA.debe_derivar_humano) {
      console.log('🔀 IA indica derivar a humano')

      return {
        respuesta: respuestaIA.mensaje,
        debe_responder_automaticamente: true,
        debe_derivar_humano: true,
        razon: respuestaIA.razonamiento || 'IA solicitó derivación',
        metadata: {
          fuente: 'ia',
          confidence: respuestaIA.confidence,
          tokens_usados: respuestaIA.tokens_usados,
        },
      }
    }

    // Respuesta automática de IA
    console.log('🤖 Respuesta automática de IA')

    return {
      respuesta: respuestaIA.mensaje,
      debe_responder_automaticamente: true,
      debe_derivar_humano: false,
      razon: 'Respuesta generada por IA con confianza alta',
      metadata: {
        fuente: 'ia',
        confidence: respuestaIA.confidence,
        tokens_usados: respuestaIA.tokens_usados,
      },
    }
  } catch (error) {
    console.error('❌ Error procesando mensaje:', error)

    // En caso de error, derivar a humano
    return {
      respuesta: `Disculpa ${nombrePaciente.split(' ')[0]}, tengo problemas técnicos. El nutriólogo te responderá en breve.`,
      debe_responder_automaticamente: true,
      debe_derivar_humano: true,
      razon: `Error en procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      metadata: {
        fuente: 'sistema',
      },
    }
  }
}

/**
 * Verifica si el mensaje es respuesta a un recordatorio de cita
 */
async function esRespuestaARecordatorio(mensaje: string, pacienteId: string): Promise<boolean> {
  const mensajeNormalizado = mensaje.trim().toLowerCase()

  // Palabras clave solo para CONFIRMACIÓN (cancelar ahora se maneja con IA + link)
  const palabrasConfirmacion = ['1', 'confirmar', 'confirmo']

  const esConfirmacion = palabrasConfirmacion.some((palabra) => mensajeNormalizado === palabra)

  if (!esConfirmacion) {
    return false
  }

  // Verificar si tiene cita pendiente hoy o en el futuro
  const inicioDia = new Date()
  inicioDia.setHours(0, 0, 0, 0)

  const citaPendiente = await prisma.cita.findFirst({
    where: {
      paciente_id: pacienteId,
      estado: 'PENDIENTE',
      fecha_hora: {
        gte: inicioDia,
      },
    },
  })

  return !!citaPendiente
}

/**
 * Detecta si el mensaje es una afirmación para agendar la cita sugerida.
 * Ej: "sí", "si", "claro", "agéndala", "1", "confirmo".
 */
function esAfirmacionParaAgendar(mensaje: string): boolean {
  const m = mensaje.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos

  const afirmaciones = [
    'si',
    'sii',
    'siii',
    'sip',
    'simon',
    'claro',
    'va',
    'dale',
    'ok',
    'okay',
    'esta bien',
    'esta perfecto',
    'confirmo',
    'confirmar',
    'confirmar cita',
    'agendala',
    'agendar',
    'agenda',
    'agendar cita',
    'quiero agendar',
    'si quiero',
    'si por favor',
    'si porfavor',
    'de acuerdo',
    '1',
    'si agenda',
    'si agendala',
  ]

  return afirmaciones.includes(m)
}

/**
 * Detecta si el mensaje pide elegir/cambiar a otro horario (botón "Elegir otro horario").
 */
function esPeticionOtroHorario(mensaje: string): boolean {
  const m = mensaje.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar acentos

  const opciones = [
    'elegir otro horario',
    'otro horario',
    'otra hora',
    'cambiar horario',
    'cambiar hora',
    'otro dia',
    'otra fecha',
    'prefiero otro horario',
  ]

  return opciones.includes(m)
}

/**
 * Si el paciente tiene una próxima cita SUGERIDA (con hora) y confirma agendar,
 * crea la cita real automáticamente. Devuelve un resultado de procesamiento si
 * actuó, o null si no aplica (para que el flujo continúe normalmente).
 */
async function intentarAgendarCitaSugerida(
  mensaje: string,
  pacienteId: string,
  nombrePaciente: string,
  contexto: PacienteContexto
): Promise<ResultadoProcesamiento | null> {
  // Solo aplica si tiene cita sugerida y NO tiene ya una cita real
  if (!contexto.tiene_proxima_cita_sugerida) return null
  if (contexto.tiene_cita_proxima) return null

  const nombreCortoBtn = nombrePaciente.split(' ')[0]

  // Botón "Elegir otro horario": ofrecer el link de agendar sin crear cita
  if (esPeticionOtroHorario(mensaje)) {
    const { agendar: urlAgendar } = (await import('@/lib/knowledge-base')).KNOWLEDGE_BASE.urls
    return {
      respuesta:
        `Claro ${nombreCortoBtn} 😊. Puedes elegir el día y la hora que más te convenga aquí:\n${urlAgendar}\n\n` +
        `Recuerda usar tu correo o número de celular para identificarte.`,
      debe_responder_automaticamente: true,
      debe_derivar_humano: false,
      razon: 'Paciente pidió elegir otro horario para su cita sugerida',
      metadata: { fuente: 'sistema' },
    }
  }

  // A partir de aquí, solo continuamos si el paciente confirma agendar
  if (!esAfirmacionParaAgendar(mensaje)) return null

  // Recuperar la consulta sugerida con su proxima_cita real (Date)
  const inicioDiaHoy = new Date()
  inicioDiaHoy.setHours(0, 0, 0, 0)

  const consultaSugerida = await prisma.consulta.findFirst({
    where: {
      paciente_id: pacienteId,
      proxima_cita: { gte: inicioDiaHoy },
    },
    orderBy: { fecha: 'desc' },
    select: { proxima_cita: true },
  })

  if (!consultaSugerida?.proxima_cita) return null

  const nombreCorto = nombrePaciente.split(' ')[0]
  const { agendar: urlAgendar } = (await import('@/lib/knowledge-base')).KNOWLEDGE_BASE.urls

  try {
    const { crearCitaParaPaciente } = await import('@/lib/services/citas')
    const resultado = await crearCitaParaPaciente({
      pacienteId,
      fechaHora: consultaSugerida.proxima_cita,
      motivoConsulta: 'Consulta de seguimiento',
      tipoCita: 'PRESENCIAL',
      notificarNueva: true, // la agenda el paciente por WhatsApp → avisar al nutriólogo
    })

    if (resultado.ok) {
      const fecha = contexto.fecha_sugerida ?? ''
      // hora_sugerida viene en 24h ("15:00"); mostrarla en 12h ("3:00 PM")
      const hora = contexto.hora_sugerida ? formatearHora(contexto.hora_sugerida) : ''
      return {
        respuesta:
          `¡Listo ${nombreCorto}! 🎉 Tu cita quedó agendada para el ${fecha}${hora ? ` a las ${hora}` : ''}.\n\n` +
          `Te enviaremos un recordatorio antes de tu cita. Si necesitas cambiarla, escríbenos. ¡Te esperamos! 😊`,
        debe_responder_automaticamente: true,
        debe_derivar_humano: false,
        razon: 'Cita agendada automáticamente desde recordatorio de próxima cita sugerida',
        metadata: { fuente: 'sistema' },
      }
    }

    // Horario ocupado / ya tiene cita / error → ofrecer link manual
    return {
      respuesta:
        `${nombreCorto}, no pude agendar a ese horario porque ya no está disponible 😕.\n\n` +
        `Puedes elegir otro horario fácilmente aquí: ${urlAgendar}`,
      debe_responder_automaticamente: true,
      debe_derivar_humano: false,
      razon: `No se pudo agendar automáticamente: ${resultado.motivo}`,
      metadata: { fuente: 'sistema' },
    }
  } catch (error) {
    console.error('Error al agendar cita sugerida automáticamente:', error)
    return {
      respuesta: `${nombreCorto}, tuve un problema al agendar tu cita. Puedes hacerlo aquí: ${urlAgendar}`,
      debe_responder_automaticamente: true,
      debe_derivar_humano: false,
      razon: 'Error al agendar automáticamente',
      metadata: { fuente: 'sistema' },
    }
  }
}

// Marcador invisible en la pregunta de confirmación de cancelación, para
// reconocer en el historial que el turno anterior pidió confirmar la cancelación.
const MARCADOR_CONFIRMAR_CANCELAR = 'quieres cancelar tu cita'

/** Detecta intención de cancelar la cita (primer turno). */
function esPeticionCancelar(mensaje: string): boolean {
  const m = mensaje.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const frases = [
    'cancelar',
    'cancelar cita',
    'cancelar mi cita',
    'quiero cancelar',
    'cancela mi cita',
    'ya no puedo ir',
    'ya no podre ir',
    'no podre asistir',
    'no puedo asistir',
    'no voy a poder ir',
    'no podre ir',
    'ya no voy a poder',
    'dar de baja mi cita',
  ]
  return frases.some((f) => m.includes(f))
}

/** Detecta una afirmación ("sí", "sí cancélala", "confirmo", "correcto", etc.). */
function esAfirmacionGenerica(mensaje: string): boolean {
  // Normalizar: minúsculas, sin acentos y sin signos de puntuación
  const m = mensaje
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,!¡?¿;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Coincidencia exacta con afirmaciones simples
  const exactas = [
    'si',
    'sii',
    'siii',
    'sip',
    'simon',
    'claro',
    'va',
    'dale',
    'ok',
    'okay',
    'confirmo',
    'confirmar',
    'correcto',
    'asi es',
    'esta bien',
    'de acuerdo',
    'cancelala',
    'cancela',
    '1',
    'obvio',
    'sale',
  ]
  if (exactas.includes(m)) return true

  // Afirmación + intención de cancelar en la misma frase
  // (ej: "si cancelala", "sí por favor cancela", "dale cancela")
  const empiezaAfirmando = /^(si|sip|claro|dale|ok|okay|confirmo|va|sale|obvio)\b/.test(m)
  const mencionaCancelar = /\bcancel/.test(m)
  if (empiezaAfirmando && (mencionaCancelar || m.split(' ').length <= 3)) return true

  // "sí por favor" y variantes
  if (/^si\s+(por\s+favor|porfavor|adelante|hazlo|quiero)\b/.test(m)) return true

  return false
}

/** ¿El último mensaje del asistente fue la pregunta de confirmación de cancelación? */
function ultimoFueConfirmarCancelar(
  historial: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  for (let i = historial.length - 1; i >= 0; i--) {
    if (historial[i]!.role === 'assistant') {
      return historial[i]!.content.toLowerCase().includes(MARCADOR_CONFIRMAR_CANCELAR)
    }
  }
  return false
}

/**
 * Cancelación de cita por chat con doble confirmación:
 * - Turno 1 (el paciente pide cancelar): pregunta si está seguro (NO cancela).
 * - Turno 2 (el paciente confirma y el turno previo fue la pregunta): cancela.
 * Devuelve un resultado si actuó, o null para que el flujo continúe.
 */
async function intentarCancelarCita(
  mensaje: string,
  pacienteId: string,
  nombrePaciente: string,
  contexto: PacienteContexto,
  historial: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ResultadoProcesamiento | null> {
  const nombreCorto = nombrePaciente.split(' ')[0]
  const pidioCancelar = esPeticionCancelar(mensaje)
  const confirmoTrasPregunta =
    esAfirmacionGenerica(mensaje) && ultimoFueConfirmarCancelar(historial)

  if (!pidioCancelar && !confirmoTrasPregunta) return null

  // Sin cita próxima activa: no hay nada que cancelar
  if (!contexto.tiene_cita_proxima) {
    // Solo respondemos aquí si el paciente pidió cancelar explícitamente
    if (!pidioCancelar) return null
    return {
      respuesta: `${nombreCorto}, no encuentro ninguna cita activa a tu nombre para cancelar. Si quieres, puedo ayudarte a agendar una nueva 😊`,
      debe_responder_automaticamente: true,
      debe_derivar_humano: false,
      razon: 'Petición de cancelar sin cita activa',
      metadata: { fuente: 'sistema' },
    }
  }

  const fecha = contexto.fecha_proxima_cita ?? 'tu próxima cita'
  const hora = contexto.hora_proxima_cita ? ` a las ${contexto.hora_proxima_cita}` : ''

  // Turno 2: confirmó tras la pregunta → cancelar de verdad
  if (confirmoTrasPregunta) {
    try {
      // Ubicar la cita a cancelar: por código si lo tenemos, si no la pendiente futura
      let citaId: string | undefined
      const codigo: string | undefined = contexto.codigo_cita
      if (!codigo) {
        const inicioDia = new Date()
        inicioDia.setHours(0, 0, 0, 0)
        const pendiente = await prisma.cita.findFirst({
          where: { paciente_id: pacienteId, estado: 'PENDIENTE', fecha_hora: { gte: inicioDia } },
          orderBy: { fecha_hora: 'asc' },
          select: { id: true },
        })
        citaId = pendiente?.id
      }
      if (!codigo && !citaId) return null

      const { cancelarCitaParaPaciente } = await import('@/lib/services/citas')
      const resultado = await cancelarCitaParaPaciente(codigo ? { codigo } : { citaId })
      if (resultado.ok) {
        return {
          respuesta: `Listo ${nombreCorto}, cancelé tu cita del ${fecha}${hora}. Cuando quieras agendar de nuevo aquí estoy 😊`,
          debe_responder_automaticamente: true,
          debe_derivar_humano: false,
          razon: 'Cita cancelada por el paciente vía chat (confirmada)',
          metadata: { fuente: 'sistema' },
        }
      }
      // No se pudo cancelar (no encontrada / error) → derivar suavemente
      return {
        respuesta: `${nombreCorto}, tuve un problema al cancelar tu cita. Por favor contáctanos al *951 130 1554* y lo resolvemos enseguida 🙏`,
        debe_responder_automaticamente: true,
        debe_derivar_humano: true,
        razon: `No se pudo cancelar: ${resultado.motivo}`,
        metadata: { fuente: 'sistema' },
      }
    } catch (error) {
      console.error('Error al cancelar cita por chat:', error)
      return {
        respuesta: `${nombreCorto}, tuve un problema técnico al cancelar. Escríbenos al *951 130 1554* y lo vemos 🙏`,
        debe_responder_automaticamente: true,
        debe_derivar_humano: true,
        razon: 'Error técnico al cancelar por chat',
        metadata: { fuente: 'sistema' },
      }
    }
  }

  // Turno 1: pidió cancelar → pedir confirmación (el marcador va en el texto)
  return {
    respuesta: `${nombreCorto}, ¿seguro que quieres cancelar tu cita del ${fecha}${hora}? Responde *SÍ* para confirmar la cancelación 🗓️`,
    debe_responder_automaticamente: true,
    debe_derivar_humano: false,
    razon: 'Solicitud de confirmación para cancelar cita',
    metadata: { fuente: 'sistema' },
  }
}

/**
 * Genera mensaje de derivación a humano
 */
function generarMensajeDerivacion(nombrePaciente: string, mensajeOriginal: string): string {
  const nombreCorto = nombrePaciente.split(' ')[0]
  const hora = parseInt(horaEnMexico(new Date()).split(':')[0]!, 10)

  let saludo = 'Hola'
  if (hora >= 5 && hora < 12) saludo = 'Buenos días'
  else if (hora >= 12 && hora < 19) saludo = 'Buenas tardes'
  else saludo = 'Buenas noches'

  // Detectar el tema de la pregunta para personalizar
  const temas: { [key: string]: string } = {
    'plan|dieta|alimentación|comer': 'tu plan nutricional',
    'síntoma|dolor|enfermedad|salud': 'tu salud',
    'peso|kilos|adelgazar|bajar': 'tu objetivo de peso',
    'cita|agendar|horario': 'tu cita',
  }

  let temaDetectado = 'tu consulta'
  for (const [patron, tema] of Object.entries(temas)) {
    const regex = new RegExp(patron, 'i')
    if (regex.test(mensajeOriginal)) {
      temaDetectado = tema
      break
    }
  }

  return `${saludo} ${nombreCorto}! Para darte información precisa sobre ${temaDetectado}, lo mejor es que platiques directamente con *Paul Cortes* al *951 130 1554* 😊`
}

/**
 * Obtiene el contexto del paciente para la IA
 */
async function obtenerContextoPaciente(pacienteId: string): Promise<PacienteContexto> {
  // Obtener información del paciente
  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    select: {
      nombre: true,
      email: true,
      createdAt: true,
    },
  })

  if (!paciente) {
    throw new Error('Paciente no encontrado')
  }

  // Buscar próxima cita desde el inicio del día de hoy (no la hora exacta),
  // para no perder citas del día actual cuya hora ya pasó en UTC pero no en México
  const inicioDiaHoy = new Date()
  inicioDiaHoy.setHours(0, 0, 0, 0)

  const proximaCita = await prisma.cita.findFirst({
    where: {
      paciente_id: pacienteId,
      estado: 'PENDIENTE',
      fecha_hora: {
        gte: inicioDiaHoy,
      },
    },
    orderBy: {
      fecha_hora: 'asc',
    },
  })

  // Contar consultas previas
  const totalConsultas = await prisma.consulta.count({
    where: {
      paciente_id: pacienteId,
    },
  })

  // Obtener última consulta
  const ultimaConsulta = await prisma.consulta.findFirst({
    where: {
      paciente_id: pacienteId,
    },
    orderBy: {
      fecha: 'desc',
    },
    select: {
      fecha: true,
      peso: true,
      imc: true,
    },
  })

  // Determinar si es paciente nuevo (menos de 2 consultas)
  const esPacienteNuevo = totalConsultas < 2

  // Buscar próxima cita SUGERIDA por el nutriólogo (consulta más reciente con
  // proxima_cita futura). Solo es "agendable automáticamente" si el paciente
  // NO tiene ya una cita real próxima.
  let tieneProximaCitaSugerida = false
  let fechaSugerida: string | undefined
  let horaSugerida: string | undefined

  if (!proximaCita) {
    const consultaSugerida = await prisma.consulta.findFirst({
      where: {
        paciente_id: pacienteId,
        proxima_cita: { gte: inicioDiaHoy },
      },
      orderBy: { fecha: 'desc' },
      select: { proxima_cita: true },
    })

    if (consultaSugerida?.proxima_cita) {
      const { proximaCitaTieneHora, extraerHoraProximaCita } =
        await import('@/lib/utils/proxima-cita')
      // Solo agendable si tiene hora específica asignada por el nutriólogo
      if (proximaCitaTieneHora(consultaSugerida.proxima_cita)) {
        tieneProximaCitaSugerida = true
        // Fecha y hora SIEMPRE en zona horaria de México (no del servidor)
        fechaSugerida = new Date(consultaSugerida.proxima_cita).toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/Mexico_City',
        })
        horaSugerida = extraerHoraProximaCita(consultaSugerida.proxima_cita)
      }
    }
  }

  return {
    nombre: paciente.nombre,
    email: paciente.email ?? undefined,
    tiene_cita_proxima: !!proximaCita,
    tiene_proxima_cita_sugerida: tieneProximaCitaSugerida,
    fecha_sugerida: fechaSugerida,
    hora_sugerida: horaSugerida,
    fecha_proxima_cita: proximaCita
      ? new Date(proximaCita.fecha_hora).toLocaleDateString('es-MX', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined,
    hora_proxima_cita: proximaCita
      ? new Date(proximaCita.fecha_hora).toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : undefined,
    tipo_cita: proximaCita?.tipo_cita || undefined,
    codigo_cita: proximaCita?.codigo_cita || undefined,
    es_paciente_nuevo: esPacienteNuevo,
    total_consultas: totalConsultas,
    ultima_consulta_fecha: ultimaConsulta
      ? new Date(ultimaConsulta.fecha).toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : undefined,
    peso_ultima_consulta: ultimaConsulta?.peso ?? undefined,
    imc_ultima_consulta: ultimaConsulta?.imc ?? undefined,
  }
}

/**
 * Obtiene el historial reciente de conversación
 */
async function obtenerHistorialConversacion(
  pacienteId: string,
  limite: number = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const mensajes = await prisma.mensajeWhatsApp.findMany({
    where: {
      paciente_id: pacienteId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limite,
    select: {
      direccion: true,
      contenido: true,
      createdAt: true,
    },
  })

  // Convertir a formato de OpenAI (invertir orden para tener del más antiguo al más reciente)
  return mensajes
    .reverse()
    .map((msg) => ({
      role: msg.direccion === 'ENTRANTE' ? ('user' as const) : ('assistant' as const),
      content: msg.contenido,
    }))
    .slice(0, -1) // Excluir el último mensaje (es el actual que se está procesando)
}

/**
 * Guarda el log de respuesta automática
 */
export async function guardarLogRespuestaIA(
  pacienteId: string,
  _mensajeEntrante: string,
  _respuestaGenerada: string,
  resultado: ResultadoProcesamiento
): Promise<void> {
  try {
    // Aquí podrías guardar en una tabla de logs si quieres
    console.log('📊 Log de respuesta IA:', {
      paciente_id: pacienteId,
      fuente: resultado.metadata?.fuente,
      confidence: resultado.metadata?.confidence,
      tokens: resultado.metadata?.tokens_usados,
      derivado: resultado.debe_derivar_humano,
      razon: resultado.razon,
    })

    // Opcional: Guardar en base de datos para análisis
    // await prisma.logRespuestaIA.create({ ... })
  } catch (error) {
    console.error('Error guardando log de IA:', error)
  }
}
