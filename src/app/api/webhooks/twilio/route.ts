import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { deleteCachePattern } from '@/lib/redis'
import twilio from 'twilio'
import { notificarConfirmacion } from '@/lib/services/notificaciones'
import { extraerDigitosTelefono } from '@/lib/utils/phone'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Webhook de Twilio para recibir mensajes entrantes de WhatsApp
 * POST /api/webhooks/twilio
 */
export async function POST(request: NextRequest) {
  try {
    // Obtener el cuerpo de la solicitud
    const formData = await request.formData()

    const messageSid = formData.get('MessageSid') as string
    const from = formData.get('From') as string // whatsapp:+521234567890
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const numMedia = parseInt((formData.get('NumMedia') as string) || '0')

    // Capturar archivos multimedia si existen
    let mediaUrl: string | null = null
    let mediaType: string | null = null

    if (numMedia > 0) {
      mediaUrl = formData.get('MediaUrl0') as string
      mediaType = formData.get('MediaContentType0') as string
    }

    // Validar campos requeridos
    if (!from || !messageSid) {
      console.error('❌ Missing required fields (From/MessageSid)')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('📥 Webhook received from Twilio:', {
      messageSid,
      from,
      to,
      body: body?.substring(0, 50) + '...',
      numMedia,
      mediaUrl,
      mediaType,
    })

    // Validar firma de Twilio (seguridad) - Deshabilitado en desarrollo con ngrok
    // ngrok modifica la URL y hace que la validación de firma falle
    // En producción, habilita esto para mayor seguridad
    const twilioSignature = request.headers.get('x-twilio-signature') || ''
    const validateSignature = process.env.NODE_ENV === 'production'

    if (validateSignature && twilioSignature) {
      const url = request.url
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN!,
        twilioSignature,
        url,
        Object.fromEntries(formData)
      )

      if (!isValid) {
        console.error('❌ Invalid Twilio signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    // Idempotencia: ignorar webhooks duplicados (Twilio reintenta en timeouts)
    const mensajeExistentePaciente = await prisma.mensajeWhatsApp.findFirst({
      where: { twilio_sid: messageSid },
    })
    const mensajeExistenteProspecto = await prisma.mensajeProspecto.findFirst({
      where: { twilio_sid: messageSid },
    })

    if (mensajeExistentePaciente || mensajeExistenteProspecto) {
      console.log('⏭️ Webhook duplicado ignorado (MessageSid ya existe):', messageSid)
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Extraer número de teléfono (remover prefijo whatsapp:)
    const phoneNumber = from.replace('whatsapp:', '')

    // Normalizar teléfono: extraer los 10 dígitos base para búsqueda flexible
    const digitos10 = extraerDigitosTelefono(phoneNumber)

    // Buscar paciente por número de teléfono en todos los formatos posibles
    const paciente = await prisma.paciente.findFirst({
      where: {
        OR: [
          { telefono: phoneNumber },           // Formato exacto de Twilio
          { telefono: `+521${digitos10}` },    // Formato normalizado (+521 + 10 dígitos)
          { telefono: digitos10 },             // Solo 10 dígitos
        ],
      },
    })

    // ========================================
    // MANEJO DE PROSPECTOS (números no registrados)
    // ========================================
    if (!paciente) {
      console.warn('⚠️  No patient found for phone:', phoneNumber)
      console.log('🆕 Procesando como prospecto...')

      // Validar que los prospectos solo puedan enviar texto
      if (numMedia > 0) {
        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Message>Por favor envía solo mensajes de texto. Para enviar archivos necesitas registrarte como paciente.

📋 Registrarte aquí: ${process.env.NEXT_PUBLIC_APP_URL}/agendar

¿Tienes alguna pregunta sobre el consultorio?</Message>
          </Response>`,
          {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
          }
        )
      }

      // Validar que haya contenido de texto
      if (!body || !body.trim()) {
        return new NextResponse(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Message>Hola! 👋

¿En qué puedo ayudarte?

Pregunta sobre:
📅 Horarios
💰 Precios
📍 Ubicación
💳 Formas de pago
📋 Cómo agendar</Message>
          </Response>`,
          {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
          }
        )
      }

      // Importar servicio de prospectos
      const { procesarMensajeProspecto, guardarLogRespuestaProspecto } = await import(
        '@/lib/services/prospecto-responder'
      )

      // Buscar o crear prospecto (upsert previene race condition en webhooks duplicados)
      const prospecto = await prisma.prospecto.upsert({
        where: { telefono: phoneNumber },
        update: { estado: 'ACTIVO' },
        create: {
          telefono: phoneNumber,
          total_mensajes: 0,
          estado: 'ACTIVO',
        },
      })
      console.log('✅ Prospecto encontrado/creado:', prospecto.id)

      // Guardar mensaje entrante del prospecto
      const mensajeEntranteProspecto = await prisma.mensajeProspecto.create({
        data: {
          prospecto_id: prospecto.id,
          direccion: 'ENTRANTE',
          contenido: body,
          twilio_sid: messageSid,
          estado: 'ENTREGADO',
        },
      })

      console.log('✅ Mensaje de prospecto guardado')

      // Procesar mensaje con sistema de prospectos
      const resultado = await procesarMensajeProspecto(body, phoneNumber)

      // Guardar log
      if (resultado.respuesta) {
        await guardarLogRespuestaProspecto(prospecto.id, body, resultado.respuesta, resultado)
      }

      // Guardar mensaje saliente si hay respuesta
      if (resultado.debe_responder_automaticamente && resultado.respuesta) {
        await prisma.mensajeProspecto.create({
          data: {
            prospecto_id: prospecto.id,
            direccion: 'SALIENTE',
            contenido: resultado.respuesta,
            estado: 'ENVIADO',
            leido: true,
          },
        })

        // El chatbot resolvió la consulta: marcar mensaje entrante como leído
        await prisma.mensajeProspecto.update({
          where: { id: mensajeEntranteProspecto.id },
          data: { leido: true },
        })

        // Invalidar caché para que el panel de mensajes se actualice
        await deleteCachePattern('messages:*')

        console.log('✅ Respuesta automática generada para prospecto:', {
          fuente: resultado.metadata?.fuente,
          confidence: resultado.metadata?.confidence,
          total_mensajes: resultado.metadata?.total_mensajes,
        })

        // Mostrar respuesta en consola
        console.log('\n📩 RESPUESTA ENVIADA AL PROSPECTO:')
        console.log('─'.repeat(60))
        console.log(resultado.respuesta)
        console.log('─'.repeat(60) + '\n')

        // Enviar respuesta
        const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
         <Response>
           <Message>${escapeXml(resultado.respuesta)}</Message>
         </Response>`

        return new NextResponse(twimlResponse, {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })
      }

      // Sin respuesta automática
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
         <Response></Response>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      )
    }

    // ========================================
    // CONTINÚA CON PROCESAMIENTO DE PACIENTES
    // ========================================

    // Guardar mensaje en la base de datos
    const mensaje = await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: paciente.id,
        direccion: 'ENTRANTE',
        contenido: body || (mediaUrl ? '[Archivo multimedia]' : ''),
        tipo: 'MANUAL',
        estado: 'ENTREGADO',
        twilio_sid: messageSid,
        leido: false,
        media_url: mediaUrl,
        media_type: mediaType,
      },
    })

    console.log('✅ Incoming message saved:', {
      id: mensaje.id,
      paciente: paciente.nombre,
      content: body.substring(0, 50) + '...',
    })

    // Invalidar caché de mensajes
    await deleteCachePattern(`messages:*`)

    // ========================================
    // DETECCIÓN DE RESPUESTAS A RECORDATORIOS
    // ========================================
    let respuestaAutomatica: string | null = null

    if (body && body.trim()) {
      const mensajeNormalizado = body.trim().toLowerCase()

      // Buscar la última cita pendiente del paciente
      const citaPendiente = await prisma.cita.findFirst({
        where: {
          paciente_id: paciente.id,
          estado: 'PENDIENTE',
          fecha_hora: {
            gte: new Date(), // Solo citas futuras
          },
        },
        orderBy: {
          fecha_hora: 'asc', // La más próxima
        },
      })

      if (citaPendiente) {
        // OPCIÓN 1: CONFIRMAR ASISTENCIA
        // Respuestas cortas exactas (respuesta directa al recordatorio)
        const esConfirmacionExacta =
          mensajeNormalizado === '1' ||
          mensajeNormalizado === 'si' ||
          mensajeNormalizado === 'sí' ||
          mensajeNormalizado === 'confirmo' ||
          mensajeNormalizado === 'confirmado' ||
          mensajeNormalizado === 'ok' ||
          mensajeNormalizado === 'dale' ||
          mensajeNormalizado === 'listo'
        // Mensajes más largos: buscar confirmación pero descartar si hay negación previa
        const esConfirmacionEnTexto =
          /\b(confirmo|confirmar)\b/.test(mensajeNormalizado) &&
          !/\bno\b\s[\s\S]*?\b(confirmo|confirmar)\b/.test(mensajeNormalizado)

        if (esConfirmacionExacta || esConfirmacionEnTexto) {
          await prisma.cita.update({
            where: { id: citaPendiente.id },
            data: {
              confirmada_por_paciente: true,
              fecha_confirmacion: new Date(),
              estado_confirmacion: 'CONFIRMADA',
            },
          })

          respuestaAutomatica = `✅ Confirmado

Gracias ${paciente.nombre.split(' ')[0]}, tu asistencia ha sido confirmada.

📅 ${new Date(citaPendiente.fecha_hora).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
🕐 ${new Date(citaPendiente.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}

Te esperamos! 🌟`

          console.log(`✅ Cita ${citaPendiente.id} confirmada por paciente`)

          // Notificar al nutriólogo sobre la confirmación
          notificarConfirmacion({
            id: citaPendiente.id,
            codigo_cita: citaPendiente.codigo_cita || '',
            fecha_hora: citaPendiente.fecha_hora,
            tipo_cita: citaPendiente.tipo_cita,
            motivo_consulta: citaPendiente.motivo_consulta,
            paciente: {
              nombre: paciente.nombre,
              telefono: paciente.telefono,
              email: paciente.email,
            },
          }).catch((err) => console.error('Error al notificar confirmación:', err))
        }
        // Nota: Cancelar y reagendar ahora se manejan a través de la IA
        // que proporciona el link directo: /cita/[codigo]
      }
    }

    // ========================================
    // PROCESAR CON IA (si no hay respuesta automática)
    // ========================================
    if (!respuestaAutomatica && body && body.trim()) {
      const { procesarMensajeEntrante, guardarLogRespuestaIA } = await import(
        '@/lib/services/whatsapp-responder'
      )

      console.log('🤖 Procesando mensaje con sistema de IA...')

      const resultado = await procesarMensajeEntrante(body, paciente.id, paciente.nombre)

      // Guardar log de la respuesta
      if (resultado.respuesta) {
        await guardarLogRespuestaIA(paciente.id, body, resultado.respuesta, resultado)
      }

      // Si debe responder automáticamente, usar esa respuesta
      if (resultado.debe_responder_automaticamente && resultado.respuesta) {
        respuestaAutomatica = resultado.respuesta

        console.log('✅ Respuesta automática generada:', {
          fuente: resultado.metadata?.fuente,
          confidence: resultado.metadata?.confidence,
          deriva_humano: resultado.debe_derivar_humano,
        })

        // Mostrar respuesta completa en consola (útil para sandbox)
        console.log('\n📩 RESPUESTA ENVIADA AL PACIENTE:')
        console.log('─'.repeat(60))
        console.log(resultado.respuesta)
        console.log('─'.repeat(60) + '\n')
      } else {
        console.log('ℹ️ Sin respuesta automática, requiere atención humana')
      }
    }

    // ========================================
    // GUARDAR Y ENVIAR RESPUESTA AUTOMÁTICA (si hay)
    // ========================================
    if (respuestaAutomatica) {
      // Guardar mensaje saliente en BD con estado PENDIENTE
      // El estado se actualizará cuando Twilio envíe status callbacks
      const mensajeSaliente = await prisma.mensajeWhatsApp.create({
        data: {
          paciente_id: paciente.id,
          direccion: 'SALIENTE',
          contenido: respuestaAutomatica,
          tipo: 'AUTOMATICO_RECORDATORIO',
          estado: 'PENDIENTE', // Se actualizará vía Status Callbacks
          leido: true,
        },
      })

      // Marcar el mensaje entrante como leído (ya fue procesado automáticamente)
      await prisma.mensajeWhatsApp.update({
        where: { id: mensaje.id },
        data: { leido: true },
      })

      console.log('✅ Mensaje entrante marcado como leído (respuesta automática enviada)')
      console.log('📤 Mensaje saliente guardado con estado PENDIENTE, ID:', mensajeSaliente.id)

      // Configurar StatusCallback URL para recibir actualizaciones de Twilio
      const statusCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/twilio/status`

      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
         <Response>
           <Message statusCallback="${statusCallbackUrl}">${escapeXml(respuestaAutomatica)}</Message>
         </Response>`

      return new NextResponse(twimlResponse, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      })
    }

    // Sin respuesta automática
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
         <Response></Response>`

    return new NextResponse(twimlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (error) {
    console.error('❌ Error processing webhook:', error)

    return NextResponse.json({ error: 'Error processing webhook' }, { status: 500 })
  }
}

/**
 * GET endpoint para verificar que el webhook está activo
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Twilio webhook is ready to receive messages',
  })
}
