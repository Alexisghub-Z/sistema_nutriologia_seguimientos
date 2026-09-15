import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Crear instancia de Redis para rate limiting
// Si no hay Redis configurado (o la URL es un placeholder), usar Map en memoria
const isValidUpstashUrl =
  process.env.UPSTASH_REDIS_REST_URL &&
  !process.env.UPSTASH_REDIS_REST_URL.includes('your-redis-instance')

const redis = isValidUpstashUrl
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined

// Fallback a Map en memoria si no hay Redis (solo desarrollo)
const cache = redis ? undefined : new Map()

/**
 * ¿Hay un Redis de verdad detrás?
 *
 * Lo consulta `checkRateLimit` para decidir entre Upstash y el contador local.
 * Es `!!` del cliente y no de la URL porque lo que importa es si existe el
 * cliente que se va a usar.
 */
const hayUpstash = !!redis

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
 * Rate limiter para consultas públicas de datos de pacientes
 * 10 consultas por hora por IP
 *
 * Aparte del de citas públicas (3/h) a propósito: aquel limita CREAR una cita,
 * y esto solo CONSULTA. Con 3/h, alguien que se equivoque al teclear su email
 * dos veces se quedaría fuera una hora, y romperíamos la reserva real por
 * cerrar un agujero.
 *
 * 10/h da margen a los errores de tecleo honestos y a la vez hace inviable
 * recorrer teléfonos a lo bruto: un móvil mexicano tiene 10 dígitos, así que a
 * este ritmo enumerarlos llevaría millones de años.
 */
export const consultaPacienteLimiter = new Ratelimit({
  redis: redis!,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  analytics: true,
  prefix: '@upstash/ratelimit:consulta-paciente',
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
 * Cuotas de cada limitador, para el contador local.
 * ------------------------------------------------------------
 * Están declaradas aquí porque `Ratelimit` no deja consultar su propia cuota:
 * el contador en memoria necesita saber cuántas peticiones permite cada uno.
 * Se emparejan por `prefix`, que es lo único que los distingue.
 *
 * Si se cambia una ventana arriba, hay que cambiarla también aquí. Es una
 * duplicación incómoda, pero la alternativa —dos fuentes de verdad calladas—
 * es peor: el mapa `CUOTAS` se valida en la primera llamada y avisa si falta.
 */
const CUOTAS: Record<string, { peticiones: number; ventanaMs: number }> = {
  '@upstash/ratelimit:citas-publicas': { peticiones: 3, ventanaMs: 60 * 60 * 1000 },
  '@upstash/ratelimit:mensajes': { peticiones: 20, ventanaMs: 60 * 60 * 1000 },
  '@upstash/ratelimit:login': { peticiones: 5, ventanaMs: 15 * 60 * 1000 },
  '@upstash/ratelimit:consulta-paciente': { peticiones: 10, ventanaMs: 60 * 60 * 1000 },
  '@upstash/ratelimit:api': { peticiones: 100, ventanaMs: 60 * 1000 },
}

/** Marcas de tiempo de las peticiones recientes, por identificador. */
const memoria = new Map<string, number[]>()

/** Última limpieza del Map, para no recorrerlo en cada petición. */
let ultimaLimpieza = Date.now()
const CADA_CUANTO_LIMPIAR = 10 * 60 * 1000

/**
 * Tira las entradas que ya no le sirven a nadie.
 *
 * Sin esto el Map crece con cada IP que pase por aquí y no se vacía nunca: en
 * un proceso que vive semanas, eso es una fuga de memoria lenta.
 */
function limpiarSiTocaFecha(ahora: number, ventanaMaxMs: number): void {
  if (ahora - ultimaLimpieza < CADA_CUANTO_LIMPIAR) return
  ultimaLimpieza = ahora
  for (const [clave, marcas] of memoria) {
    const vivas = marcas.filter((m) => ahora - m < ventanaMaxMs)
    if (vivas.length === 0) memoria.delete(clave)
    else memoria.set(clave, vivas)
  }
}

/**
 * Contador en memoria: la misma ventana deslizante, sin Redis.
 *
 * Es deslizante y no por bloques a propósito, igual que el de Upstash: con
 * bloques, alguien podría gastar la cuota entera al final de una hora y otra
 * entera al empezar la siguiente.
 *
 * Limitación conocida: la cuenta vive en el proceso. Con una sola instancia
 * —el caso de este VPS— es exacta; el día que haya varias detrás de un
 * balanceador, cada una llevaría su cuenta y el límite real se multiplicaría.
 * Ese día hace falta Upstash de verdad.
 */
function limitarEnMemoria(
  prefijo: string,
  identificador: string
): { success: boolean; limit: number; remaining: number; reset: number } {
  const cuota = CUOTAS[prefijo]
  if (!cuota) {
    // Un limitador sin cuota declarada: se avisa y se deja pasar, porque
    // inventar un número aquí sería peor que no frenar.
    console.error(
      `⚠️  Sin cuota declarada para "${prefijo}" en CUOTAS (src/lib/rate-limit.ts). No se está limitando.`
    )
    return { success: true, limit: 0, remaining: 0, reset: Date.now() }
  }

  const ahora = Date.now()
  limpiarSiTocaFecha(ahora, cuota.ventanaMs)

  const clave = `${prefijo}:${identificador}`
  const previas = memoria.get(clave) ?? []
  const dentroDeVentana = previas.filter((m) => ahora - m < cuota.ventanaMs)

  const primera = dentroDeVentana[0]
  const reset = primera !== undefined ? primera + cuota.ventanaMs : ahora + cuota.ventanaMs

  if (dentroDeVentana.length >= cuota.peticiones) {
    memoria.set(clave, dentroDeVentana)
    return { success: false, limit: cuota.peticiones, remaining: 0, reset }
  }

  dentroDeVentana.push(ahora)
  memoria.set(clave, dentroDeVentana)
  return {
    success: true,
    limit: cuota.peticiones,
    remaining: cuota.peticiones - dentroDeVentana.length,
    reset,
  }
}

/**
 * Aplica el límite y dice si la petición puede seguir.
 *
 * OJO con el historial de esta función: antes llamaba directamente a Upstash y,
 * ante cualquier error, devolvía `success: true`. Como en este proyecto Upstash
 * no está configurado, `redis` era `undefined`, cada llamada reventaba con
 * `evalsha` y TODAS las peticiones pasaban. El código parecía protegido y no
 * frenaba nada: /api/pacientes/progreso, con un límite de 3 por hora, aceptaba
 * 6 seguidas sin rechistar.
 *
 * Ahora, si no hay Upstash, se usa el contador en memoria —que sí funciona— y
 * solo se deja pasar a ciegas cuando Upstash está configurado pero falla, que
 * es un problema de infraestructura y no el estado normal.
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  // `prefix` no está en los tipos públicos de Ratelimit, pero sí en la
  // instancia: es lo que permite emparejar cada limitador con su cuota.
  const prefijo = (limiter as unknown as { prefix?: string }).prefix ?? ''

  if (!hayUpstash) {
    const resultado = limitarEnMemoria(prefijo, identifier)
    if (!resultado.success) {
      console.warn(`⚠️  Límite alcanzado (memoria) para: ${prefijo}:${identifier}`)
    }
    return resultado
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      console.warn(`⚠️  Rate limit exceeded for: ${identifier}`)
    }

    return { success, limit, remaining, reset }
  } catch (error) {
    // Upstash está configurado pero no responde. Se deja pasar para no tumbar
    // la reserva pública de citas por una caída de Redis, pero se grita: esto
    // es un fallo de infraestructura, no una situación normal.
    console.error('🚨 Upstash configurado pero inaccesible; NO se está limitando:', error)
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
