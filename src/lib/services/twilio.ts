import twilio from 'twilio'

/**
 * Servicio de integración con Twilio para envío de WhatsApp
 */

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER

// Verificar que las credenciales estén configuradas
if (!accountSid || !authToken || !twilioNumber) {
  console.warn('⚠️  Twilio credentials not configured. WhatsApp messages will not be sent.')
}

// Cliente de Twilio
let twilioClient: ReturnType<typeof twilio> | null = null

/**
 * Obtiene o crea el cliente de Twilio
 */
function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured')
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken)
  }

  return twilioClient
}

/**
 * Formatea un número de teléfono al formato de WhatsApp de Twilio
 *
 * NOTA: El número debe venir ya normalizado desde la BD (+5219515886761)
 * Esta función solo agrega el prefijo 'whatsapp:' si no lo tiene
 */
export function formatWhatsAppNumber(phoneNumber: string): string {
  // Si ya tiene el prefijo whatsapp:, retornarlo tal cual
  if (phoneNumber.startsWith('whatsapp:')) {
    return phoneNumber
  }

  // El número debe venir ya normalizado (+5219515886761)
  // Solo agregar el prefijo whatsapp:
  return 'whatsapp:' + phoneNumber
}

/**
 * Envía un mensaje de WhatsApp a través de Twilio
 *
 * @param to - Número de teléfono del destinatario
 * @param body - Contenido del mensaje (para sandbox)
 * @param contentSid - ID de plantilla aprobada (para producción)
 * @param contentVariables - Variables de la plantilla (para producción, JSON string)
 * @returns Información del mensaje enviado
 */
export async function sendWhatsAppMessage(
  to: string,
  body: string,
  contentSid?: string,
  contentVariables?: string
) {
  try {
    const client = getTwilioClient()

    if (!twilioNumber) {
      throw new Error('TWILIO_WHATSAPP_NUMBER not configured')
    }

    // Formatear número de destino
    const formattedTo = formatWhatsAppNumber(to)

    // Determinar modo de envío
    const usarPlantillaAprobada = !!contentSid

    if (usarPlantillaAprobada) {
      console.log('📤 Sending WhatsApp message (Approved Template):', {
        from: twilioNumber,
        to: formattedTo,
        contentSid,
      })
    } else {
      console.log('📤 Sending WhatsApp message (Sandbox):', {
        from: twilioNumber,
        to: formattedTo,
        body: body.substring(0, 50) + '...',
      })
    }

    // Crear mensaje según el modo
    const messageParams: any = {
      from: twilioNumber,
      to: formattedTo,
    }

    if (usarPlantillaAprobada) {
      // Modo producción: Usar plantilla aprobada
      messageParams.contentSid = contentSid
      if (contentVariables) {
        messageParams.contentVariables = contentVariables
      }
    } else {
      // Modo sandbox: Usar texto libre
      messageParams.body = body
    }

    const message = await client.messages.create(messageParams)

    console.log('✅ WhatsApp message sent successfully:', {
      sid: message.sid,
      status: message.status,
      to: formattedTo,
      mode: usarPlantillaAprobada ? 'production' : 'sandbox',
    })

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
      to: formattedTo,
      dateCreated: message.dateCreated,
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error)

    // Extraer mensaje de error de Twilio
    let errorMessage = 'Error al enviar mensaje de WhatsApp'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    throw new Error(errorMessage)
  }
}

/**
 * Verifica si Twilio está configurado correctamente
 */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && twilioNumber)
}

/**
 * Verifica la configuración de Twilio y retorna el estado
 */
export async function checkTwilioStatus() {
  try {
    if (!isTwilioConfigured()) {
      return {
        configured: false,
        error: 'Twilio credentials not configured',
      }
    }

    const client = getTwilioClient()

    // Verificar que las credenciales sean válidas
    const account = await client.api.accounts(accountSid!).fetch()

    return {
      configured: true,
      accountSid: accountSid,
      accountStatus: account.status,
      friendlyName: account.friendlyName,
    }
  } catch (error) {
    console.error('Error checking Twilio status:', error)
    return {
      configured: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Obtiene el estado de un mensaje enviado
 */
export async function getMessageStatus(messageSid: string) {
  try {
    const client = getTwilioClient()
    const message = await client.messages(messageSid).fetch()

    return {
      sid: message.sid,
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      dateCreated: message.dateCreated,
      dateUpdated: message.dateUpdated,
      dateSent: message.dateSent,
    }
  } catch (error) {
    console.error('Error fetching message status:', error)
    throw error
  }
}
