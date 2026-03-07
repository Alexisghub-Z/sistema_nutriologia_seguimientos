import { mensajesQueue, TipoJob } from './messages'
import {
  procesarConfirmacion,
  procesarRecordatorio24h,
  procesarRecordatorio1h,
  procesarSeguimiento,
  procesarSeguimientoInicial,
  procesarSeguimientoIntermedio,
  procesarSeguimientoPrevioCita,
  procesarRecordatorioAgendar,
  procesarMarcarNoAsistio,
  procesarAgradecimientoConsulta,
} from './jobs/procesadores'

/**
 * Worker para procesar mensajes automáticos
 * Este proceso escucha la cola de Redis y ejecuta los jobs programados
 */

console.log('🚀 Worker de mensajes iniciado')
console.log('🔌 Conectando a Redis:', process.env.REDIS_URL || 'redis://localhost:6380')

// Registrar procesador para confirmaciones (concurrencia: 5)
mensajesQueue.process(TipoJob.CONFIRMACION, 5, async (job) => {
  const { citaId } = job.data

  console.log(`\n📧 [Worker] Procesando confirmación`)
  console.log(`📋 [Worker] Cita ID: ${citaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarConfirmacion(citaId)
    console.log(`✅ [Worker] Confirmación completada`)
  } catch (error) {
    console.error(`❌ [Worker] Error en confirmación:`, error)
    throw error
  }
})

// Registrar procesador para recordatorio 24h (concurrencia: 5)
mensajesQueue.process(TipoJob.RECORDATORIO_24H, 5, async (job) => {
  const { citaId } = job.data

  console.log(`\n📧 [Worker] Procesando recordatorio 24h`)
  console.log(`📋 [Worker] Cita ID: ${citaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarRecordatorio24h(citaId)
    console.log(`✅ [Worker] Recordatorio 24h completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en recordatorio 24h:`, error)
    throw error
  }
})

// Registrar procesador para recordatorio 1h (concurrencia: 5)
mensajesQueue.process(TipoJob.RECORDATORIO_1H, 5, async (job) => {
  const { citaId } = job.data

  console.log(`\n📧 [Worker] Procesando recordatorio 1h`)
  console.log(`📋 [Worker] Cita ID: ${citaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarRecordatorio1h(citaId)
    console.log(`✅ [Worker] Recordatorio 1h completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en recordatorio 1h:`, error)
    throw error
  }
})

// Registrar procesador para seguimiento (legacy) (concurrencia: 3)
mensajesQueue.process(TipoJob.SEGUIMIENTO, 3, async (job) => {
  const { consultaId, tipoSeguimiento } = job.data

  console.log(`\n📧 [Worker] Procesando seguimiento`)
  console.log(`📋 [Worker] Consulta ID: ${consultaId}`)
  console.log(`📝 [Worker] Tipo: ${tipoSeguimiento || 'SOLO_RECORDATORIO'}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarSeguimiento(consultaId, tipoSeguimiento)
    console.log(`✅ [Worker] Seguimiento completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en seguimiento:`, error)
    throw error
  }
})

// Registrar procesador para seguimiento inicial (3-5 días después) (concurrencia: 3)
mensajesQueue.process(TipoJob.SEGUIMIENTO_INICIAL, 3, async (job) => {
  const { consultaId } = job.data

  console.log(`\n📧 [Worker] Procesando seguimiento inicial`)
  console.log(`📋 [Worker] Consulta ID: ${consultaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarSeguimientoInicial(consultaId)
    console.log(`✅ [Worker] Seguimiento inicial completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en seguimiento inicial:`, error)
    throw error
  }
})

// Registrar procesador para seguimiento intermedio (mitad del periodo) (concurrencia: 3)
mensajesQueue.process(TipoJob.SEGUIMIENTO_INTERMEDIO, 3, async (job) => {
  const { consultaId } = job.data

  console.log(`\n📧 [Worker] Procesando seguimiento intermedio`)
  console.log(`📋 [Worker] Consulta ID: ${consultaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarSeguimientoIntermedio(consultaId)
    console.log(`✅ [Worker] Seguimiento intermedio completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en seguimiento intermedio:`, error)
    throw error
  }
})

// Registrar procesador para seguimiento previo cita (7-10 días antes) (concurrencia: 3)
mensajesQueue.process(TipoJob.SEGUIMIENTO_PREVIO_CITA, 3, async (job) => {
  const { consultaId } = job.data

  console.log(`\n📧 [Worker] Procesando seguimiento previo cita`)
  console.log(`📋 [Worker] Consulta ID: ${consultaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarSeguimientoPrevioCita(consultaId)
    console.log(`✅ [Worker] Seguimiento previo cita completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en seguimiento previo cita:`, error)
    throw error
  }
})

// Registrar procesador para recordatorio agendar (3-5 días antes) (concurrencia: 3)
mensajesQueue.process(TipoJob.RECORDATORIO_AGENDAR, 3, async (job) => {
  const { consultaId } = job.data

  console.log(`\n📧 [Worker] Procesando recordatorio agendar`)
  console.log(`📋 [Worker] Consulta ID: ${consultaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarRecordatorioAgendar(consultaId)
    console.log(`✅ [Worker] Recordatorio agendar completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en recordatorio agendar:`, error)
    throw error
  }
})

// Registrar procesador para agradecimiento post-consulta (concurrencia: 3)
mensajesQueue.process(TipoJob.AGRADECIMIENTO_CONSULTA, 3, async (job) => {
  const { consultaId } = job.data

  console.log(`\n📧 [Worker] Procesando agradecimiento post-consulta`)
  console.log(`📋 [Worker] Consulta ID: ${consultaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarAgradecimientoConsulta(consultaId)
    console.log(`✅ [Worker] Agradecimiento post-consulta completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en agradecimiento post-consulta:`, error)
    throw error
  }
})

// Registrar procesador para marcar automáticamente como NO_ASISTIO (concurrencia: 5)
mensajesQueue.process(TipoJob.MARCAR_NO_ASISTIO, 5, async (job) => {
  const { citaId } = job.data

  console.log(`\n⏰ [Worker] Procesando auto-marcar NO_ASISTIO`)
  console.log(`📋 [Worker] Cita ID: ${citaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarMarcarNoAsistio(citaId)
    console.log(`✅ [Worker] Auto-marcar NO_ASISTIO completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en auto-marcar NO_ASISTIO:`, error)
    throw error
  }
})

// Eventos del worker
mensajesQueue.on('completed', (job, _result) => {
  console.log(`\n✅ [Queue] Job ${job.id} completado`)
  console.log(`📝 [Queue] Tipo: ${job.name}`)
})

mensajesQueue.on('failed', (job, err) => {
  console.error(`\n❌ [Queue] Job ${job?.id} falló`)
  console.error(`📝 [Queue] Tipo: ${job?.name}`)
  console.error(`💥 [Queue] Error: ${err.message}`)
  console.error(`🔄 [Queue] Intentos: ${job?.attemptsMade}/${job?.opts.attempts || 3}`)
})

mensajesQueue.on('active', (job) => {
  console.log(`\n⚡ [Queue] Job ${job.id} iniciado`)
  console.log(`📝 [Queue] Tipo: ${job.name}`)
})

mensajesQueue.on('waiting', (jobId) => {
  console.log(`\n⏳ [Queue] Job ${jobId} en espera`)
})

mensajesQueue.on('stalled', (job) => {
  console.warn(`\n⚠️  [Queue] Job ${job.id} estancado, reintentando...`)
})

mensajesQueue.on('error', (error) => {
  console.error('\n❌ [Queue] Error en la cola:', error)
})

// Manejo de señales de terminación
process.on('SIGTERM', async () => {
  console.log('\n👋 SIGTERM recibido, cerrando worker...')
  await mensajesQueue.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('\n👋 SIGINT recibido, cerrando worker...')
  await mensajesQueue.close()
  process.exit(0)
})

console.log('✅ Worker configurado y escuchando...')
console.log('🛑 Presiona Ctrl+C para detener el worker\n')
