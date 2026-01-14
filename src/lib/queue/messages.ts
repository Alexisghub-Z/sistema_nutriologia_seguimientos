import Queue from 'bull'

// Crear conexion a Redis
const redisConfig = {
  host: 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
  password: process.env.REDIS_PASSWORD,
}

// Cola para mensajes automaticos
export const mensajesQueue = new Queue('mensajes-automaticos', {
  redis: redisConfig,
})

// Tipos de jobs
export enum TipoJob {
  CONFIRMACION = 'confirmacion',
  RECORDATORIO_24H = 'recordatorio_24h',
  RECORDATORIO_1H = 'recordatorio_1h',
  SEGUIMIENTO = 'seguimiento',
}

// Interfaces para los datos de cada job
export interface JobConfirmacion {
  citaId: string
}

export interface JobRecordatorio {
  citaId: string
}

export interface JobSeguimiento {
  citaId: string
}

/**
 * Programa el envio de confirmacion al crear cita
 */
export async function programarConfirmacion(citaId: string) {
  await mensajesQueue.add(
    TipoJob.CONFIRMACION,
    { citaId },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  )
  console.log(`[Queue] Job de confirmacion programado para cita: ${citaId}`)
}

/**
 * Programa el envio de recordatorio 24 horas antes
 */
export async function programarRecordatorio24h(citaId: string, fechaCita: Date) {
  const delay = fechaCita.getTime() - Date.now() - 24 * 60 * 60 * 1000

  if (delay <= 0) {
    console.warn(`[Queue] La cita ${citaId} es en menos de 24h, no se programara recordatorio`)
    return
  }

  await mensajesQueue.add(
    TipoJob.RECORDATORIO_24H,
    { citaId },
    {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  )

  const fechaEnvio = new Date(Date.now() + delay)
  console.log(`[Queue] Recordatorio 24h programado para: ${fechaEnvio.toLocaleString('es-MX')}`)
}

/**
 * Programa el envio de recordatorio 1 hora antes
 */
export async function programarRecordatorio1h(citaId: string, fechaCita: Date) {
  const delay = fechaCita.getTime() - Date.now() - 60 * 60 * 1000

  if (delay <= 0) {
    console.warn(`[Queue] La cita ${citaId} es en menos de 1h, no se programara recordatorio`)
    return
  }

  await mensajesQueue.add(
    TipoJob.RECORDATORIO_1H,
    { citaId },
    {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  )

  const fechaEnvio = new Date(Date.now() + delay)
  console.log(`[Queue] Recordatorio 1h programado para: ${fechaEnvio.toLocaleString('es-MX')}`)
}

/**
 * Programa el envio de seguimiento post-consulta
 */
export async function programarSeguimiento(citaId: string, diasDespues: number = 2) {
  const delay = diasDespues * 24 * 60 * 60 * 1000

  await mensajesQueue.add(
    TipoJob.SEGUIMIENTO,
    { citaId },
    {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  )

  const fechaEnvio = new Date(Date.now() + delay)
  console.log(`[Queue] Seguimiento programado para: ${fechaEnvio.toLocaleString('es-MX')}`)
}

/**
 * Cancela todos los jobs pendientes de una cita
 */
export async function cancelarJobsCita(citaId: string) {
  const jobs = await mensajesQueue.getJobs(['waiting', 'delayed'])

  for (const job of jobs) {
    if (job.data.citaId === citaId) {
      await job.remove()
      console.log(`[Queue] Job ${job.name} cancelado para cita: ${citaId}`)
    }
  }
}
