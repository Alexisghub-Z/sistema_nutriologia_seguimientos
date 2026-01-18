import { mensajesQueue, TipoJob } from './messages'
import {
  procesarConfirmacion,
  procesarRecordatorio24h,
  procesarRecordatorio1h,
  procesarSeguimiento,
} from './jobs/procesadores'

/**
 * Worker para procesar mensajes automáticos
 * Este proceso escucha la cola de Redis y ejecuta los jobs programados
 */

console.log('🚀 Worker de mensajes iniciado')
console.log('🔌 Conectando a Redis:', {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6380,
})

// Registrar procesador para confirmaciones
mensajesQueue.process(TipoJob.CONFIRMACION, async (job) => {
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

// Registrar procesador para recordatorio 24h
mensajesQueue.process(TipoJob.RECORDATORIO_24H, async (job) => {
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

// Registrar procesador para recordatorio 1h
mensajesQueue.process(TipoJob.RECORDATORIO_1H, async (job) => {
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

// Registrar procesador para seguimiento
mensajesQueue.process(TipoJob.SEGUIMIENTO, async (job) => {
  const { consultaId } = job.data

  console.log(`\n📧 [Worker] Procesando seguimiento`)
  console.log(`📋 [Worker] Consulta ID: ${consultaId}`)
  console.log(`🔄 [Worker] Intento: ${job.attemptsMade + 1}/${job.opts.attempts || 3}`)

  try {
    await procesarSeguimiento(consultaId)
    console.log(`✅ [Worker] Seguimiento completado`)
  } catch (error) {
    console.error(`❌ [Worker] Error en seguimiento:`, error)
    throw error
  }
})

// Eventos del worker
mensajesQueue.on('completed', (job, result) => {
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
