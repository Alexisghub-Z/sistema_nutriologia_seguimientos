import { obtenerRespuestaIA, isOpenAIConfigured, type PacienteContexto } from './openai-assistant'
import { buscarEnFAQ, requiereDerivacion } from '@/lib/knowledge-base'
import prisma from '@/lib/prisma'

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

    // PASO 2: Verificar si contiene palabras que requieren derivación automática
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

    // PASO 3: Buscar en FAQ
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

    // Obtener contexto del paciente
    const contexto = await obtenerContextoPaciente(pacienteId)

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
      respuesta: `Hola ${nombrePaciente.split(' ')[0]} 👋\n\nTengo problemas técnicos en este momento. El nutriólogo te responderá personalmente en breve.\n\nGracias por tu paciencia.`,
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

  // Verificar si tiene cita pendiente
  const citaPendiente = await prisma.cita.findFirst({
    where: {
      paciente_id: pacienteId,
      estado: 'PENDIENTE',
      fecha_hora: {
        gte: new Date(),
      },
    },
  })

  return !!citaPendiente
}

/**
 * Genera mensaje de derivación a humano
 */
function generarMensajeDerivacion(nombrePaciente: string, mensajeOriginal: string): string {
  const nombreCorto = nombrePaciente.split(' ')[0]
  const hora = new Date().getHours()

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

  return `${saludo} ${nombreCorto} 👋

Entiendo que tienes preguntas sobre ${temaDetectado}.

Para atención personalizada, puedes contactar directamente a:

📞 *Paul Cortez* (Nutriólogo)
Teléfono: *951 130 1554*

Él podrá darte la mejor orientación sobre tu caso específico.

Mientras tanto, si tienes preguntas sobre el consultorio (horarios, precios, ubicación), con gusto te ayudo. 🌿`
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
      createdAt: true,
    },
  })

  if (!paciente) {
    throw new Error('Paciente no encontrado')
  }

  // Buscar próxima cita
  const proximaCita = await prisma.cita.findFirst({
    where: {
      paciente_id: pacienteId,
      estado: 'PENDIENTE',
      fecha_hora: {
        gte: new Date(),
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
  })

  // Determinar si es paciente nuevo (menos de 2 consultas)
  const esPacienteNuevo = totalConsultas < 2

  return {
    nombre: paciente.nombre,
    tiene_cita_proxima: !!proximaCita,
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
