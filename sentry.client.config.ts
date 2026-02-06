/**
 * Configuración de Sentry para el cliente (browser)
 *
 * Captura errores del frontend y los envía a Sentry
 *
 * IMPORTANTE: Solo se activa en producción para no afectar performance en desarrollo
 */

import * as Sentry from '@sentry/nextjs'

// Solo inicializar Sentry en producción
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    // DSN de Sentry (obtener de https://sentry.io)
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Ajustar la tasa de rastreo de performance
    // 0.1 = 10% de transacciones (reduce costos)
    tracesSampleRate: 0.1,

    // Debug mode deshabilitado en producción
    debug: false,

    // Identificar el entorno
    environment: process.env.NODE_ENV || 'production',

  // Configuración adicional
  replaysOnErrorSampleRate: 1.0, // Grabar sesión cuando hay error
  replaysSessionSampleRate: 0.1, // Grabar 10% de sesiones normales

  // Ignorar errores conocidos que no son críticos
  ignoreErrors: [
    // Errores de red que no podemos controlar
    'Network request failed',
    'NetworkError',
    // Errores de extensiones del browser
    'top.GLOBALS',
    // Errores de ad blockers
    'adsbygoogle',
  ],

    // Enriquecer contexto con información del usuario
    beforeSend(event) {
      return event
    },
  })
}
