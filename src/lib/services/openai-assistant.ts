import OpenAI from 'openai'
import { KNOWLEDGE_BASE, SYSTEM_INSTRUCTIONS } from '@/lib/knowledge-base'

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
}

/**
 * Genera el contexto del sistema con información del paciente
 */
function generarContextoSistema(pacienteContexto?: PacienteContexto): string {
  let contexto = SYSTEM_INSTRUCTIONS

  // Agregar información de la base de conocimiento
  contexto += `\n\n## INFORMACIÓN DEL CONSULTORIO:\n`
  contexto += `Nutriólogo: ${KNOWLEDGE_BASE.nutriologo.nombre_completo}\n`
  contexto += `Ubicación: ${KNOWLEDGE_BASE.consultorio.ubicacion}\n`
  contexto += `Horarios: ${KNOWLEDGE_BASE.consultorio.horarios}\n`
  contexto += `Precio consulta: $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio} ${KNOWLEDGE_BASE.servicios.consulta_nutricional.moneda}\n`
  contexto += `Formas de pago: ${KNOWLEDGE_BASE.formas_pago.join(', ')}\n`
  contexto += `Modalidades: Presencial y En línea\n`
  contexto += `Link para agendar: ${KNOWLEDGE_BASE.urls.agendar}\n`

  // Agregar contexto del paciente si existe
  if (pacienteContexto) {
    contexto += `\n## INFORMACIÓN DEL PACIENTE:\n`
    contexto += `Nombre: ${pacienteContexto.nombre}\n`
    contexto += `Es paciente nuevo: ${pacienteContexto.es_paciente_nuevo ? 'Sí' : 'No'}\n`

    if (!pacienteContexto.es_paciente_nuevo && pacienteContexto.total_consultas) {
      contexto += `Total de consultas previas: ${pacienteContexto.total_consultas}\n`
    }

    if (pacienteContexto.tiene_cita_proxima) {
      contexto += `\nTiene cita próxima agendada:\n`
      contexto += `- Fecha: ${pacienteContexto.fecha_proxima_cita}\n`
      contexto += `- Hora: ${pacienteContexto.hora_proxima_cita}\n`
      contexto += `- Modalidad: ${pacienteContexto.tipo_cita}\n`
      if (pacienteContexto.codigo_cita) {
        contexto += `- Código de cita: ${pacienteContexto.codigo_cita}\n`
        contexto += `- URL para gestionar cita (confirmar/cancelar/reagendar): ${KNOWLEDGE_BASE.urls.sitio_web}/cita/${pacienteContexto.codigo_cita}\n`
      }
      contexto += `\nIMPORTANTE: Si el paciente pregunta sobre REAGENDAR, CANCELAR o CONFIRMAR su cita, proporciona la URL directa de gestión de cita.\n`
    } else {
      contexto += `\nNo tiene citas próximas agendadas.\n`
    }

    if (pacienteContexto.ultima_consulta_fecha) {
      contexto += `Última consulta: ${pacienteContexto.ultima_consulta_fecha}\n`
    }
  }

  return contexto
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

    // Configuración del modelo
    const model = process.env.OPENAI_MODEL || 'gpt-4o'
    const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
    const maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS || '500')

    console.log('🤖 Consultando OpenAI:', {
      model,
      temperatura: temperature,
      maxTokens,
      mensaje: mensajePaciente.substring(0, 50) + '...',
      paciente: pacienteContexto?.nombre || 'Desconocido',
    })

    // Construir mensajes
    const mensajes: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: generarContextoSistema(pacienteContexto),
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

    // Llamar a OpenAI
    const inicio = Date.now()
    const completion = await client.chat.completions.create({
      model,
      messages: mensajes,
      temperature,
      max_tokens: maxTokens,
      presence_penalty: 0.6, // Evita repeticiones
      frequency_penalty: 0.3, // Variedad en respuestas
    })

    const tiempoRespuesta = Date.now() - inicio

    const respuesta = completion.choices[0]?.message?.content || ''
    const tokensUsados = completion.usage?.total_tokens || 0

    console.log('✅ Respuesta de OpenAI recibida:', {
      tiempo: `${tiempoRespuesta}ms`,
      tokens: tokensUsados,
      longitud: respuesta.length,
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
    }
  } catch (error) {
    console.error('❌ Error al obtener respuesta de OpenAI:', error)

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
