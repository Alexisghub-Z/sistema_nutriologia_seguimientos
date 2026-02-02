/**
 * Servicio de Notificaciones al Nutriólogo
 * Envía alertas cuando un paciente cancela o reagenda una cita
 */

import { sendWhatsAppMessage } from './twilio'
import nodemailer from 'nodemailer'

/**
 * Configuración de notificaciones
 */
const NOTIFICACIONES_CONFIG = {
  // Número de WhatsApp del nutriólogo (configurar en .env)
  nutriologoWhatsApp: process.env.NUTRIOLOGO_WHATSAPP || '',
  // Email del nutriólogo (configurar en .env)
  nutriologoEmail: process.env.NUTRIOLOGO_EMAIL || '',
  // Habilitar notificaciones por WhatsApp
  whatsappEnabled: process.env.NOTIFICACIONES_WHATSAPP_ENABLED === 'true',
  // Habilitar notificaciones por Email
  emailEnabled: process.env.NOTIFICACIONES_EMAIL_ENABLED === 'true',
}

/**
 * Interfaz para datos de cita
 */
interface DatosCita {
  id: string
  codigo_cita: string
  fecha_hora: Date | string
  tipo_cita: string
  motivo_consulta?: string
  paciente: {
    nombre: string
    telefono: string
    email?: string | null
  }
}

/**
 * Notificar al nutriólogo sobre cancelación de cita
 */
export async function notificarCancelacion(cita: DatosCita): Promise<void> {
  const resultados: string[] = []

  try {
    const fecha = new Date(cita.fecha_hora).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const hora = new Date(cita.fecha_hora).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Notificación por WhatsApp
    if (NOTIFICACIONES_CONFIG.whatsappEnabled && NOTIFICACIONES_CONFIG.nutriologoWhatsApp) {
      try {
        const mensaje = `🚨 *CITA CANCELADA*

❌ El paciente *${cita.paciente.nombre}* ha cancelado su cita.

📅 Fecha: ${fecha}
🕐 Hora: ${hora}
📍 Modalidad: ${cita.tipo_cita}
📞 Contacto: ${cita.paciente.telefono}
${cita.motivo_consulta ? `📝 Motivo: ${cita.motivo_consulta}` : ''}

🔑 Código: ${cita.codigo_cita}`

        await sendWhatsAppMessage(NOTIFICACIONES_CONFIG.nutriologoWhatsApp, mensaje)
        resultados.push('WhatsApp enviado')
        console.log(`✅ Notificación de cancelación enviada por WhatsApp`)
      } catch (error) {
        console.error('❌ Error al enviar notificación por WhatsApp:', error)
        resultados.push('WhatsApp falló')
      }
    }

    // Notificación por Email
    if (NOTIFICACIONES_CONFIG.emailEnabled && NOTIFICACIONES_CONFIG.nutriologoEmail) {
      try {
        await enviarEmailCancelacion(cita, fecha, hora)
        resultados.push('Email enviado')
        console.log(`✅ Notificación de cancelación enviada por Email`)
      } catch (error) {
        console.error('❌ Error al enviar notificación por Email:', error)
        resultados.push('Email falló')
      }
    }

    if (resultados.length === 0) {
      console.log('⚠️ Notificaciones deshabilitadas (configurar en .env)')
    }
  } catch (error) {
    console.error('❌ Error en sistema de notificaciones:', error)
  }
}

/**
 * Notificar al nutriólogo sobre reagendamiento de cita
 */
export async function notificarReagendamiento(
  citaAnterior: DatosCita,
  citaNueva?: DatosCita
): Promise<void> {
  const resultados: string[] = []

  try {
    const fechaAnterior = new Date(citaAnterior.fecha_hora).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const horaAnterior = new Date(citaAnterior.fecha_hora).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })

    let fechaNueva = ''
    let horaNueva = ''
    if (citaNueva) {
      fechaNueva = new Date(citaNueva.fecha_hora).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
      horaNueva = new Date(citaNueva.fecha_hora).toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    // Notificación por WhatsApp
    if (NOTIFICACIONES_CONFIG.whatsappEnabled && NOTIFICACIONES_CONFIG.nutriologoWhatsApp) {
      try {
        let mensaje = `🔄 *CITA REAGENDADA*

👤 Paciente: *${citaAnterior.paciente.nombre}*
📞 Contacto: ${citaAnterior.paciente.telefono}

❌ Cita anterior cancelada:
📅 ${fechaAnterior}
🕐 ${horaAnterior}`

        if (citaNueva) {
          mensaje += `

✅ Nueva cita:
📅 ${fechaNueva}
🕐 ${horaNueva}
📍 ${citaNueva.tipo_cita}
🔑 Código: ${citaNueva.codigo_cita}`
        } else {
          mensaje += `

⚠️ El paciente canceló para reagendar.
Pendiente de nueva fecha.`
        }

        await sendWhatsAppMessage(NOTIFICACIONES_CONFIG.nutriologoWhatsApp, mensaje)
        resultados.push('WhatsApp enviado')
        console.log(`✅ Notificación de reagendamiento enviada por WhatsApp`)
      } catch (error) {
        console.error('❌ Error al enviar notificación por WhatsApp:', error)
        resultados.push('WhatsApp falló')
      }
    }

    // Notificación por Email
    if (NOTIFICACIONES_CONFIG.emailEnabled && NOTIFICACIONES_CONFIG.nutriologoEmail) {
      try {
        await enviarEmailReagendamiento(citaAnterior, citaNueva, fechaAnterior, horaAnterior)
        resultados.push('Email enviado')
        console.log(`✅ Notificación de reagendamiento enviada por Email`)
      } catch (error) {
        console.error('❌ Error al enviar notificación por Email:', error)
        resultados.push('Email falló')
      }
    }

    if (resultados.length === 0) {
      console.log('⚠️ Notificaciones deshabilitadas (configurar en .env)')
    }
  } catch (error) {
    console.error('❌ Error en sistema de notificaciones:', error)
  }
}

/**
 * Notificar al nutriólogo sobre confirmación de cita
 * (Opcional - solo si quieres notificar también las confirmaciones)
 */
export async function notificarConfirmacion(cita: DatosCita): Promise<void> {
  const resultados: string[] = []

  try {
    const fecha = new Date(cita.fecha_hora).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const hora = new Date(cita.fecha_hora).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })

    // Notificación por WhatsApp
    if (NOTIFICACIONES_CONFIG.whatsappEnabled && NOTIFICACIONES_CONFIG.nutriologoWhatsApp) {
      try {
        const mensaje = `✅ *CITA CONFIRMADA*

👤 *${cita.paciente.nombre}* confirmó su asistencia.

📅 ${fecha}
🕐 ${hora}
📍 ${cita.tipo_cita}
🔑 Código: ${cita.codigo_cita}`

        await sendWhatsAppMessage(NOTIFICACIONES_CONFIG.nutriologoWhatsApp, mensaje)
        resultados.push('WhatsApp enviado')
        console.log(`✅ Notificación de confirmación enviada por WhatsApp`)
      } catch (error) {
        console.error('❌ Error al enviar notificación por WhatsApp:', error)
      }
    }
  } catch (error) {
    console.error('❌ Error en sistema de notificaciones:', error)
  }
}

/**
 * Crear transporter de nodemailer (Gmail)
 */
function crearTransporterEmail() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    throw new Error('Credenciales de Gmail no configuradas en .env')
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  })
}

/**
 * Enviar email de cancelación
 */
async function enviarEmailCancelacion(
  cita: DatosCita,
  fecha: string,
  hora: string
): Promise<void> {
  const transporter = crearTransporterEmail()

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #555; }
    .footer { margin-top: 20px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🚨 Cita Cancelada</h2>
    </div>
    <div class="content">
      <p>El paciente <strong>${cita.paciente.nombre}</strong> ha cancelado su cita.</p>

      <div class="info-row">
        <span class="label">📅 Fecha:</span> ${fecha}
      </div>
      <div class="info-row">
        <span class="label">🕐 Hora:</span> ${hora}
      </div>
      <div class="info-row">
        <span class="label">📍 Modalidad:</span> ${cita.tipo_cita}
      </div>
      <div class="info-row">
        <span class="label">📞 Teléfono:</span> ${cita.paciente.telefono}
      </div>
      ${cita.paciente.email ? `<div class="info-row"><span class="label">📧 Email:</span> ${cita.paciente.email}</div>` : ''}
      ${cita.motivo_consulta ? `<div class="info-row"><span class="label">📝 Motivo:</span> ${cita.motivo_consulta}</div>` : ''}
      <div class="info-row">
        <span class="label">🔑 Código:</span> ${cita.codigo_cita}
      </div>

      <div class="footer">
        <p>Esta es una notificación automática del sistema de gestión de citas.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  await transporter.sendMail({
    from: `"Sistema de Citas" <${process.env.GMAIL_USER}>`,
    to: NOTIFICACIONES_CONFIG.nutriologoEmail,
    subject: `🚨 Cita Cancelada - ${cita.paciente.nombre} - ${fecha}`,
    html: htmlContent,
  })
}

/**
 * Enviar email de reagendamiento
 */
async function enviarEmailReagendamiento(
  citaAnterior: DatosCita,
  citaNueva: DatosCita | undefined,
  fechaAnterior: string,
  horaAnterior: string
): Promise<void> {
  const transporter = crearTransporterEmail()

  let nuevaCitaHtml = ''
  if (citaNueva) {
    const fechaNueva = new Date(citaNueva.fecha_hora).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const horaNueva = new Date(citaNueva.fecha_hora).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })

    nuevaCitaHtml = `
      <h3 style="color: #28a745;">✅ Nueva Cita</h3>
      <div class="info-row">
        <span class="label">📅 Fecha:</span> ${fechaNueva}
      </div>
      <div class="info-row">
        <span class="label">🕐 Hora:</span> ${horaNueva}
      </div>
      <div class="info-row">
        <span class="label">📍 Modalidad:</span> ${citaNueva.tipo_cita}
      </div>
      <div class="info-row">
        <span class="label">🔑 Código:</span> ${citaNueva.codigo_cita}
      </div>
    `
  } else {
    nuevaCitaHtml = `
      <p style="color: #ff9800; font-weight: bold;">⚠️ El paciente canceló para reagendar. Pendiente de nueva fecha.</p>
    `
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #555; }
    .footer { margin-top: 20px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🔄 Cita Reagendada</h2>
    </div>
    <div class="content">
      <p>El paciente <strong>${citaAnterior.paciente.nombre}</strong> ha reagendado su cita.</p>

      <h3 style="color: #dc3545;">❌ Cita Anterior (Cancelada)</h3>
      <div class="info-row">
        <span class="label">📅 Fecha:</span> ${fechaAnterior}
      </div>
      <div class="info-row">
        <span class="label">🕐 Hora:</span> ${horaAnterior}
      </div>

      <hr style="margin: 20px 0;">

      ${nuevaCitaHtml}

      <hr style="margin: 20px 0;">

      <div class="info-row">
        <span class="label">📞 Teléfono:</span> ${citaAnterior.paciente.telefono}
      </div>
      ${citaAnterior.paciente.email ? `<div class="info-row"><span class="label">📧 Email:</span> ${citaAnterior.paciente.email}</div>` : ''}

      <div class="footer">
        <p>Esta es una notificación automática del sistema de gestión de citas.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `

  await transporter.sendMail({
    from: `"Sistema de Citas" <${process.env.GMAIL_USER}>`,
    to: NOTIFICACIONES_CONFIG.nutriologoEmail,
    subject: `🔄 Cita Reagendada - ${citaAnterior.paciente.nombre}`,
    html: htmlContent,
  })
}
