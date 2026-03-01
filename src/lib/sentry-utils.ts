/**
 * Utilidades de captura de errores — Sentry desactivado.
 * Las funciones delegan en Winston (logger) y ejecutan las operaciones directamente.
 */

import { NextRequest } from 'next/server'
import { logger, logError } from './logger'

export function captureError(
  error: Error | unknown,
  context?: {
    module?: string
    userId?: string
    pacienteId?: string
    extra?: Record<string, unknown>
  }
) {
  logError(
    error instanceof Error ? error.message : 'Error desconocido',
    error,
    context
  )
}

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
      captureError(error, {
        module: options.module,
        extra: {
          method: req.method,
          url: req.url,
        },
      })

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

export function captureInfo(
  message: string,
  context?: {
    level?: 'info' | 'warning' | 'error'
    extra?: Record<string, unknown>
  }
) {
  logger.info(message, context?.extra)
}

export function addBreadcrumb(
  _category: string,
  _message: string,
  _data?: Record<string, unknown>
) {
  // no-op
}

export function setUser(_user: { id: string; email?: string; username?: string }) {
  // no-op
}

export function clearUser() {
  // no-op
}

export async function measurePerformance<T>(
  _operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return await fn()
}
