/**
 * Configuración de Sentry para el servidor (Node.js)
 *
 * Captura errores del backend/API y los envía a Sentry
 *
 * IMPORTANTE: Solo se activa en producción para no afectar performance en desarrollo
 */

import * as Sentry from '@sentry/nextjs'

// Solo inicializar Sentry en producción
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    // DSN de Sentry (obtener de https://sentry.io)
    dsn: process.env.SENTRY_DSN,

    // Ajustar la tasa de rastreo de performance
    tracesSampleRate: 0.1,

    // Debug mode deshabilitado en producción
    debug: false,

    // Identificar el entorno
    environment: process.env.NODE_ENV || 'production',

  // Ignorar errores que no son críticos
  ignoreErrors: [
    // Rate limiting esperado
    'Too many requests',
    // Errores de conexión a servicios externos (Twilio, OpenAI pueden fallar temporalmente)
    'ECONNREFUSED',
    'ENOTFOUND',
  ],

    // Enriquecer contexto del servidor
    beforeSend(event) {
      // Agregar contexto adicional del servidor
      if (event.request) {
        // Limpiar información sensible
        if (event.request.headers) {
          delete event.request.headers['authorization']
          delete event.request.headers['cookie']
        }
      }

      return event
    },
  })
}
