import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null

// Conectar a Redis
async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6380',
    })

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err)
    })

    redisClient.on('connect', () => {
      console.log('✅ Redis connected')
    })

    await redisClient.connect()
  }

  return redisClient
}

// Cerrar conexión (útil para testing)
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

// Obtener valor del caché
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient()
    const cached = await client.get(key)

    if (!cached) return null

    return JSON.parse(cached) as T
  } catch (error) {
    console.error('Error reading from cache:', error)
    return null
  }
}

// Guardar valor en caché con TTL (en segundos)
export async function setCache(
  key: string,
  value: any,
  ttl: number = 300 // 5 minutos por defecto
): Promise<void> {
  try {
    const client = await getRedisClient()
    await client.setEx(key, ttl, JSON.stringify(value))
  } catch (error) {
    console.error('Error writing to cache:', error)
  }
}

// Eliminar clave del caché
export async function deleteCache(key: string): Promise<void> {
  try {
    const client = await getRedisClient()
    await client.del(key)
  } catch (error) {
    console.error('Error deleting from cache:', error)
  }
}

// Eliminar múltiples claves por patrón
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const client = await getRedisClient()
    const keys = await client.keys(pattern)

    if (keys.length > 0) {
      await client.del(keys)
    }
  } catch (error) {
    console.error('Error deleting cache pattern:', error)
  }
}

// Verificar si Redis está disponible
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = await getRedisClient()
    await client.ping()
    return true
  } catch (error) {
    console.error('Redis not available:', error)
    return false
  }
}

// Helper para generar claves de caché consistentes
export const CacheKeys = {
  // Pacientes
  patientsList: (page: number, limit: number, search: string, sortBy: string, sortOrder: string) =>
    `patients:list:${page}:${limit}:${search}:${sortBy}:${sortOrder}`,
  patientDetail: (id: string) => `patient:${id}`,

  // Consultas
  consultationsList: (pacienteId: string, page: number, limit: number) =>
    `consultations:${pacienteId}:${page}:${limit}`,
  consultationDetail: (id: string) => `consultation:${id}`,

  // Citas
  appointmentsList: (pacienteId: string) => `appointments:${pacienteId}`,
  appointmentDetail: (id: string) => `appointment:${id}`,

  // Archivos
  filesList: (consultaId: string) => `files:${consultaId}`,

  // Mensajes
  messagesList: (pacienteId: string) => `messages:${pacienteId}`,
  conversationsList: (page: number, limit: number, search: string) =>
    `messages:conversations:${page}:${limit}:${search}`,

  // Plantillas
  templatesList: (categoria: string, activa: string) => `templates:list:${categoria}:${activa}`,
  templateDetail: (id: string) => `template:${id}`,
}

export default {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  isRedisAvailable,
  CacheKeys,
}
