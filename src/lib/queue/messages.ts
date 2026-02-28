import Queue from 'bull'
import prisma from '@/lib/prisma'

// Cola para mensajes automaticos con configuración de auto-limpieza
// Bull pasa la URL directamente a ioredis (mismo formato que redis.ts)
export const mensajesQueue = new Queue('mensajes-automaticos', {
  redis: process.env.REDIS_URL || 'redis://localhost:6380',
  defaultJobOptions: {
    removeOnComplete: {
      age: 24 * 3600, // Eliminar jobs exitosos después de 24 horas
      count: 1000, // Mantener máximo 1000 jobs completados
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Mantener jobs fallidos 7 días para debugging
    },
  },
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

  // Marcar automáticamente como no asistió
  MARCAR_NO_ASISTIO = 'marcar_no_asistio',
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

export interface JobMarcarNoAsistio {
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
      jobId: `confirmacion-${citaId}`, // ID único para búsqueda O(1)
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
      jobId: `recordatorio-24h-${citaId}`, // ID único para búsqueda O(1)
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
      jobId: `recordatorio-1h-${citaId}`, // ID único para búsqueda O(1)
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
 * Programa marcar cita como NO_ASISTIO 2 horas después de la hora programada
 */
export async function programarMarcarNoAsistio(citaId: string, fechaCita: Date) {
  // Calcular delay: 2 horas DESPUÉS de la hora de la cita
  const delay = fechaCita.getTime() - Date.now() + 2 * 60 * 60 * 1000

  if (delay <= 0) {
    console.warn(
      `[Queue] La cita ${citaId} ya pasó hace más de 2h, no se programará auto-marcar`
    )
    return
  }

  await mensajesQueue.add(
    TipoJob.MARCAR_NO_ASISTIO,
    { citaId },
    {
      jobId: `marcar-no-asistio-${citaId}`, // ID único para búsqueda O(1)
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  )

  const fechaEjecucion = new Date(Date.now() + delay)
  console.log(
    `[Queue] Auto-marcar NO_ASISTIO programado para: ${fechaEjecucion.toLocaleString('es-MX')}`
  )
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
          jobId: `seguimiento-inicial-${consultaId}`,
          delay: delay1,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      )
      const fechaEnvio1 = new Date(ahora + delay1)
      console.log(
        `   ✅ Seguimiento inicial: ${fechaEnvio1.toLocaleString('es-MX')} (4 días después)`
      )
      jobsProgramados++
    }

    // 2. SEGUIMIENTO_INTERMEDIO: A la mitad del periodo
    const delayMitad = periodoTotal / 2
    if (delayMitad > 0 && diasTotales >= 10) {
      // Solo si hay al menos 10 días
      await mensajesQueue.add(
        TipoJob.SEGUIMIENTO_INTERMEDIO,
        { consultaId },
        {
          jobId: `seguimiento-intermedio-${consultaId}`,
          delay: delayMitad,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      )
      const fechaEnvioMitad = new Date(ahora + delayMitad)
      console.log(
        `   ✅ Seguimiento intermedio: ${fechaEnvioMitad.toLocaleString('es-MX')} (mitad del periodo)`
      )
      jobsProgramados++
    }

    // 3. SEGUIMIENTO_PREVIO_CITA: 7-10 días antes de la fecha sugerida (usamos 8 días)
    const delay3 = periodoTotal - 8 * 24 * 60 * 60 * 1000
    if (delay3 > 0 && diasTotales >= 10) {
      // Solo si hay suficiente tiempo
      await mensajesQueue.add(
        TipoJob.SEGUIMIENTO_PREVIO_CITA,
        { consultaId },
        {
          jobId: `seguimiento-previo-${consultaId}`,
          delay: delay3,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      )
      const fechaEnvio3 = new Date(ahora + delay3)
      console.log(
        `   ✅ Seguimiento previo cita: ${fechaEnvio3.toLocaleString('es-MX')} (8 días antes)`
      )
      jobsProgramados++
    }
  }

  // RECORDATORIO PARA AGENDAR CITA
  if (tipoSeguimiento === 'SOLO_RECORDATORIO' || tipoSeguimiento === 'RECORDATORIO_Y_SEGUIMIENTO') {
    // RECORDATORIO_AGENDAR: 1 día antes de la fecha sugerida
    const delayRecordatorio = periodoTotal - 1 * 24 * 60 * 60 * 1000

    if (delayRecordatorio <= 0) {
      console.warn(`   ⚠️  La fecha sugerida es muy cercana, no se programará recordatorio`)
    } else {
      await mensajesQueue.add(
        TipoJob.RECORDATORIO_AGENDAR,
        { consultaId },
        {
          jobId: `recordatorio-agendar-${consultaId}`,
          delay: delayRecordatorio,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      )
      const fechaEnvioRecordatorio = new Date(ahora + delayRecordatorio)
      console.log(
        `   ✅ Recordatorio agendar: ${fechaEnvioRecordatorio.toLocaleString('es-MX')} (1 día antes)`
      )
      jobsProgramados++
    }
  }

  console.log(`   📊 Total de mensajes programados: ${jobsProgramados}\n`)
}

/**
 * Cancela todos los jobs pendientes de una cita usando jobIds predecibles (O(1))
 * Mucho más eficiente que escanear todos los jobs
 */
export async function cancelarJobsCita(citaId: string) {
  const jobIds = [
    `confirmacion-${citaId}`,
    `recordatorio-24h-${citaId}`,
    `recordatorio-1h-${citaId}`,
    `marcar-no-asistio-${citaId}`,
  ]

  let cancelados = 0

  for (const jobId of jobIds) {
    try {
      const job = await mensajesQueue.getJob(jobId)
      if (job) {
        await job.remove()
        console.log(`[Queue] Job ${jobId} cancelado`)
        cancelados++
      }
    } catch (error) {
      // Job ya no existe o ya fue procesado, continuar
      console.log(`[Queue] Job ${jobId} no encontrado (ya procesado o no existe)`)
    }
  }

  console.log(`[Queue] ${cancelados} job(s) cancelado(s) para cita: ${citaId}`)
}

/**
 * Cancela SOLO los recordatorios de agendar (NO los seguimientos de apoyo)
 * Se usa cuando el paciente agenda una cita y ya no necesita recordatorios.
 * Busca las consultas del paciente con fecha sugerida cercana y cancela sus jobs por jobId (O(k)).
 */
export async function cancelarRecordatoriosAgendar(pacienteId: string, fechaCitaAgendada: Date) {
  // Buscar consultas del paciente con fecha sugerida cercana (±7 días)
  const consultas = await prisma.consulta.findMany({
    where: {
      paciente_id: pacienteId,
      proxima_cita: {
        gte: new Date(fechaCitaAgendada.getTime() - 7 * 24 * 60 * 60 * 1000),
        lte: new Date(fechaCitaAgendada.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: { id: true },
  })

  let cancelados = 0
  for (const consulta of consultas) {
    try {
      const jobId = `recordatorio-agendar-${consulta.id}`
      const job = await mensajesQueue.getJob(jobId)
      if (job) {
        await job.remove()
        console.log(`✅ [Queue] Recordatorio agendar cancelado (paciente ya agendó cita)`)
        cancelados++
      }
    } catch {
      // Job no existe o ya fue procesado
    }
  }
  console.log(`[Queue] ${cancelados} recordatorio(s) de agendar cancelado(s) para paciente: ${pacienteId}`)
}

/**
 * Cancela todos los jobs de seguimiento de una consulta por jobId (O(1) cada uno)
 */
export async function cancelarJobsSeguimiento(consultaId: string) {
  const jobIds = [
    `seguimiento-inicial-${consultaId}`,
    `seguimiento-intermedio-${consultaId}`,
    `seguimiento-previo-${consultaId}`,
    `recordatorio-agendar-${consultaId}`,
  ]

  let cancelados = 0
  for (const jobId of jobIds) {
    try {
      const job = await mensajesQueue.getJob(jobId)
      if (job) {
        await job.remove()
        console.log(`[Queue] Job ${jobId} cancelado`)
        cancelados++
      }
    } catch {
      // Job no existe o ya fue procesado
    }
  }
  console.log(`[Queue] ${cancelados} job(s) de seguimiento cancelado(s) para consulta: ${consultaId}`)
}
