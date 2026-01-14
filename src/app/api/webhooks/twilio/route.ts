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
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')

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
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 403 }
        )
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

    if (!paciente) {
      console.warn('⚠️  No patient found for phone:', phoneNumber)

      // Responder al usuario que no está registrado
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Lo siento, no encontramos tu registro como paciente. Por favor contacta al consultorio.</Message>
        </Response>`,
        {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        }
      )
    }

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
        if (mensajeNormalizado === '1' || mensajeNormalizado.includes('confirmar') || mensajeNormalizado.includes('confirmo')) {
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
        else if (mensajeNormalizado === '2' || mensajeNormalizado.includes('cancelar') || mensajeNormalizado.includes('no puedo')) {
          // Si ya había solicitado cancelar y responde "sí", cancelar definitivamente
          if (citaPendiente.solicitud_cancelacion && (mensajeNormalizado === 'si' || mensajeNormalizado === 'sí' || mensajeNormalizado === 'yes')) {
            await prisma.cita.update({
              where: { id: citaPendiente.id },
              data: {
                estado: 'CANCELADA',
                estado_confirmacion: 'CANCELADA_PACIENTE',
              },
            })

            const fechaCita = new Date(citaPendiente.fecha_hora).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
            const horaCita = new Date(citaPendiente.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

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

            const fechaCita = new Date(citaPendiente.fecha_hora).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
            const horaCita = new Date(citaPendiente.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

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

    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    )
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
