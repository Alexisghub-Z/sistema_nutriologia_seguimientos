import { google } from 'googleapis'
import prisma from '@/lib/prisma'

/**
 * Servicio de Google Calendar para sincronización de citas
 */

// Configuración de OAuth2
const getOAuth2Client = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  return oauth2Client
}

/**
 * Genera URL de autenticación para que el usuario autorice la aplicación
 */
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client()

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ]

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Fuerza mostrar pantalla de consentimiento para obtener refresh token
  })

  return authUrl
}

/**
 * Intercambia código de autorización por tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Guarda los tokens de Google en la base de datos
 */
export async function saveGoogleTokens(tokens: {
  access_token?: string | null
  refresh_token?: string | null
  expiry_date?: number | null
}) {
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Tokens incompletos')
  }

  await prisma.configuracionSistema.upsert({
    where: { clave: 'GOOGLE_ACCESS_TOKEN' },
    create: {
      clave: 'GOOGLE_ACCESS_TOKEN',
      valor: tokens.access_token,
      descripcion: 'Token de acceso de Google Calendar',
    },
    update: {
      valor: tokens.access_token,
      updatedAt: new Date(),
    },
  })

  await prisma.configuracionSistema.upsert({
    where: { clave: 'GOOGLE_REFRESH_TOKEN' },
    create: {
      clave: 'GOOGLE_REFRESH_TOKEN',
      valor: tokens.refresh_token,
      descripcion: 'Token de actualización de Google Calendar',
    },
    update: {
      valor: tokens.refresh_token,
      updatedAt: new Date(),
    },
  })

  if (tokens.expiry_date) {
    await prisma.configuracionSistema.upsert({
      where: { clave: 'GOOGLE_TOKEN_EXPIRY' },
      create: {
        clave: 'GOOGLE_TOKEN_EXPIRY',
        valor: tokens.expiry_date.toString(),
        descripcion: 'Fecha de expiración del token de Google',
      },
      update: {
        valor: tokens.expiry_date.toString(),
        updatedAt: new Date(),
      },
    })
  }
}

/**
 * Obtiene los tokens de Google desde la base de datos
 */
async function getGoogleTokens() {
  const [accessToken, refreshToken, expiryDate] = await Promise.all([
    prisma.configuracionSistema.findUnique({ where: { clave: 'GOOGLE_ACCESS_TOKEN' } }),
    prisma.configuracionSistema.findUnique({ where: { clave: 'GOOGLE_REFRESH_TOKEN' } }),
    prisma.configuracionSistema.findUnique({ where: { clave: 'GOOGLE_TOKEN_EXPIRY' } }),
  ])

  if (!accessToken?.valor || !refreshToken?.valor) {
    return null
  }

  return {
    access_token: accessToken.valor,
    refresh_token: refreshToken.valor,
    expiry_date: expiryDate?.valor ? parseInt(expiryDate.valor) : undefined,
  }
}

/**
 * Obtiene cliente autenticado de Google Calendar
 */
async function getAuthenticatedCalendar() {
  const tokens = await getGoogleTokens()

  if (!tokens) {
    throw new Error('No hay tokens de Google Calendar configurados')
  }

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials(tokens)

  // Manejar renovación automática de tokens
  oauth2Client.on('tokens', async (newTokens) => {
    console.log('Renovando tokens de Google Calendar...')
    await saveGoogleTokens({
      access_token: newTokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
      expiry_date: newTokens.expiry_date,
    })
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  return calendar
}

/**
 * Verifica si Google Calendar está configurado
 */
export async function isGoogleCalendarConfigured(): Promise<boolean> {
  const tokens = await getGoogleTokens()
  return tokens !== null
}

/**
 * Obtiene información de la cuenta de Google conectada
 */
export async function getConnectedAccountInfo() {
  try {
    const tokens = await getGoogleTokens()
    if (!tokens) {
      return null
    }

    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials(tokens)

    // Intentar obtener información del usuario usando OAuth2 API
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()

      return {
        email: userInfo.data.email || null,
        name: userInfo.data.name || null,
        picture: userInfo.data.picture || null,
      }
    } catch (userInfoError: any) {
      // Si no tiene permisos para userinfo (tokens antiguos), devolver info limitada
      console.warn(
        'No se pudo obtener info del usuario, probablemente tokens sin scopes de userinfo'
      )
      return {
        email: 'Cuenta conectada (reconecta para ver detalles)',
        name: null,
        picture: null,
      }
    }
  } catch (error) {
    console.error('Error al obtener información de la cuenta:', error)
    return null
  }
}

/**
 * Desconecta Google Calendar eliminando los tokens
 */
export async function disconnectGoogleCalendar() {
  try {
    // Eliminar tokens de la base de datos
    await prisma.configuracionSistema.deleteMany({
      where: {
        clave: {
          in: ['GOOGLE_ACCESS_TOKEN', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_TOKEN_EXPIRY'],
        },
      },
    })

    return true
  } catch (error) {
    console.error('Error al desconectar Google Calendar:', error)
    throw error
  }
}

/**
 * Crea un evento en Google Calendar
 * NOTA: Solo para el calendario del nutriólogo, NO envía invitaciones a pacientes
 */
export async function createCalendarEvent(data: {
  titulo: string
  descripcion?: string
  fechaInicio: Date
  fechaFin: Date
  pacienteEmail?: string
  pacienteNombre?: string
}) {
  try {
    const calendar = await getAuthenticatedCalendar()

    const event = {
      summary: data.titulo,
      description: data.descripcion,
      start: {
        dateTime: data.fechaInicio.toISOString(),
        timeZone: 'America/Mexico_City',
      },
      end: {
        dateTime: data.fechaFin.toISOString(),
        timeZone: 'America/Mexico_City',
      },
      // NO se agregan asistentes para evitar enviar invitaciones
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 24 * 60 }, // 1 día antes (solo notificación)
          { method: 'popup', minutes: 60 }, // 1 hora antes (solo notificación)
        ],
      },
    }

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'none', // NO enviar notificaciones a nadie
    })

    return response.data
  } catch (error) {
    console.error('Error al crear evento en Google Calendar:', error)
    throw error
  }
}

/**
 * Actualiza un evento en Google Calendar
 * NOTA: Solo para el calendario del nutriólogo, NO envía notificaciones
 */
export async function updateCalendarEvent(
  eventId: string,
  data: {
    titulo?: string
    descripcion?: string
    fechaInicio?: Date
    fechaFin?: Date
    pacienteEmail?: string
    pacienteNombre?: string
  }
) {
  try {
    const calendar = await getAuthenticatedCalendar()

    const event: any = {}

    if (data.titulo) event.summary = data.titulo
    if (data.descripcion) event.description = data.descripcion
    if (data.fechaInicio) {
      event.start = {
        dateTime: data.fechaInicio.toISOString(),
        timeZone: 'America/Mexico_City',
      }
    }
    if (data.fechaFin) {
      event.end = {
        dateTime: data.fechaFin.toISOString(),
        timeZone: 'America/Mexico_City',
      }
    }
    // NO se agregan asistentes para evitar enviar notificaciones

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      requestBody: event,
      sendUpdates: 'none', // NO enviar notificaciones
    })

    return response.data
  } catch (error) {
    console.error('Error al actualizar evento en Google Calendar:', error)
    throw error
  }
}

/**
 * Elimina un evento de Google Calendar
 * NOTA: Solo elimina del calendario del nutriólogo, NO envía notificaciones
 */
export async function deleteCalendarEvent(eventId: string) {
  try {
    console.log('🗑️  Iniciando eliminación de evento:', eventId)
    const calendar = await getAuthenticatedCalendar()

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'none', // NO enviar notificaciones
    })

    console.log('✅ Evento eliminado exitosamente de Google Calendar API')
    return true
  } catch (error: any) {
    // Si el evento no existe (404), no es un error crítico
    if (error.code === 404 || error.status === 404) {
      console.log('⚠️  Evento no encontrado en Google Calendar (ya fue eliminado):', eventId)
      return true
    }

    console.error('❌ Error al eliminar evento de Google Calendar:', error)
    console.error('Detalles del error:', {
      message: error.message,
      code: error.code,
      status: error.status,
    })
    throw error
  }
}

/**
 * Lista eventos del calendario en un rango de fechas
 */
export async function listCalendarEvents(startDate: Date, endDate: Date) {
  try {
    const calendar = await getAuthenticatedCalendar()

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    return response.data.items || []
  } catch (error) {
    console.error('Error al listar eventos de Google Calendar:', error)
    throw error
  }
}

/**
 * Sincroniza una cita con Google Calendar
 */
export async function syncCitaWithGoogleCalendar(citaId: string) {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        paciente: {
          include: {
            _count: {
              select: {
                consultas: true,
                citas: true,
              },
            },
          },
        },
      },
    })

    if (!cita) {
      throw new Error('Cita no encontrada')
    }

    // Calcular edad del paciente
    const calcularEdad = (fechaNacimiento: Date) => {
      const hoy = new Date()
      const nacimiento = new Date(fechaNacimiento)
      let edad = hoy.getFullYear() - nacimiento.getFullYear()
      const mes = hoy.getMonth() - nacimiento.getMonth()
      if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--
      }
      return edad
    }

    const edad = calcularEdad(cita.paciente.fecha_nacimiento)

    // Determinar modalidad de la cita con icono
    const modalidadIcono = cita.tipo_cita === 'PRESENCIAL' ? '🏥' : '💻'
    const modalidadTexto = cita.tipo_cita === 'PRESENCIAL' ? 'Presencial' : 'En línea'

    // Crear descripción detallada
    const descripcion = `
📋 MOTIVO: ${cita.motivo_consulta || 'Consulta nutricional'}

${modalidadIcono} MODALIDAD: ${modalidadTexto}

👤 INFORMACIÓN DEL PACIENTE:
• Nombre: ${cita.paciente.nombre}
• Edad: ${edad} años
• Teléfono: ${cita.paciente.telefono}
• Email: ${cita.paciente.email}

📊 HISTORIAL:
• Total de consultas: ${cita.paciente._count.consultas}
• Total de citas: ${cita.paciente._count.citas}
    `.trim()

    // Calcular fecha de fin (usando duración de la cita)
    const fechaFin = new Date(cita.fecha_hora)
    fechaFin.setMinutes(fechaFin.getMinutes() + (cita.duracion_minutos || 60))

    // Título con modalidad
    const titulo = `${modalidadIcono} Consulta: ${cita.paciente.nombre}`

    // Si la cita ya tiene un google_event_id, actualizar
    if (cita.google_event_id) {
      const event = await updateCalendarEvent(cita.google_event_id, {
        titulo: titulo,
        descripcion: descripcion,
        fechaInicio: cita.fecha_hora,
        fechaFin: fechaFin,
        pacienteEmail: cita.paciente.email,
        pacienteNombre: cita.paciente.nombre,
      })
      return event
    } else {
      // Crear nuevo evento
      const event = await createCalendarEvent({
        titulo: titulo,
        descripcion: descripcion,
        fechaInicio: cita.fecha_hora,
        fechaFin: fechaFin,
        pacienteEmail: cita.paciente.email,
        pacienteNombre: cita.paciente.nombre,
      })

      // Guardar el ID del evento en la cita
      await prisma.cita.update({
        where: { id: citaId },
        data: { google_event_id: event.id || null },
      })

      return event
    }
  } catch (error) {
    console.error('Error al sincronizar cita con Google Calendar:', error)
    throw error
  }
}

/**
 * Elimina sincronización de cita con Google Calendar
 */
export async function unsyncCitaFromGoogleCalendar(citaId: string) {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
    })

    if (!cita) {
      console.log('❌ Cita no encontrada para eliminar de Google Calendar:', citaId)
      return
    }

    if (!cita.google_event_id) {
      console.log('⚠️  Cita no tiene google_event_id, no hay nada que eliminar:', citaId)
      return
    }

    console.log('🗑️  Eliminando evento de Google Calendar:', cita.google_event_id)
    await deleteCalendarEvent(cita.google_event_id)
    console.log('✅ Evento eliminado exitosamente de Google Calendar')

    await prisma.cita.update({
      where: { id: citaId },
      data: { google_event_id: null },
    })
    console.log('✅ google_event_id removido de la base de datos')
  } catch (error) {
    console.error('❌ Error al eliminar sincronización de cita:', error)
    throw error
  }
}
