// Script para verificar el estado de un mensaje en Twilio
const twilio = require('twilio')

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN

if (!accountSid || !authToken) {
  console.error('❌ Error: TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN deben estar configurados en .env')
  process.exit(1)
}

const client = twilio(accountSid, authToken)

async function verificarMensaje(messageSid) {
  try {
    const message = await client.messages(messageSid).fetch()

    console.log('\n📱 Estado del Mensaje en Twilio:\n')
    console.log(`SID: ${message.sid}`)
    console.log(`Estado: ${message.status}`)
    console.log(`De: ${message.from}`)
    console.log(`Para: ${message.to}`)
    console.log(`Fecha: ${message.dateCreated}`)
    console.log(`Precio: ${message.price} ${message.priceUnit}`)

    if (message.errorCode) {
      console.log(`\n❌ Error Code: ${message.errorCode}`)
      console.log(`💥 Error Message: ${message.errorMessage}`)
    }

    console.log('\n📊 Estados posibles:')
    console.log('  - queued: En cola para envío')
    console.log('  - sending: Enviando')
    console.log('  - sent: Enviado a WhatsApp')
    console.log('  - delivered: Entregado al usuario')
    console.log('  - undelivered: No entregado')
    console.log('  - failed: Falló el envío\n')

    if (message.status === 'failed' || message.status === 'undelivered') {
      console.log('\n⚠️  SOLUCIÓN:')
      console.log('1. Ve a https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn')
      console.log('2. Busca el código de unión (ej: "join <palabra>")')
      console.log('3. Envía ese código desde tu WhatsApp (+5219515886761) al número +14155238886')
      console.log('4. Espera confirmación de Twilio')
      console.log('5. Vuelve a crear una cita para probar\n')
    }
  } catch (error) {
    console.error('Error al verificar mensaje:', error.message)
  }
}

// Usar el SID del argumento o el último mensaje conocido
const messageSid = process.argv[2] || 'SMcec646728d371ba4f8e6c3b0302d5868'
verificarMensaje(messageSid)
