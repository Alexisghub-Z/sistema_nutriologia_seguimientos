import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Crear instancia de Redis para rate limiting
// Si no hay Redis configurado, usar Map en memoria (solo para desarrollo)
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined

// Fallback a Map en memoria si no hay Redis (solo desarrollo)
const cache = redis ? undefined : new Map()

/**
 * Rate limiter para endpoints públicos de citas
 * 3 citas por hora por IP
 */
export const citasPublicasLimiter = new Ratelimit({
  redis: redis!,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: '@upstash/ratelimit:citas-publicas',
  // Usar Map en memoria si no hay Redis (solo desarrollo)
  ...(cache && { ephemeralCache: cache }),
})

/**
 * Rate limiter para envío de mensajes WhatsApp
 * 20 mensajes por hora por usuario/teléfono
 */
export const mensajesLimiter = new Ratelimit({
  redis: redis!,
  limiter: Ratelimit.slidingWindow(20, '1 h'),
  analytics: true,
  prefix: '@upstash/ratelimit:mensajes',
  ...(cache && { ephemeralCache: cache }),
})

/**
 * Rate limiter para login
 * 5 intentos por 15 minutos por IP
 */
export const loginLimiter = new Ratelimit({
  redis: redis!,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: '@upstash/ratelimit:login',
  ...(cache && { ephemeralCache: cache }),
})

/**
 * Rate limiter general para APIs admin
 * 100 requests por minuto por usuario
 */
export const apiLimiter = new Ratelimit({
  redis: redis!,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: '@upstash/ratelimit:api',
  ...(cache && { ephemeralCache: cache }),
})

/**
 * Función helper para aplicar rate limit y retornar respuesta
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      console.warn(`⚠️  Rate limit exceeded for: ${identifier}`)
    }

    return { success, limit, remaining, reset }
  } catch (error) {
    // En caso de error con Redis, permitir la request pero logear
    console.error('Error checking rate limit:', error)
    return { success: true }
  }
}

/**
 * Helper para obtener IP del request
 */
export function getClientIp(request: Request): string {
  // Obtener IP de headers (útil cuando está detrás de proxy/CDN)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  if (realIp) {
    return realIp
  }

  // Fallback a IP genérica si no se encuentra
  return 'unknown'
}
