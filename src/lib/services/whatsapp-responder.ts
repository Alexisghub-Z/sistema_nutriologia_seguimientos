import { obtenerRespuestaIA, isOpenAIConfigured, type PacienteContexto } from './openai-assistant'
import { buscarEnFAQ, requiereDerivacion } from '@/lib/knowledge-base'
import prisma from '@/lib/prisma'
import { horaEnMexico } from '@/lib/utils/proxima-cita'

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

    // Reutilizar el contexto del paciente ya obtenido en el PASO 1.5
    const contexto = contextoPaciente

    // Obtener historial reciente de conversación
    const historial = await obtenerHistorialConversacion(pacienteId)

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
  const m = mensaje
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar acentos

  const afirmaciones = [
    'si', 'sii', 'siii', 'sip', 'simon',
    'claro', 'va', 'dale', 'ok', 'okay', 'esta bien', 'esta perfecto',
    'confirmo', 'confirmar', 'confirmar cita', 'agendala', 'agendar', 'agenda', 'agendar cita',
    'quiero agendar', 'si quiero', 'si por favor', 'si porfavor', 'de acuerdo',
    '1', 'si agenda', 'si agendala',
  ]

  return afirmaciones.includes(m)
}

/**
 * Detecta si el mensaje pide elegir/cambiar a otro horario (botón "Elegir otro horario").
 */
function esPeticionOtroHorario(mensaje: string): boolean {
  const m = mensaje
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar acentos

  const opciones = [
    'elegir otro horario', 'otro horario', 'otra hora', 'cambiar horario',
    'cambiar hora', 'otro dia', 'otra fecha', 'prefiero otro horario',
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
    })

    if (resultado.ok) {
      const fecha = contexto.fecha_sugerida ?? ''
      const hora = contexto.hora_sugerida ?? ''
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
      respuesta:
        `${nombreCorto}, tuve un problema al agendar tu cita. Puedes hacerlo aquí: ${urlAgendar}`,
      debe_responder_automaticamente: true,
      debe_derivar_humano: false,
      razon: 'Error al agendar automáticamente',
      metadata: { fuente: 'sistema' },
    }
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
      const { proximaCitaTieneHora, extraerHoraProximaCita } = await import(
        '@/lib/utils/proxima-cita'
      )
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
