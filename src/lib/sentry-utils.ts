/**
 * Utilidades para integración de Sentry en la aplicación
 *
 * Funciones helper para capturar errores y agregar contexto
 */

import * as Sentry from '@sentry/nextjs'
import { NextRequest } from 'next/server'
import { logger, logError } from './logger'

/**
 * Captura un error y lo envía tanto a Sentry como a Winston
 *
 * @param error - El error a capturar
 * @param context - Contexto adicional (módulo, usuario, etc.)
 */
export function captureError(
  error: Error | unknown,
  context?: {
    module?: string
    userId?: string
    pacienteId?: string
    extra?: Record<string, unknown>
  }
) {
  // Loguear con Winston
  logError(
    error instanceof Error ? error.message : 'Error desconocido',
    error,
    context
  )

  // Enviar a Sentry con contexto
  Sentry.captureException(error, {
    tags: {
      module: context?.module,
    },
    user: context?.userId
      ? {
          id: context.userId,
        }
      : undefined,
    extra: {
      pacienteId: context?.pacienteId,
      ...context?.extra,
    },
  })
}

/**
 * Wrapper para rutas API que captura errores automáticamente
 *
 * Uso:
 * export const POST = withErrorHandling(async (req) => {
 *   // tu código aquí
 * }, { module: 'citas' })
 */
export function withErrorHandling<T>(
  handler: (req: NextRequest, context?: T) => Promise<Response>,
  options: {
    module: string
  }
) {
  return async (req: NextRequest, context?: T): Promise<Response> => {
    try {
      return await handler(req, context)
    } catch (error) {
      // Capturar error
      captureError(error, {
        module: options.module,
        extra: {
          method: req.method,
          url: req.url,
        },
      })

      // Retornar error al cliente
      return new Response(
        JSON.stringify({
          error:
            error instanceof Error ? error.message : 'Error interno del servidor',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  }
}

/**
 * Captura un mensaje de información en Sentry
 *
 * Útil para eventos importantes que no son errores
 */
export function captureInfo(
  message: string,
  context?: {
    level?: 'info' | 'warning' | 'error'
    extra?: Record<string, unknown>
  }
) {
  logger.info(message, context?.extra)

  Sentry.captureMessage(message, {
    level: context?.level || 'info',
    extra: context?.extra,
  })
}

/**
 * Agrega breadcrumb (rastro de navegación) a Sentry
 *
 * Útil para rastrear el flujo antes de un error
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category,
    message,
    level: 'info',
    data,
  })
}

/**
 * Identifica al usuario actual en Sentry
 *
 * Se debe llamar después de que el usuario inicie sesión
 */
export function setUser(user: {
  id: string
  email?: string
  username?: string
}) {
  Sentry.setUser(user)
}

/**
 * Limpia el usuario de Sentry (al cerrar sesión)
 */
export function clearUser() {
  Sentry.setUser(null)
}

/**
 * Wrapper para medir performance de operaciones
 *
 * Uso:
 * await measurePerformance('db.query.pacientes', async () => {
 *   return await prisma.paciente.findMany()
 * })
 */
export async function measurePerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return await Sentry.startSpan(
    {
      op: 'function',
      name: operation,
    },
    fn
  )
}
