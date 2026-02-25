import OpenAI from 'openai'
import { KNOWLEDGE_BASE, SYSTEM_INSTRUCTIONS } from '@/lib/knowledge-base'
import { logSuccess, logDebug } from '@/lib/logger'
import { captureError, addBreadcrumb, measurePerformance } from '@/lib/sentry-utils'

/**
 * Cliente de OpenAI
 */
let openaiClient: OpenAI | null = null

/**
 * Obtiene o crea el cliente de OpenAI
 */
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  return openaiClient
}

/**
 * Verifica si OpenAI está configurado
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.AI_ENABLED === 'true'
}

/**
 * Limpia formato Markdown de la respuesta para WhatsApp
 * WhatsApp no interpreta Markdown, solo reconoce URLs directas
 */
function limpiarMarkdown(texto: string): string {
  // Convertir enlaces [texto](url) a solo URL
  // Ejemplo: [Agendar cita](https://ejemplo.com) -> https://ejemplo.com
  let textoLimpio = texto.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2')

  // Eliminar formato de código ```texto```
  textoLimpio = textoLimpio.replace(/```[^`]*```/g, (match) => {
    return match.replace(/```/g, '')
  })

  // Eliminar código inline `texto`
  textoLimpio = textoLimpio.replace(/`([^`]+)`/g, '$1')

  // Convertir encabezados ## Texto a solo Texto
  textoLimpio = textoLimpio.replace(/^#{1,6}\s+/gm, '')

  // Mantener *texto* porque WhatsApp lo usa para negrita
  // Mantener _texto_ porque WhatsApp lo usa para cursiva

  return textoLimpio.trim()
}

/**
 * Interfaz para el contexto del paciente
 */
export interface PacienteContexto {
  nombre: string
  tiene_cita_proxima: boolean
  fecha_proxima_cita?: string
  hora_proxima_cita?: string
  tipo_cita?: string
  codigo_cita?: string
  es_paciente_nuevo: boolean
  total_consultas?: number
  ultima_consulta_fecha?: string
  peso_ultima_consulta?: number
  imc_ultima_consulta?: number
}

/**
 * Interfaz para la respuesta de la IA
 */
export interface RespuestaIA {
  mensaje: string
  debe_derivar_humano: boolean
  confidence: number
  razonamiento?: string
  tokens_usados?: number
  intencion_detectada?: 'agendar' | 'precios' | 'horarios' | 'urgencia' | 'consulta_general' | 'derivar'
  nivel_urgencia?: 'baja' | 'media' | 'alta'
}

/**
 * Genera el contexto del sistema con información del paciente
 */
function generarContextoSistema(pacienteContexto?: PacienteContexto): string {
  let contexto = SYSTEM_INSTRUCTIONS

  // Obtener información de fecha y hora actual
  const ahora = new Date()
  const fechaActual = ahora.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const horaActual = ahora.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const hora = ahora.getHours()
  const dia = ahora.getDay() // 0 = Domingo, 6 = Sábado

  // Determinar saludo apropiado según la hora
  let saludoSugerido = 'Hola'
  if (hora >= 5 && hora < 12) saludoSugerido = 'Buenos días'
  else if (hora >= 12 && hora < 19) saludoSugerido = 'Buenas tardes'
  else saludoSugerido = 'Buenas noches'

  // Determinar estado del consultorio
  let estadoConsultorio = ''
  const esDomingo = dia === 0
  const esLunesViernes = dia >= 1 && dia <= 5
  const esSabado = dia === 6

  if (esDomingo) {
    estadoConsultorio = '🔴 CERRADO - El consultorio no atiende los domingos. Abre mañana lunes a las 4:00 PM.'
  } else if (esLunesViernes) {
    if (hora >= 16 && hora < 20) {
      estadoConsultorio = '🟢 ABIERTO - Horario de atención: 4:00 PM a 8:00 PM'
    } else if (hora < 16) {
      estadoConsultorio = `🟡 CERRADO - Abre hoy a las 4:00 PM (en ${16 - hora} horas)`
    } else {
      estadoConsultorio = '🔴 CERRADO - Abre mañana a las 4:00 PM'
    }
  } else if (esSabado) {
    if (hora >= 8 && hora < 19) {
      estadoConsultorio = '🟢 ABIERTO - Horario de atención: 8:00 AM a 7:00 PM'
    } else if (hora < 8) {
      estadoConsultorio = `🟡 CERRADO - Abre hoy a las 8:00 AM (en ${8 - hora} horas)`
    } else {
      estadoConsultorio = '🔴 CERRADO - Abre el lunes a las 4:00 PM'
    }
  }

  // Agregar contexto temporal
  contexto += `\n\n## CONTEXTO TEMPORAL:\n`
  contexto += `Fecha actual: ${fechaActual}\n`
  contexto += `Hora actual: ${horaActual}\n`
  contexto += `Estado del consultorio: ${estadoConsultorio}\n`
  contexto += `Saludo sugerido: "${saludoSugerido}" (adapta según la hora del día)\n\n`
  contexto += `IMPORTANTE: Usa el saludo apropiado según la hora. Si el consultorio está cerrado, menciona cuándo abre.\n`

  // Agregar información de la base de conocimiento
  contexto += `\n## INFORMACIÓN DEL CONSULTORIO:\n`
  contexto += `Nutriólogo: ${KNOWLEDGE_BASE.nutriologo.nombre_completo}\n`
  contexto += `Ubicación: ${KNOWLEDGE_BASE.consultorio.ubicacion}\n`
  contexto += `Link de ubicación en Google Maps: ${KNOWLEDGE_BASE.consultorio.ubicacion_maps}\n`
  contexto += `Horarios: ${KNOWLEDGE_BASE.consultorio.horarios}\n`
  contexto += `Precio primera consulta: $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio} ${KNOWLEDGE_BASE.servicios.consulta_nutricional.moneda}\n`
  contexto += `Precio consulta de seguimiento: $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio_seguimiento} ${KNOWLEDGE_BASE.servicios.consulta_nutricional.moneda}\n`
  contexto += `Formas de pago: ${KNOWLEDGE_BASE.formas_pago.join(', ')}\n`
  contexto += `Modalidades: Presencial y En línea\n`
  contexto += `Link para agendar: ${KNOWLEDGE_BASE.urls.agendar}\n`

  // Agregar contexto del paciente si existe
  if (pacienteContexto) {
    contexto += `\n## INFORMACIÓN DEL PACIENTE:\n`
    contexto += `Nombre: ${pacienteContexto.nombre}\n`
    contexto += `Es paciente nuevo: ${pacienteContexto.es_paciente_nuevo ? 'Sí' : 'No'}\n`

    if (pacienteContexto.es_paciente_nuevo) {
      contexto += `Precio aplicable: $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio} ${KNOWLEDGE_BASE.servicios.consulta_nutricional.moneda} (primera consulta)\n`
    } else {
      if (pacienteContexto.total_consultas) {
        contexto += `Total de consultas previas: ${pacienteContexto.total_consultas}\n`
      }
      contexto += `Precio aplicable: $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio_seguimiento} ${KNOWLEDGE_BASE.servicios.consulta_nutricional.moneda} (consulta de seguimiento)\n`
    }

    if (pacienteContexto.tiene_cita_proxima) {
      contexto += `\nTiene cita próxima agendada:\n`
      contexto += `- Fecha: ${pacienteContexto.fecha_proxima_cita}\n`
      contexto += `- Hora: ${pacienteContexto.hora_proxima_cita}\n`
      contexto += `- Modalidad: ${pacienteContexto.tipo_cita}\n`
      if (pacienteContexto.codigo_cita) {
        const urlGestion = `${KNOWLEDGE_BASE.urls.sitio_web}/cita/${pacienteContexto.codigo_cita}`
        contexto += `- Código de cita: ${pacienteContexto.codigo_cita}\n`
        contexto += `- URL EXACTA para gestionar cita: ${urlGestion}\n`
        contexto += `\n⚠️ INSTRUCCIÓN CRÍTICA: Si el paciente pregunta sobre reagendar, cancelar o confirmar su cita, usa ÚNICAMENTE esta URL (cópiala exactamente): ${urlGestion}\n`
        contexto += `No uses ninguna otra URL. No inventes rutas. La URL correcta es: ${urlGestion}\n`
      } else {
        contexto += `- IMPORTANTE: Esta cita no tiene URL de gestión disponible. NO inventes ninguna URL. Si el paciente pregunta por cancelar o reagendar, indícale que contacte al consultorio directamente al 951 130 1554.\n`
      }
    } else {
      contexto += `\nNo tiene citas próximas agendadas. Si pregunta por cancelar o reagendar, dile que no tiene cita activa y ofrécele agendar una nueva en: ${KNOWLEDGE_BASE.urls.agendar}\n`
    }

    if (pacienteContexto.ultima_consulta_fecha) {
      contexto += `Última consulta: ${pacienteContexto.ultima_consulta_fecha}\n`
    }

    if (pacienteContexto.peso_ultima_consulta) {
      let pesoInfo = `Peso en última consulta: ${pacienteContexto.peso_ultima_consulta} kg`
      if (pacienteContexto.imc_ultima_consulta) {
        pesoInfo += ` (IMC: ${pacienteContexto.imc_ultima_consulta})`
      }
      contexto += `${pesoInfo}\n`
    }
  }

  return contexto
}

/**
 * Detecta la intención del usuario en su mensaje
 */
function detectarIntencion(mensaje: string): {
  intencion: 'agendar' | 'precios' | 'horarios' | 'urgencia' | 'consulta_general' | 'derivar'
  nivel_urgencia: 'baja' | 'media' | 'alta'
} {
  const mensajeNormalizado = mensaje.toLowerCase()

  // Detectar urgencia
  const palabrasUrgencia = [
    'urgente',
    'emergencia',
    'ahora mismo',
    'ya',
    'rápido',
    'cuanto antes',
    'lo antes posible',
    'necesito ya',
  ]
  const esUrgente = palabrasUrgencia.some((palabra) => mensajeNormalizado.includes(palabra))

  // Detectar intención de agendar
  const palabrasAgendar = [
    'agendar',
    'cita',
    'consulta',
    'reservar',
    'apartar',
    'cuando puedo',
    'disponibilidad',
    'horarios disponibles',
  ]
  if (palabrasAgendar.some((palabra) => mensajeNormalizado.includes(palabra))) {
    return {
      intencion: 'agendar',
      nivel_urgencia: esUrgente ? 'alta' : 'media',
    }
  }

  // Detectar pregunta de precios
  const palabrasPrecios = ['precio', 'costo', 'cuanto', 'cuánto', 'pagar', 'cobrar', 'vale']
  if (palabrasPrecios.some((palabra) => mensajeNormalizado.includes(palabra))) {
    return {
      intencion: 'precios',
      nivel_urgencia: 'baja',
    }
  }

  // Detectar pregunta de horarios
  const palabrasHorarios = [
    'horario',
    'que hora',
    'a qué hora',
    'cuando abren',
    'cuando atienden',
    'están abiertos',
  ]
  if (palabrasHorarios.some((palabra) => mensajeNormalizado.includes(palabra))) {
    return {
      intencion: 'horarios',
      nivel_urgencia: 'baja',
    }
  }

  // Detectar necesidad de derivar (temas nutricionales/médicos)
  const palabrasDerivar = [
    'puedo comer',
    'debo comer',
    'mi plan',
    'mi dieta',
    'dolor',
    'síntoma',
    'enfermedad',
    'medicamento',
  ]
  if (palabrasDerivar.some((palabra) => mensajeNormalizado.includes(palabra))) {
    return {
      intencion: 'derivar',
      nivel_urgencia: esUrgente ? 'alta' : 'media',
    }
  }

  // Por defecto: consulta general
  return {
    intencion: 'consulta_general',
    nivel_urgencia: esUrgente ? 'alta' : 'baja',
  }
}

/**
 * Obtiene respuesta de la IA para un mensaje del paciente
 */
export async function obtenerRespuestaIA(
  mensajePaciente: string,
  pacienteContexto?: PacienteContexto,
  historialConversacion: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<RespuestaIA> {
  try {
    if (!isOpenAIConfigured()) {
      throw new Error('OpenAI no está configurado o habilitado')
    }

    const client = getOpenAIClient()

    // Detectar intención del usuario
    const { intencion, nivel_urgencia } = detectarIntencion(mensajePaciente)

    // Configuración del modelo
    const model = process.env.OPENAI_MODEL || 'gpt-4o'
    const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
    const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '500')

    logDebug('Consultando OpenAI', {
      model,
      temperatura: temperature,
      maxTokens,
      mensaje: mensajePaciente.substring(0, 50) + '...',
      paciente: pacienteContexto?.nombre || 'Desconocido',
      intencion_detectada: intencion,
      nivel_urgencia,
    })

    // Construir contexto del sistema con hints proactivos según intención
    let contextoSistema = generarContextoSistema(pacienteContexto)

    // Agregar instrucciones proactivas según intención detectada
    contextoSistema += `\n\n## INTENCIÓN DETECTADA: ${intencion.toUpperCase()}\n`

    if (intencion === 'agendar') {
      contextoSistema += `El usuario muestra interés en agendar una cita. SÉ PROACTIVO:\n`
      contextoSistema += `- Después de responder su pregunta, ofrécele DIRECTAMENTE el link de agenda: ${KNOWLEDGE_BASE.urls.agendar}\n`
      contextoSistema += `- Menciona que puede ver disponibilidad en tiempo real\n`
      contextoSistema += `- Si no tiene cita agendada, incentiva a que agende ahora\n`
    } else if (intencion === 'precios') {
      contextoSistema += `El usuario pregunta por precios. SÉ PROACTIVO:\n`
      contextoSistema += `- Después de dar los precios ($${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio} primera consulta / $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio_seguimiento} seguimiento), menciona qué incluye\n`
      contextoSistema += `- Ofrece el link de agenda si parece interesado: ${KNOWLEDGE_BASE.urls.agendar}\n`
      contextoSistema += `- Resalta el valor de la consulta (plan personalizado, seguimiento)\n`
    } else if (intencion === 'horarios') {
      contextoSistema += `El usuario pregunta por horarios. SÉ PROACTIVO:\n`
      contextoSistema += `- Después de dar los horarios, menciona que puede ver disponibilidad exacta en: ${KNOWLEDGE_BASE.urls.agendar}\n`
      contextoSistema += `- Si está fuera de horario, menciona cuándo abre el consultorio\n`
    } else if (intencion === 'derivar') {
      contextoSistema += `El usuario hace una pregunta nutricional/médica. SÉ PROACTIVO:\n`
      contextoSistema += `- NO intentes responder temas nutricionales específicos\n`
      contextoSistema += `- Deriva al nutriólogo Paul (951 130 1554)\n`
      contextoSistema += `- Explica que necesita evaluación profesional personalizada\n`
    }

    if (nivel_urgencia === 'alta') {
      contextoSistema += `\n⚠️ URGENCIA DETECTADA: El usuario usa palabras de urgencia. Responde con prioridad y ofrece opciones rápidas.\n`
      contextoSistema += `- Si pregunta por citas: menciona disponibilidad inmediata o más cercana\n`
      contextoSistema += `- Si es tema nutricional urgente: da el teléfono directo del nutriólogo: 951 130 1554\n`
    }

    // Construir mensajes
    const mensajes: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: contextoSistema,
      },
    ]

    // Agregar historial de conversación (últimos 5 mensajes)
    const historialReciente = historialConversacion.slice(-5)
    mensajes.push(...historialReciente)

    // Agregar mensaje actual
    mensajes.push({
      role: 'user',
      content: mensajePaciente,
    })

    // Llamar a OpenAI con medición de performance
    const inicio = Date.now()

    addBreadcrumb('openai', 'Llamando a OpenAI API', {
      model,
      intencion,
      nivel_urgencia,
    })

    const completion = await measurePerformance('openai.chat.completions', async () => {
      return await client.chat.completions.create({
        model,
        messages: mensajes,
        temperature,
        max_tokens: maxTokens,
        presence_penalty: 0.6, // Evita repeticiones
        frequency_penalty: 0.3, // Variedad en respuestas
      })
    })

    const tiempoRespuesta = Date.now() - inicio

    const respuesta = completion.choices[0]?.message?.content || ''
    const tokensUsados = completion.usage?.total_tokens || 0

    logSuccess('Respuesta de OpenAI recibida', {
      tiempo: `${tiempoRespuesta}ms`,
      tokens: tokensUsados,
      longitud: respuesta.length,
      paciente: pacienteContexto?.nombre || 'Desconocido',
    })

    // Limpiar formato Markdown de la respuesta (WhatsApp no lo interpreta)
    const respuestaLimpia = limpiarMarkdown(respuesta)

    // Analizar si la IA sugiere derivar a humano
    const debeDeriviar = analizarSiDebeDeriviar(respuestaLimpia, mensajePaciente)

    // Calcular confianza basada en la respuesta
    const confidence = calcularConfianza(respuestaLimpia, completion)

    return {
      mensaje: respuestaLimpia,
      debe_derivar_humano: debeDeriviar,
      confidence,
      tokens_usados: tokensUsados,
      razonamiento: debeDeriviar
        ? 'La IA detectó que requiere atención humana'
        : 'Respuesta automática generada',
      intencion_detectada: intencion,
      nivel_urgencia,
    }
  } catch (error) {
    // Capturar error en Sentry y logs
    captureError(error, {
      module: 'openai',
      extra: {
        paciente: pacienteContexto?.nombre || 'Desconocido',
        mensaje: mensajePaciente.substring(0, 50) + '...',
        model: process.env.OPENAI_MODEL,
      },
    })

    // Si hay error, derivar a humano
    return {
      mensaje:
        'Disculpa, tengo problemas técnicos en este momento. El nutriólogo te responderá personalmente en breve.',
      debe_derivar_humano: true,
      confidence: 0,
      razonamiento: `Error de OpenAI: ${error instanceof Error ? error.message : 'Error desconocido'}`,
    }
  }
}

/**
 * Analiza si la respuesta de la IA indica que debe derivar a humano
 */
function analizarSiDebeDeriviar(respuestaIA: string, mensajeOriginal: string): boolean {
  const respuestaNormalizada = respuestaIA.toLowerCase()
  const mensajeNormalizado = mensajeOriginal.toLowerCase()

  // Frases que indican derivación
  const frasesDerivacion = [
    'paul te responderá',
    'nutriólogo te responderá',
    'responderá personalmente',
    'requiere evaluación',
    'necesito que paul',
    'consultar con el nutriólogo',
    'atención personalizada',
    'caso específico',
  ]

  // Verificar si la IA menciona derivación
  const mencionaDerivacion = frasesDerivacion.some((frase) =>
    respuestaNormalizada.includes(frase)
  )

  // Palabras clave nutricionales/médicas en el mensaje original
  const palabrasCriticas = [
    'puedo comer',
    'mi dieta',
    'mi plan',
    'qué comer',
    'cuántas calorías',
    'síntoma',
    'dolor',
    'enfermedad',
    'medicamento',
  ]

  const contienePalabrasCriticas = palabrasCriticas.some((palabra) =>
    mensajeNormalizado.includes(palabra)
  )

  return mencionaDerivacion || contienePalabrasCriticas
}

/**
 * Calcula el nivel de confianza de la respuesta
 */
function calcularConfianza(
  respuesta: string,
  completion: OpenAI.Chat.Completions.ChatCompletion
): number {
  // Empezar con confianza base
  let confidence = 0.8

  // Reducir si la respuesta es muy corta (posible confusión)
  if (respuesta.length < 50) {
    confidence -= 0.2
  }

  // Reducir si contiene palabras de incertidumbre
  const palabrasIncertidumbre = [
    'no estoy seguro',
    'creo que',
    'tal vez',
    'posiblemente',
    'podría ser',
    'no sé',
  ]

  if (palabrasIncertidumbre.some((palabra) => respuesta.toLowerCase().includes(palabra))) {
    confidence -= 0.3
  }

  // Aumentar si la respuesta es estructurada (tiene listas, números, emojis)
  if (respuesta.includes('✅') || respuesta.includes('•') || respuesta.includes('1.')) {
    confidence += 0.1
  }

  // El modelo finish_reason también es importante
  if (completion.choices[0]?.finish_reason === 'stop') {
    confidence += 0.1 // Respuesta completa
  } else {
    confidence -= 0.2 // Respuesta cortada o incompleta
  }

  // Mantener entre 0 y 1
  return Math.max(0, Math.min(1, confidence))
}

/**
 * Verifica el estado de la conexión con OpenAI
 */
export async function verificarEstadoOpenAI(): Promise<{
  configurado: boolean
  funcionando: boolean
  modelo?: string
  error?: string
}> {
  try {
    if (!isOpenAIConfigured()) {
      return {
        configurado: false,
        funcionando: false,
        error: 'OpenAI no está configurado o está deshabilitado',
      }
    }

    const client = getOpenAIClient()
    const model = process.env.OPENAI_MODEL || 'gpt-4o'

    // Hacer una llamada de prueba simple
    await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5,
    })

    return {
      configurado: true,
      funcionando: true,
      modelo: model,
    }
  } catch (error) {
    return {
      configurado: true,
      funcionando: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
