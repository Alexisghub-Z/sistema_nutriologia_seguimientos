/**
 * Configuración de Sentry para Edge Runtime
 * (Middleware, Edge API Routes)
 *
 * IMPORTANTE: Solo se activa en producción para no afectar performance en desarrollo
 */

import * as Sentry from '@sentry/nextjs'

// Solo inicializar Sentry en producción
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    debug: false,
    environment: process.env.NODE_ENV || 'production',
  })
}
