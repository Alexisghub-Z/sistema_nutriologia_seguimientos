/**
 * Servicio de Notificaciones al Nutriólogo
 *
 * Email vía Resend (configurable desde /configuracion/notificaciones).
 * WhatsApp opcional vía Twilio (se mantiene por env vars para compatibilidad).
 *
 * Ninguna función lanza: los errores se loguean y nunca rompen el flujo de la
 * cita que las invoca.
 */

import { sendWhatsAppMessage } from './twilio'
import {
  enviarEmailNotificacion,
  type DatosCitaEmail,
  type TipoNotificacion,
} from './email-resend'
import { logError } from '@/lib/logger'

// WhatsApp al nutriólogo sigue por env (opcional, secundario a email)
const WHATSAPP_CONFIG = {
  numero: process.env.NUTRIOLOGO_WHATSAPP || '',
  activo: process.env.NOTIFICACIONES_WHATSAPP_ENABLED === 'true',
}

export interface DatosCita extends DatosCitaEmail {
  id?: string
  codigo_cita?: string | null
}

function formatearFecha(fechaHora: Date | string): string {
  return new Date(fechaHora).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  })
}
function formatearHora(fechaHora: Date | string): string {
  return new Date(fechaHora).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  })
}

/** Envía el WhatsApp al nutriólogo si está habilitado (best-effort). */
async function enviarWhatsAppNutriologo(mensaje: string): Promise<void> {
  if (!WHATSAPP_CONFIG.activo || !WHATSAPP_CONFIG.numero) return
  try {
    await sendWhatsAppMessage(WHATSAPP_CONFIG.numero, mensaje)
  } catch (error) {
    logError('Error al notificar al nutriólogo por WhatsApp', error)
  }
}

function resumenWhatsApp(titulo: string, cita: DatosCita): string {
  const fecha = formatearFecha(cita.fecha_hora)
  const hora = formatearHora(cita.fecha_hora)
  const modalidad = cita.tipo_cita === 'EN_LINEA' ? 'En línea' : 'Presencial'
  return `${titulo}

👤 Paciente: *${cita.paciente.nombre}*
📅 ${fecha}
🕐 ${hora}
📍 ${modalidad}
📞 ${cita.paciente.telefono}${cita.codigo_cita ? `\n🔑 ${cita.codigo_cita}` : ''}`
}

/** Dispara email (Resend) + WhatsApp (opcional) para un tipo de notificación. */
async function notificar(tipo: TipoNotificacion, cita: DatosCita, tituloWa: string, citaAnterior?: DatosCita): Promise<void> {
  await Promise.allSettled([
    enviarEmailNotificacion({ tipo, cita, citaAnterior }),
    enviarWhatsAppNutriologo(resumenWhatsApp(tituloWa, cita)),
  ])
}

/** Nueva cita agendada por el paciente (web o IA). */
export async function notificarNuevaCita(cita: DatosCita): Promise<void> {
  await notificar('nueva', cita, '📅 *NUEVA CITA AGENDADA*')
}

/** El paciente canceló su cita. */
export async function notificarCancelacion(cita: DatosCita): Promise<void> {
  await notificar('cancelacion', cita, '🚨 *CITA CANCELADA*')
}

/** El paciente confirmó su asistencia. */
export async function notificarConfirmacion(cita: DatosCita): Promise<void> {
  await notificar('confirmacion', cita, '✅ *CITA CONFIRMADA*')
}

/** El paciente reagendó su cita (cita anterior → nueva). */
export async function notificarReagendamiento(
  citaAnterior: DatosCita,
  citaNueva?: DatosCita
): Promise<void> {
  // Para el email necesitamos la cita "actual" (la nueva). Si no hay nueva aún,
  // se notifica como cancelación pendiente de reagendar.
  if (citaNueva) {
    await notificar('reagendamiento', citaNueva, '🔄 *CITA REAGENDADA*', citaAnterior)
  } else {
    await notificarCancelacion(citaAnterior)
  }
}
