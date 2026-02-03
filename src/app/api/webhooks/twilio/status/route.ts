import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { deleteCachePattern } from '@/lib/redis'
import twilio from 'twilio'

/**
 * Webhook de Twilio Status Callbacks
 * Recibe actualizaciones del estado de mensajes enviados
 * POST /api/webhooks/twilio/status
 *
 * Estados de Twilio:
 * - queued: Mensaje en cola
 * - sending: Enviando (transición)
 * - sent: Enviado a Twilio
 * - delivered: Entregado al destinatario
 * - read: Leído por el destinatario (solo WhatsApp)
 * - failed: Falló
 * - undelivered: No se pudo entregar
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const messageSid = formData.get('MessageSid') as string
    const messageStatus = formData.get('MessageStatus') as string // queued, sent, delivered, read, failed, undelivered
    const errorCode = formData.get('ErrorCode') as string | null
    const errorMessage = formData.get('ErrorMessage') as string | null

    // Validar firma de Twilio en producción (obligatoria)
    if (process.env.NODE_ENV === 'production') {
      const twilioSignature = request.headers.get('x-twilio-signature') || ''

      if (!twilioSignature) {
        console.error('❌ Missing Twilio signature on status callback')
        return NextResponse.json({ error: 'Missing signature' }, { status: 403 })
      }

      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN!,
        twilioSignature,
        request.url,
        Object.fromEntries(formData)
      )
      if (!isValid) {
        console.error('❌ Invalid Twilio signature on status callback')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
      }
    }

    console.log('📊 Status Callback received:', {
      messageSid,
      messageStatus,
      errorCode,
      errorMessage,
    })

    if (!messageSid || !messageStatus) {
      console.error('❌ Missing required fields in status callback')
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Mapear estado de Twilio a nuestro enum
    const estadoMap: Record<string, string> = {
      queued: 'EN_COLA',
      sending: 'EN_COLA', // Estado transitorio
      sent: 'ENVIADO',
      delivered: 'ENTREGADO',
      read: 'LEIDO',
      failed: 'FALLIDO',
      undelivered: 'NO_ENTREGADO',
    }

    const nuevoEstado = estadoMap[messageStatus.toLowerCase()]

    if (!nuevoEstado) {
      console.warn('⚠️  Unknown message status:', messageStatus)
      return NextResponse.json({ status: 'ok' })
    }

    // Buscar mensaje en ambas tablas (pacientes y prospectos)
    const mensajePaciente = await prisma.mensajeWhatsApp.findFirst({
      where: { twilio_sid: messageSid },
    })

    const mensajeProspecto = await prisma.mensajeProspecto.findFirst({
      where: { twilio_sid: messageSid },
    })

    if (mensajePaciente) {
      // Actualizar estado del mensaje de paciente
      await prisma.mensajeWhatsApp.update({
        where: { id: mensajePaciente.id },
        data: {
          estado: nuevoEstado as any,
        },
      })

      console.log(`✅ Mensaje de paciente actualizado: ${messageSid} → ${nuevoEstado}`)

      // Invalidar caché
      await deleteCachePattern(`messages:*`)
    } else if (mensajeProspecto) {
      // Actualizar estado del mensaje de prospecto
      await prisma.mensajeProspecto.update({
        where: { id: mensajeProspecto.id },
        data: {
          estado: nuevoEstado as any,
        },
      })

      console.log(`✅ Mensaje de prospecto actualizado: ${messageSid} → ${nuevoEstado}`)

      // Invalidar caché
      await deleteCachePattern(`messages:*`)
    } else {
      console.warn('⚠️  Mensaje no encontrado en BD:', messageSid)
      // No es un error crítico, algunos mensajes pueden no estar guardados (ej: respuestas manuales antiguas)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ Error processing status callback:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * GET endpoint para verificar que el webhook está activo
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Twilio Status Callback webhook is ready',
  })
}
