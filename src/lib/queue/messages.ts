import Queue from 'bull'

// Crear conexion a Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380'),
  password: process.env.REDIS_PASSWORD || 'redis123',
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
  SEGUIMIENTO = 'seguimiento', // Legacy - mantener por compatibilidad

  // Nuevos tipos de seguimiento
  SEGUIMIENTO_INICIAL = 'seguimiento_inicial',
  SEGUIMIENTO_INTERMEDIO = 'seguimiento_intermedio',
  SEGUIMIENTO_PREVIO_CITA = 'seguimiento_previo_cita',
  RECORDATORIO_AGENDAR = 'recordatorio_agendar',
}

// Interfaces para los datos de cada job
export interface JobConfirmacion {
  citaId: string
}

export interface JobRecordatorio {
  citaId: string
}

export interface JobSeguimiento {
  consultaId: string
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
 * Programa múltiples mensajes de seguimiento post-consulta según el tipo
 * @param consultaId - ID de la consulta
 * @param fechaSugerida - Fecha sugerida para la próxima cita
 * @param tipoSeguimiento - Tipo de seguimiento (SOLO_SEGUIMIENTO, SOLO_RECORDATORIO, RECORDATORIO_Y_SEGUIMIENTO)
 */
export async function programarSeguimiento(
  consultaId: string,
  fechaSugerida: Date,
  tipoSeguimiento: string = 'SOLO_RECORDATORIO'
) {
  const ahora = Date.now()
  const fechaSugeridaMs = fechaSugerida.getTime()

  // Calcular el periodo total entre ahora y la fecha sugerida
  const periodoTotal = fechaSugeridaMs - ahora
  const diasTotales = periodoTotal / (1000 * 60 * 60 * 24)

  console.log(`\n📅 [Queue] Programando seguimiento tipo: ${tipoSeguimiento}`)
  console.log(`   Consulta ID: ${consultaId}`)
  console.log(`   Fecha sugerida: ${fechaSugerida.toLocaleString('es-MX')}`)
  console.log(`   Días hasta fecha sugerida: ${Math.ceil(diasTotales)}`)

  let jobsProgramados = 0

  // SEGUIMIENTO POST-CONSULTA (mensajes de apoyo y motivación)
  if (tipoSeguimiento === 'SOLO_SEGUIMIENTO' || tipoSeguimiento === 'RECORDATORIO_Y_SEGUIMIENTO') {
    // 1. SEGUIMIENTO_INICIAL: 3-5 días después de la consulta (usamos 4 días)
    const delay1 = 4 * 24 * 60 * 60 * 1000 // 4 días
    if (delay1 < periodoTotal) {
      await mensajesQueue.add(
        TipoJob.SEGUIMIENTO_INICIAL,
        { consultaId },
        {
          delay: delay1,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      )
      const fechaEnvio1 = new Date(ahora + delay1)
      console.log(`   ✅ Seguimiento inicial: ${fechaEnvio1.toLocaleString('es-MX')} (4 días después)`)
      jobsProgramados++
    }

    // 2. SEGUIMIENTO_INTERMEDIO: A la mitad del periodo
    const delayMitad = periodoTotal / 2
    if (delayMitad > 0 && diasTotales >= 10) { // Solo si hay al menos 10 días
      await mensajesQueue.add(
        TipoJob.SEGUIMIENTO_INTERMEDIO,
        { consultaId },
        {
          delay: delayMitad,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      )
      const fechaEnvioMitad = new Date(ahora + delayMitad)
      console.log(`   ✅ Seguimiento intermedio: ${fechaEnvioMitad.toLocaleString('es-MX')} (mitad del periodo)`)
      jobsProgramados++
    }

    // 3. SEGUIMIENTO_PREVIO_CITA: 7-10 días antes de la fecha sugerida (usamos 8 días)
    const delay3 = periodoTotal - (8 * 24 * 60 * 60 * 1000)
    if (delay3 > 0 && diasTotales >= 10) { // Solo si hay suficiente tiempo
      await mensajesQueue.add(
        TipoJob.SEGUIMIENTO_PREVIO_CITA,
        { consultaId },
        {
          delay: delay3,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      )
      const fechaEnvio3 = new Date(ahora + delay3)
      console.log(`   ✅ Seguimiento previo cita: ${fechaEnvio3.toLocaleString('es-MX')} (8 días antes)`)
      jobsProgramados++
    }
  }

  // RECORDATORIO PARA AGENDAR CITA
  if (tipoSeguimiento === 'SOLO_RECORDATORIO' || tipoSeguimiento === 'RECORDATORIO_Y_SEGUIMIENTO') {
    // RECORDATORIO_AGENDAR: 3-5 días antes de la fecha sugerida (usamos 4 días)
    const delayRecordatorio = periodoTotal - (4 * 24 * 60 * 60 * 1000)

    if (delayRecordatorio <= 0) {
      console.warn(`   ⚠️  La fecha sugerida es muy cercana, no se programará recordatorio`)
    } else {
      await mensajesQueue.add(
        TipoJob.RECORDATORIO_AGENDAR,
        { consultaId },
        {
          delay: delayRecordatorio,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      )
      const fechaEnvioRecordatorio = new Date(ahora + delayRecordatorio)
      console.log(`   ✅ Recordatorio agendar: ${fechaEnvioRecordatorio.toLocaleString('es-MX')} (4 días antes)`)
      jobsProgramados++
    }
  }

  console.log(`   📊 Total de mensajes programados: ${jobsProgramados}\n`)
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
