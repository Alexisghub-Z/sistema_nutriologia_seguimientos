import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { deleteCachePattern } from '@/lib/redis'
import twilio from 'twilio'

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

    // Extraer número de teléfono (remover prefijo whatsapp:)
    const phoneNumber = from.replace('whatsapp:', '')

    // Buscar paciente por número de teléfono
    const paciente = await prisma.paciente.findFirst({
      where: {
        OR: [
          { telefono: phoneNumber },
          { telefono: phoneNumber.replace('+52', '') }, // Sin código de país
          { telefono: phoneNumber.replace('+', '') }, // Sin +
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

      // Buscar o crear prospecto
      let prospecto = await prisma.prospecto.findUnique({
        where: { telefono: phoneNumber },
      })

      if (!prospecto) {
        prospecto = await prisma.prospecto.create({
          data: {
            telefono: phoneNumber,
            total_mensajes: 0,
            estado: 'ACTIVO',
          },
        })
        console.log('✅ Nuevo prospecto creado:', prospecto.id)
      }

      // Guardar mensaje entrante del prospecto
      await prisma.mensajeProspecto.create({
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
          },
        })

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
           <Message>${resultado.respuesta}</Message>
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
        if (
          mensajeNormalizado === '1' ||
          mensajeNormalizado.includes('confirmar') ||
          mensajeNormalizado.includes('confirmo')
        ) {
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
        }

        // OPCIÓN 2: CANCELAR CITA
        else if (
          mensajeNormalizado === '2' ||
          mensajeNormalizado.includes('cancelar') ||
          mensajeNormalizado.includes('no puedo')
        ) {
          // Si ya había solicitado cancelar y responde "sí", cancelar definitivamente
          if (
            citaPendiente.solicitud_cancelacion &&
            (mensajeNormalizado === 'si' ||
              mensajeNormalizado === 'sí' ||
              mensajeNormalizado === 'yes')
          ) {
            await prisma.cita.update({
              where: { id: citaPendiente.id },
              data: {
                estado: 'CANCELADA',
                estado_confirmacion: 'CANCELADA_PACIENTE',
              },
            })

            const fechaCita = new Date(citaPendiente.fecha_hora).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })
            const horaCita = new Date(citaPendiente.fecha_hora).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })

            respuestaAutomatica = `❌ Cita cancelada

Hola ${paciente.nombre.split(' ')[0]}, tu cita del ${fechaCita} a las ${horaCita} ha sido cancelada.

🔑 Código: ${citaPendiente.codigo_cita}

Si deseas agendar una nueva cita, visita:
${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}

¡Gracias!`

            console.log(`❌ Cita ${citaPendiente.id} cancelada por paciente`)
          }
          // Primera vez que solicita cancelar, pedir confirmación
          else {
            await prisma.cita.update({
              where: { id: citaPendiente.id },
              data: {
                solicitud_cancelacion: true,
              },
            })

            const fechaCita = new Date(citaPendiente.fecha_hora).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })
            const horaCita = new Date(citaPendiente.fecha_hora).toLocaleTimeString('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
            })

            respuestaAutomatica = `❓ Confirmación de cancelación

Hola ${paciente.nombre.split(' ')[0]}, ¿estás seguro que deseas cancelar tu cita?

📅 ${fechaCita}
🕐 ${horaCita}

Responde *SÍ* para confirmar la cancelación.

Si necesitas reagendar, usa tu código ${citaPendiente.codigo_cita} en:
${process.env.NEXT_PUBLIC_APP_URL}/cita/${citaPendiente.codigo_cita}`

            console.log(`⚠️ Solicitud de cancelación pendiente de confirmación`)
          }
        }
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
    // ENVIAR RESPUESTA AUTOMÁTICA (si hay)
    // ========================================
    const twimlResponse = respuestaAutomatica
      ? `<?xml version="1.0" encoding="UTF-8"?>
         <Response>
           <Message>${respuestaAutomatica}</Message>
         </Response>`
      : `<?xml version="1.0" encoding="UTF-8"?>
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
