/**
 * Servicio de notificaciones por email al nutriólogo mediante Resend.
 *
 * La configuración (correo destino, remitente, API key y qué avisos están
 * activos) vive en el modelo ConfiguracionGeneral, editable desde
 * /configuracion/notificaciones. La API key puede venir de la BD o, como
 * fallback, de process.env.RESEND_API_KEY.
 *
 * Ninguna función lanza: si algo falla o falta configuración, se loguea y se
 * retorna sin romper el flujo de la cita que la invoca.
 */

import { Resend } from 'resend'
import prisma from '@/lib/prisma'
import { logError } from '@/lib/logger'

export type TipoNotificacion = 'nueva' | 'cancelacion' | 'reagendamiento' | 'confirmacion'

export interface DatosCitaEmail {
  codigo_cita?: string | null
  fecha_hora: Date | string
  tipo_cita?: string | null
  motivo_consulta?: string | null
  paciente: {
    nombre: string
    telefono: string
    email?: string | null
  }
}

interface ParamsNotificacion {
  tipo: TipoNotificacion
  cita: DatosCitaEmail
  /** Solo para reagendamiento: la cita anterior que se canceló. */
  citaAnterior?: DatosCitaEmail
}

interface ConfigNotificaciones {
  // Interno (variables de entorno)
  destino: string | null
  remitente: string
  apiKey: string | null
  // Preferencias del nutriólogo (base de datos, editable desde la UI)
  activa: boolean
  nueva: boolean
  cancelacion: boolean
  reagendamiento: boolean
  confirmacion: boolean
}

// Colores del encabezado por tipo
const COLORES: Record<TipoNotificacion, string> = {
  nueva: '#2d9f5d',
  confirmacion: '#16a34a',
  cancelacion: '#dc2626',
  reagendamiento: '#2563eb',
}

const TITULOS: Record<TipoNotificacion, string> = {
  nueva: '📅 Nueva cita agendada',
  confirmacion: '✅ Cita confirmada',
  cancelacion: '🚨 Cita cancelada',
  reagendamiento: '🔄 Cita reagendada',
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

/** Construye el HTML de una tabla de datos con un encabezado de color. */
function plantillaEmail(
  titulo: string,
  color: string,
  filas: { label: string; valor: string }[],
  parrafoIntro: string
): string {
  const filasHtml = filas
    .filter((f) => f.valor)
    .map(
      (f) =>
        `<div style="margin:10px 0"><span style="font-weight:bold;color:#555">${f.label}:</span> ${f.valor}</div>`
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f4f4f4">
  <div style="max-width:600px;margin:0 auto;padding:20px">
    <div style="background:${color};color:#fff;padding:18px 22px;border-radius:8px 8px 0 0">
      <h2 style="margin:0;font-size:18px">${titulo}</h2>
    </div>
    <div style="background:#fff;padding:22px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
      <p style="margin-top:0">${parrafoIntro}</p>
      ${filasHtml}
      <div style="margin-top:22px;padding-top:14px;border-top:1px solid #eee;font-size:12px;color:#888">
        Notificación automática del sistema de gestión de citas.
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Configuración de notificaciones.
 * - Lo interno/técnico (API key, remitente, correo destino) viene de variables
 *   de entorno; no se expone en la UI.
 * - Las preferencias del nutriólogo (activar y qué avisos) vienen de la BD y se
 *   editan desde /configuracion/notificaciones.
 */
async function obtenerConfig(): Promise<ConfigNotificaciones | null> {
  const config = await prisma.configuracionGeneral.findFirst({
    select: {
      notif_email_activa: true,
      notif_email_destino: true,
      notif_nueva_cita: true,
      notif_cancelacion: true,
      notif_reagendamiento: true,
      notif_confirmacion: true,
    },
  })
  if (!config) return null
  return {
    // Interno (env): remitente y API key
    remitente: process.env.RESEND_FROM_EMAIL || 'notificaciones@nutricionpaulcortez.com',
    apiKey: process.env.RESEND_API_KEY || null,
    // Correo destino: editable en la UI, con fallback a env var
    destino: config.notif_email_destino || process.env.NUTRIOLOGO_EMAIL || null,
    // Preferencias (BD)
    activa: config.notif_email_activa,
    nueva: config.notif_nueva_cita,
    cancelacion: config.notif_cancelacion,
    reagendamiento: config.notif_reagendamiento,
    confirmacion: config.notif_confirmacion,
  }
}

/** ¿Está activo el aviso de este tipo según la configuración? */
function tipoActivo(config: ConfigNotificaciones, tipo: TipoNotificacion): boolean {
  switch (tipo) {
    case 'nueva':
      return config.nueva
    case 'cancelacion':
      return config.cancelacion
    case 'reagendamiento':
      return config.reagendamiento
    case 'confirmacion':
      return config.confirmacion
  }
}

/** Arma el asunto y las filas de datos según el tipo. */
function construirContenido(params: ParamsNotificacion): { asunto: string; html: string } {
  const { tipo, cita, citaAnterior } = params
  const nombre = cita.paciente.nombre
  const fecha = formatearFecha(cita.fecha_hora)
  const hora = formatearHora(cita.fecha_hora)
  const modalidad = cita.tipo_cita === 'EN_LINEA' ? 'En línea' : 'Presencial'

  const introPorTipo: Record<TipoNotificacion, string> = {
    nueva: `El paciente <strong>${nombre}</strong> agendó una nueva cita.`,
    confirmacion: `El paciente <strong>${nombre}</strong> confirmó su asistencia.`,
    cancelacion: `El paciente <strong>${nombre}</strong> canceló su cita.`,
    reagendamiento: `El paciente <strong>${nombre}</strong> reagendó su cita.`,
  }

  const filas: { label: string; valor: string }[] = []

  if (tipo === 'reagendamiento' && citaAnterior) {
    filas.push(
      { label: '❌ Cita anterior', valor: `${formatearFecha(citaAnterior.fecha_hora)} — ${formatearHora(citaAnterior.fecha_hora)}` },
      { label: '✅ Nueva cita', valor: `${fecha} — ${hora}` }
    )
  } else {
    filas.push({ label: '📅 Fecha', valor: fecha }, { label: '🕐 Hora', valor: hora })
  }

  filas.push(
    { label: '📍 Modalidad', valor: modalidad },
    { label: '📞 Teléfono', valor: cita.paciente.telefono },
    { label: '📧 Email', valor: cita.paciente.email || '' },
    { label: '📝 Motivo', valor: cita.motivo_consulta || '' },
    { label: '🔑 Código', valor: cita.codigo_cita || '' }
  )

  const asuntoBase: Record<TipoNotificacion, string> = {
    nueva: `Nueva cita — ${nombre}`,
    confirmacion: `Cita confirmada — ${nombre}`,
    cancelacion: `Cita cancelada — ${nombre}`,
    reagendamiento: `Cita reagendada — ${nombre}`,
  }

  return {
    asunto: `${TITULOS[tipo].replace(/^[^ ]+ /, '')} · ${asuntoBase[tipo]}`,
    html: plantillaEmail(TITULOS[tipo], COLORES[tipo], filas, introPorTipo[tipo]),
  }
}

/**
 * Envía (si procede) la notificación por email al nutriólogo.
 * No lanza nunca: retorna un objeto indicando qué pasó (útil para el endpoint de prueba).
 */
export async function enviarEmailNotificacion(
  params: ParamsNotificacion
): Promise<{ enviado: boolean; motivo?: string }> {
  try {
    const config = await obtenerConfig()
    if (!config) return { enviado: false, motivo: 'sin_configuracion' }
    if (!config.activa) return { enviado: false, motivo: 'notificaciones_desactivadas' }
    if (!tipoActivo(config, params.tipo)) return { enviado: false, motivo: 'aviso_tipo_desactivado' }
    if (!config.destino) return { enviado: false, motivo: 'sin_correo_destino' }
    if (!config.apiKey) return { enviado: false, motivo: 'sin_api_key' }

    const { asunto, html } = construirContenido(params)
    const resend = new Resend(config.apiKey)
    const { error } = await resend.emails.send({
      from: config.remitente,
      to: config.destino,
      subject: asunto,
      html,
    })

    if (error) {
      logError('Error enviando email de notificación con Resend', error as Error, {
        tipo: params.tipo,
      })
      return { enviado: false, motivo: 'error_resend' }
    }

    return { enviado: true }
  } catch (error) {
    logError('Excepción en enviarEmailNotificacion', error as Error, { tipo: params.tipo })
    return { enviado: false, motivo: 'excepcion' }
  }
}
