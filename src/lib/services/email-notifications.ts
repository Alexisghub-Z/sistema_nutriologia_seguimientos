/**
 * Servicio de notificaciones por email
 * Usa NodeMailer con Gmail para enviar notificaciones al nutriólogo
 */

import nodemailer from 'nodemailer'

// Configuración del transporter de Gmail
const getEmailTransporter = () => {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD

  if (!user || !pass) {
    console.warn('⚠️  Variables de entorno GMAIL_USER o GMAIL_APP_PASSWORD no configuradas')
    return null
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
 * Envía notificación al nutriólogo cuando se crea una nueva cita
 */
export async function notificarNuevaCita(data: {
  pacienteNombre: string
  pacienteEmail: string
  pacienteTelefono: string
  fechaCita: Date
  horaCita: string
  motivoConsulta: string
  tipoCita: string
  codigoCita: string
  totalCitas: number
}) {
  try {
    const transporter = getEmailTransporter()

    if (!transporter) {
      console.log('⚠️  Email no configurado, saltando notificación')
      return { success: false, reason: 'not_configured' }
    }

    const nutriologoEmail = process.env.NUTRIOLOGO_EMAIL

    if (!nutriologoEmail) {
      console.warn('⚠️  Variable NUTRIOLOGO_EMAIL no configurada')
      return { success: false, reason: 'no_recipient' }
    }

    // Formatear fecha
    const fechaFormateada = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(data.fechaCita)

    // Determinar si es paciente nuevo o recurrente
    const tipoPaciente = data.totalCitas === 1 ? '🆕 PACIENTE NUEVO' : `🔄 PACIENTE RECURRENTE (Cita #${data.totalCitas})`

    // Icono según modalidad
    const iconoModalidad = data.tipoCita === 'PRESENCIAL' ? '🏥' : '💻'

    const mailOptions = {
      from: `"Sistema de Citas" <${process.env.GMAIL_USER}>`,
      to: nutriologoEmail,
      subject: `🔔 Nueva Cita Agendada - ${data.pacienteNombre}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2d9f5d 0%, #25804d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #2d9f5d; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .label { font-weight: bold; color: #2d9f5d; margin-top: 10px; display: block; }
            .value { color: #333; margin-top: 5px; }
            .badge { display: inline-block; background: #2d9f5d; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 10px; }
            .badge.nuevo { background: #f59e0b; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .codigo { background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 18px; font-weight: bold; text-align: center; margin: 10px 0; color: #2d9f5d; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Nueva Cita Agendada</h1>
            </div>

            <div class="content">
              <div class="card">
                <span class="badge ${data.totalCitas === 1 ? 'nuevo' : ''}">${tipoPaciente}</span>

                <span class="label">👤 Paciente:</span>
                <span class="value">${data.pacienteNombre}</span>

                <span class="label">📧 Email:</span>
                <span class="value">${data.pacienteEmail}</span>

                <span class="label">📱 Teléfono:</span>
                <span class="value">${data.pacienteTelefono}</span>
              </div>

              <div class="card">
                <span class="label">📅 Fecha:</span>
                <span class="value">${fechaFormateada}</span>

                <span class="label">🕐 Hora:</span>
                <span class="value">${data.horaCita}</span>

                <span class="label">${iconoModalidad} Modalidad:</span>
                <span class="value">${data.tipoCita === 'PRESENCIAL' ? 'Presencial' : 'En línea'}</span>
              </div>

              <div class="card">
                <span class="label">📋 Motivo de Consulta:</span>
                <span class="value">${data.motivoConsulta}</span>
              </div>

              <div class="card">
                <span class="label">🔑 Código de Cita:</span>
                <div class="codigo">${data.codigoCita}</div>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                  El paciente puede consultar su cita en cualquier momento usando este código.
                </p>
              </div>
            </div>

            <div class="footer">
              <p>Este es un mensaje automático del sistema de citas.</p>
              <p>La cita también ha sido agregada a tu Google Calendar.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
🔔 NUEVA CITA AGENDADA

${tipoPaciente}

👤 INFORMACIÓN DEL PACIENTE:
• Nombre: ${data.pacienteNombre}
• Email: ${data.pacienteEmail}
• Teléfono: ${data.pacienteTelefono}

📅 DETALLES DE LA CITA:
• Fecha: ${fechaFormateada}
• Hora: ${data.horaCita}
• Modalidad: ${iconoModalidad} ${data.tipoCita === 'PRESENCIAL' ? 'Presencial' : 'En línea'}

📋 MOTIVO:
${data.motivoConsulta}

🔑 CÓDIGO DE CITA: ${data.codigoCita}

---
Este es un mensaje automático del sistema de citas.
La cita también ha sido agregada a tu Google Calendar.
      `,
    }

    const info = await transporter.sendMail(mailOptions)

    console.log('✅ Email de notificación enviado:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Error al enviar email de notificación:', error)
    return { success: false, error }
  }
}
