import { obtenerRespuestaIA, isOpenAIConfigured } from './openai-assistant'
import { buscarEnFAQ, requiereDerivacion, KNOWLEDGE_BASE } from '@/lib/knowledge-base'
import prisma from '@/lib/prisma'

/**
 * Límites para prospectos
 */
const LIMITES_PROSPECTO = {
  MAX_MENSAJES_POR_DIA: 20,
  MAX_MENSAJES_TOTAL: 70,
  RECORDATORIO_REGISTRAR_CADA: 4,
  MAX_CONSULTAS_IA_POR_DIA: 10,
  TIEMPO_EXPIRACION_DIAS: 30,
}

/**
 * Resultado del procesamiento de un mensaje de prospecto
 */
export interface ResultadoProcesamientoProspecto {
  respuesta: string | null
  debe_responder_automaticamente: boolean
  razon: string
  metadata?: {
    fuente: 'faq' | 'ia' | 'sistema'
    confidence?: number
    tokens_usados?: number
    es_prospecto: boolean
    total_mensajes?: number
    debe_recordar_registro?: boolean
  }
}

/**
 * Procesa un mensaje entrante de un prospecto (número no registrado)
 */
export async function procesarMensajeProspecto(
  mensajeTelefono: string,
  numeroWhatsApp: string
): Promise<ResultadoProcesamientoProspecto> {
  try {
    console.log('🆕 Procesando mensaje de prospecto:', {
      telefono: numeroWhatsApp,
      mensaje: mensajeTelefono.substring(0, 50) + '...',
    })

    // PASO 1: Buscar o crear prospecto (upsert previene race condition)
    const prospecto = await prisma.prospecto.upsert({
      where: { telefono: numeroWhatsApp },
      update: { estado: 'ACTIVO' },
      create: {
        telefono: numeroWhatsApp,
        total_mensajes: 0,
        estado: 'ACTIVO',
      },
    })

    if (prospecto.total_mensajes === 0) {
      console.log('✅ Nuevo prospecto creado:', prospecto.id)
    }

    // PASO 2: Validar estado del prospecto
    if (prospecto.estado === 'BLOQUEADO') {
      return {
        respuesta: 'Lo sentimos, no podemos procesar tu solicitud en este momento.',
        debe_responder_automaticamente: true,
        razon: 'Prospecto bloqueado',
        metadata: {
          fuente: 'sistema',
          es_prospecto: true,
        },
      }
    }

    if (prospecto.estado === 'REGISTRADO') {
      return {
        respuesta: `Hola! 👋

Veo que ya te registraste como paciente en nuestro sistema.

Usa este mismo número de WhatsApp para comunicarte y recibirás atención completa como paciente registrado.

¿En qué puedo ayudarte?`,
        debe_responder_automaticamente: true,
        razon: 'Prospecto ya registrado',
        metadata: {
          fuente: 'sistema',
          es_prospecto: true,
        },
      }
    }

    // PASO 3: Verificar límites
    const limitesValidacion = await validarLimitesProspecto(prospecto.id)

    if (!limitesValidacion.puede_continuar) {
      return {
        respuesta: limitesValidacion.mensaje_limite || null,
        debe_responder_automaticamente: true,
        razon: limitesValidacion.razon || 'Límite alcanzado',
        metadata: {
          fuente: 'sistema',
          es_prospecto: true,
        },
      }
    }

    // PASO 4: Actualizar contador de mensajes (increment atómico previene race condition)
    const prospectoActualizado = await prisma.prospecto.update({
      where: { id: prospecto.id },
      data: {
        ultimo_contacto: new Date(),
        total_mensajes: { increment: 1 },
      },
    })
    const totalMensajes = prospectoActualizado.total_mensajes

    // PASO 5: Verificar si debe recordar registrarse
    const debeRecordarRegistro = totalMensajes % LIMITES_PROSPECTO.RECORDATORIO_REGISTRAR_CADA === 0

    // PASO 6: Buscar en FAQ (tiene prioridad sobre derivación por palabras clave)
    const respuestaFAQ = buscarEnFAQ(mensajeTelefono)
    if (respuestaFAQ) {
      console.log('✅ Respuesta encontrada en FAQ para prospecto')

      const respuestaFinal = debeRecordarRegistro
        ? agregarRecordatorioRegistro(respuestaFAQ)
        : respuestaFAQ

      return {
        respuesta: respuestaFinal,
        debe_responder_automaticamente: true,
        razon: 'Encontrada respuesta exacta en FAQ',
        metadata: {
          fuente: 'faq',
          confidence: 1.0,
          es_prospecto: true,
          total_mensajes: totalMensajes,
          debe_recordar_registro: debeRecordarRegistro,
        },
      }
    }

    // PASO 7: Verificar si requiere derivación nutricional
    if (requiereDerivacion(mensajeTelefono)) {
      const respuesta = generarMensajeDerivacionProspecto(mensajeTelefono)

      return {
        respuesta,
        debe_responder_automaticamente: true,
        razon: 'Detectadas palabras clave nutricionales - deriva a consulta',
        metadata: {
          fuente: 'sistema',
          es_prospecto: true,
          total_mensajes: totalMensajes,
          debe_recordar_registro: true, // Siempre recordar en derivaciones
        },
      }
    }

    // PASO 8: Usar IA si está configurada
    if (!isOpenAIConfigured()) {
      console.log('⚠️ IA no configurada, enviando mensaje genérico')

      return {
        respuesta: generarMensajeSinIA(),
        debe_responder_automaticamente: true,
        razon: 'IA no configurada',
        metadata: {
          fuente: 'sistema',
          es_prospecto: true,
          total_mensajes: totalMensajes,
        },
      }
    }

    // Obtener historial reciente de conversación (máximo 5 mensajes)
    const historial = await obtenerHistorialProspecto(prospecto.id)

    // Consultar a la IA (sin contexto de paciente, es prospecto)
    const respuestaIA = await obtenerRespuestaIA(mensajeTelefono, undefined, historial)

    // Verificar umbral de confianza (más estricto para prospectos)
    const umbralConfianza = 0.8 // Más alto que para pacientes (0.7)

    if (respuestaIA.confidence < umbralConfianza) {
      console.log(
        `⚠️ Confianza baja para prospecto (${respuestaIA.confidence}), enviando derivación`
      )

      const respuesta = generarMensajeSinIA()

      return {
        respuesta,
        debe_responder_automaticamente: true,
        razon: `Confianza de IA baja: ${respuestaIA.confidence}`,
        metadata: {
          fuente: 'ia',
          confidence: respuestaIA.confidence,
          tokens_usados: respuestaIA.tokens_usados,
          es_prospecto: true,
          total_mensajes: totalMensajes,
        },
      }
    }

    // Respuesta de IA con recordatorio si corresponde
    let respuestaFinal = respuestaIA.mensaje

    if (debeRecordarRegistro) {
      respuestaFinal = agregarRecordatorioRegistro(respuestaIA.mensaje)
    }

    console.log('🤖 Respuesta automática de IA para prospecto')

    return {
      respuesta: respuestaFinal,
      debe_responder_automaticamente: true,
      razon: 'Respuesta generada por IA con confianza alta',
      metadata: {
        fuente: 'ia',
        confidence: respuestaIA.confidence,
        tokens_usados: respuestaIA.tokens_usados,
        es_prospecto: true,
        total_mensajes: totalMensajes,
        debe_recordar_registro: debeRecordarRegistro,
      },
    }
  } catch (error) {
    console.error('❌ Error procesando mensaje de prospecto:', error)

    return {
      respuesta: `Hola! 👋

Tengo problemas técnicos en este momento.

Si necesitas información sobre el consultorio, puedes:
📧 Email: paul_nutricion@hotmail.com
🌐 Web: ${KNOWLEDGE_BASE.urls.sitio_web}

Disculpa las molestias.`,
      debe_responder_automaticamente: true,
      razon: `Error en procesamiento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
      metadata: {
        fuente: 'sistema',
        es_prospecto: true,
      },
    }
  }
}

/**
 * Valida los límites de uso de un prospecto
 */
async function validarLimitesProspecto(
  prospectoId: string
): Promise<{ puede_continuar: boolean; mensaje_limite?: string; razon?: string }> {
  // Obtener prospecto actual
  const prospecto = await prisma.prospecto.findUnique({
    where: { id: prospectoId },
    select: {
      total_mensajes: true,
      ultimo_contacto: true,
    },
  })

  if (!prospecto) {
    return { puede_continuar: false, razon: 'Prospecto no encontrado' }
  }

  // Verificar límite total de mensajes
  if (prospecto.total_mensajes >= LIMITES_PROSPECTO.MAX_MENSAJES_TOTAL) {
    return {
      puede_continuar: false,
      mensaje_limite: `Has alcanzado el límite de mensajes disponibles.

Para continuar recibiendo atención personalizada, te invitamos a registrarte como paciente:

📋 Registrarse: ${KNOWLEDGE_BASE.urls.agendar}

O contáctanos directamente:
📧 paul_nutricion@hotmail.com
📱 paul.alavez@redosmo.com

¡Gracias por tu interés!`,
      razon: 'Límite total de mensajes alcanzado (70)',
    }
  }

  // Verificar límite de mensajes por día
  const haceUnDia = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const mensajesHoy = await prisma.mensajeProspecto.count({
    where: {
      prospecto_id: prospectoId,
      createdAt: {
        gte: haceUnDia,
      },
    },
  })

  if (mensajesHoy >= LIMITES_PROSPECTO.MAX_MENSAJES_POR_DIA) {
    return {
      puede_continuar: false,
      mensaje_limite: `Has alcanzado el límite de mensajes por hoy (20 mensajes).

Puedes volver a escribir mañana, o si necesitas información urgente:

📋 Registrarte: ${KNOWLEDGE_BASE.urls.agendar}
📧 Email: paul_nutricion@hotmail.com

¡Gracias por tu paciencia!`,
      razon: 'Límite diario de mensajes alcanzado (20)',
    }
  }

  return { puede_continuar: true }
}

/**
 * Obtiene el historial reciente de conversación de un prospecto
 */
async function obtenerHistorialProspecto(
  prospectoId: string,
  limite: number = 10
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const mensajes = await prisma.mensajeProspecto.findMany({
    where: {
      prospecto_id: prospectoId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limite,
    select: {
      direccion: true,
      contenido: true,
    },
  })

  // Convertir a formato de OpenAI (invertir orden)
  return mensajes
    .reverse()
    .map((msg) => ({
      role: msg.direccion === 'ENTRANTE' ? ('user' as const) : ('assistant' as const),
      content: msg.contenido,
    }))
    .slice(0, -1) // Excluir el último mensaje (es el actual)
}

/**
 * Genera mensaje de derivación para preguntas nutricionales de prospectos
 */
function generarMensajeDerivacionProspecto(mensajeOriginal: string): string {
  const hora = new Date().getHours()

  let saludo = 'Hola'
  if (hora >= 5 && hora < 12) saludo = 'Buenos días'
  else if (hora >= 12 && hora < 19) saludo = 'Buenas tardes'
  else saludo = 'Buenas noches'

  // Detectar el tema
  const temas: { [key: string]: string } = {
    'plan|dieta|alimentación|comer|puedo comer': 'tu plan nutricional',
    'peso|kilos|adelgazar|bajar|subir': 'tu objetivo de peso',
    'síntoma|dolor|enfermedad|salud': 'tu salud',
  }

  let temaDetectado = 'nutrición personalizada'
  for (const [patron, tema] of Object.entries(temas)) {
    const regex = new RegExp(patron, 'i')
    if (regex.test(mensajeOriginal)) {
      temaDetectado = tema
      break
    }
  }

  return `${saludo}! 👋

Para darte una respuesta precisa sobre ${temaDetectado}, necesitas una consulta nutricional profesional.

El ${KNOWLEDGE_BASE.nutriologo.nombre_completo} evaluará tu caso específico y te dará un plan personalizado adaptado a tus objetivos y estilo de vida.

📋 Agendar consulta:
${KNOWLEDGE_BASE.urls.agendar}

💰 Costos:
🥗 Primera consulta: $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio} ${KNOWLEDGE_BASE.servicios.consulta_nutricional.moneda}
🔄 Seguimiento: $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio_seguimiento} ${KNOWLEDGE_BASE.servicios.consulta_nutricional.moneda}
✅ Incluye:
- Evaluación completa
- Plan personalizado
- Seguimiento continuo

¿Te gustaría conocer más sobre el consultorio (horarios, ubicación, modalidades)?`
}

/**
 * Genera mensaje cuando la IA no está disponible
 */
function generarMensajeSinIA(): string {
  return `Hola! 👋

Gracias por contactarnos.

Para brindarte la mejor atención, te invitamos a:

📋 Agendar tu consulta:
${KNOWLEDGE_BASE.urls.agendar}

Información básica:
💰 Primera consulta: $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio} ${KNOWLEDGE_BASE.servicios.consulta_nutricional.moneda}
💰 Seguimiento: $${KNOWLEDGE_BASE.servicios.consulta_nutricional.precio_seguimiento} ${KNOWLEDGE_BASE.servicios.consulta_nutricional.moneda}
📅 Horarios:
   • Lunes a Viernes: 4 PM - 8 PM
   • Sábados: 8 AM - 7 PM
📍 Ubicación: Oaxaca de Juárez, Oaxaca
💻 Modalidades: Presencial y En línea

📧 Email: paul_nutricion@hotmail.com

¿Tienes alguna pregunta específica sobre horarios, precios o servicios?`
}

/**
 * Agrega recordatorio de registro al final de un mensaje
 */
function agregarRecordatorioRegistro(mensajeOriginal: string): string {
  return `${mensajeOriginal}

---

💡 **¿Listo para agendar tu consulta?**

Regístrate aquí en 2 minutos y elige tu horario:
📋 ${KNOWLEDGE_BASE.urls.agendar}

Una vez registrado podrás:
✅ Agendar y reagendar citas
✅ Recibir recordatorios automáticos
✅ Acceder a tu historial
✅ Confirmar/cancelar por WhatsApp`
}

/**
 * Guarda el log de respuesta automática para prospecto
 */
export async function guardarLogRespuestaProspecto(
  prospectoId: string,
  _mensajeEntrante: string,
  _respuestaGenerada: string,
  resultado: ResultadoProcesamientoProspecto
): Promise<void> {
  try {
    console.log('📊 Log de respuesta prospecto:', {
      prospecto_id: prospectoId,
      fuente: resultado.metadata?.fuente,
      confidence: resultado.metadata?.confidence,
      tokens: resultado.metadata?.tokens_usados,
      total_mensajes: resultado.metadata?.total_mensajes,
      recordatorio_registro: resultado.metadata?.debe_recordar_registro,
      razon: resultado.razon,
    })

    // Aquí podrías guardar métricas adicionales si quieres
    // Por ejemplo, tracking de conversión prospecto -> paciente
  } catch (error) {
    console.error('Error guardando log de prospecto:', error)
  }
}

/**
 * Convierte un prospecto en paciente
 */
export async function convertirProspectoEnPaciente(
  prospectoId: string,
  pacienteId: string
): Promise<void> {
  await prisma.prospecto.update({
    where: { id: prospectoId },
    data: {
      estado: 'REGISTRADO',
      convertido_a_paciente_id: pacienteId,
      fecha_conversion: new Date(),
    },
  })

  console.log(`✅ Prospecto ${prospectoId} convertido en paciente ${pacienteId}`)
}
