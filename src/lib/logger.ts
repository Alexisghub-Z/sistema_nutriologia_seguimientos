/**
 * Sistema de Logging Profesional
 *
 * Usa Winston para logging estructurado con niveles y rotación de archivos
 *
 * Niveles de log (orden de severidad):
 * - error: Errores críticos que requieren atención inmediata
 * - warn: Advertencias que no rompen funcionalidad pero son preocupantes
 * - info: Información general de operaciones (ej: cita creada, mensaje enviado)
 * - debug: Información detallada para debugging (solo en desarrollo)
 *
 * Uso:
 * import { logger } from '@/lib/logger'
 * logger.info('Cita creada', { citaId: '123', pacienteId: '456' })
 * logger.error('Error al enviar mensaje', { error: err.message, telefono })
 */

import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import path from 'path'

// Determinar ambiente
const isDevelopment = process.env.NODE_ENV !== 'production'
const isTest = process.env.NODE_ENV === 'test'

// Formato para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Formato para consola (más legible)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`

    // Agregar metadata si existe
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`
    }

    return msg
  })
)

// Crear directorio de logs si no existe
const logsDir = path.join(process.cwd(), 'logs')

// Transports (dónde se guardan los logs)
const transports: winston.transport[] = []

// En tests, no loguear a archivos
if (!isTest) {
  // Logs de error (rotan diariamente, mantener 30 días)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      format: logFormat,
    })
  )

  // Logs combinados (rotan diariamente, mantener 14 días)
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      format: logFormat,
    })
  )
}

// En desarrollo, también mostrar en consola
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  )
}

// Crear logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: logFormat,
  transports,
  // No salir del proceso en errores
  exitOnError: false,
})

/**
 * Helper para loguear errores de forma consistente
 */
export function logError(
  message: string,
  error: Error | unknown,
  metadata?: Record<string, unknown>
) {
  const errorInfo = error instanceof Error
    ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    : { error: String(error) }

  logger.error(message, {
    ...errorInfo,
    ...metadata,
  })
}

/**
 * Helper para loguear operaciones exitosas
 */
export function logSuccess(
  operation: string,
  metadata?: Record<string, unknown>
) {
  logger.info(`✅ ${operation}`, metadata)
}

/**
 * Helper para loguear advertencias
 */
export function logWarning(
  message: string,
  metadata?: Record<string, unknown>
) {
  logger.warn(`⚠️ ${message}`, metadata)
}

/**
 * Helper para debugging (solo en desarrollo)
 */
export function logDebug(
  message: string,
  metadata?: Record<string, unknown>
) {
  if (isDevelopment) {
    logger.debug(`🔍 ${message}`, metadata)
  }
}

// Log de inicio
if (!isTest) {
  logger.info('🚀 Logger iniciado', {
    environment: process.env.NODE_ENV,
    level: logger.level,
    logsDir: isDevelopment ? logsDir : 'production',
  })
}

export default logger
