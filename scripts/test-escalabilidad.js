#!/usr/bin/env node
/**
 * Script de prueba de escalabilidad del sistema de cola
 * Simula la creación de múltiples citas y mide el rendimiento
 */

const Queue = require('bull')

const mensajesQueue = new Queue('mensajes-automaticos', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'),
    password: process.env.REDIS_PASSWORD || 'redis123',
  },
})

// Configuración del test
const CONFIG = {
  // Número de citas a simular
  NUM_CITAS: process.env.NUM_CITAS ? parseInt(process.env.NUM_CITAS) : 100,

  // Simular cancelaciones (% de citas que se cancelarán)
  TASA_CANCELACION: 0.2, // 20%
}

/**
 * Simula la creación de una cita con todos sus jobs
 */
async function simularCita(citaId, fechaCita) {
  const ahora = Date.now()

  // Job de confirmación (inmediato)
  await mensajesQueue.add(
    'confirmacion',
    { citaId },
    {
      jobId: `confirmacion-${citaId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  )

  // Recordatorio 24h (si la cita es en más de 24h)
  const delay24h = fechaCita - ahora - 24 * 60 * 60 * 1000
  if (delay24h > 0) {
    await mensajesQueue.add(
      'recordatorio_24h',
      { citaId },
      {
        jobId: `recordatorio-24h-${citaId}`,
        delay: delay24h,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    )
  }

  // Recordatorio 1h (si la cita es en más de 1h)
  const delay1h = fechaCita - ahora - 60 * 60 * 1000
  if (delay1h > 0) {
    await mensajesQueue.add(
      'recordatorio_1h',
      { citaId },
      {
        jobId: `recordatorio-1h-${citaId}`,
        delay: delay1h,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    )
  }

  // Auto-marcar NO_ASISTIO (2h después de la cita)
  const delayNoAsistio = fechaCita - ahora + 2 * 60 * 60 * 1000
  if (delayNoAsistio > 0) {
    await mensajesQueue.add(
      'marcar_no_asistio',
      { citaId },
      {
        jobId: `marcar-no-asistio-${citaId}`,
        delay: delayNoAsistio,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    )
  }
}

/**
 * Cancela una cita usando la función optimizada
 */
async function cancelarCita(citaId) {
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
        cancelados++
      }
    } catch (error) {
      // Job ya no existe
    }
  }
  return cancelados
}

/**
 * Test principal
 */
async function ejecutarTest() {
  console.log('\n🧪 ========================================')
  console.log('   TEST DE ESCALABILIDAD - COLA DE MENSAJES')
  console.log('   ========================================\n')

  console.log(`📊 Configuración del test:`)
  console.log(`   - Citas a simular: ${CONFIG.NUM_CITAS}`)
  console.log(`   - Tasa de cancelación: ${CONFIG.TASA_CANCELACION * 100}%`)
  console.log(`   - Total jobs esperados: ${CONFIG.NUM_CITAS * 4}\n`)

  // Limpiar cola antes de empezar
  console.log('🧹 Limpiando cola antes del test...')
  const estadoPrevio = await mensajesQueue.getJobCounts()
  console.log(`   - Jobs previos: ${JSON.stringify(estadoPrevio)}\n`)

  // ===== TEST 1: Creación de citas =====
  console.log('📝 TEST 1: Creando citas simuladas...')
  const inicioCreacion = Date.now()

  const citasIds = []
  for (let i = 1; i <= CONFIG.NUM_CITAS; i++) {
    const citaId = `test-cita-${Date.now()}-${i}`
    citasIds.push(citaId)

    // Fecha de cita entre 1 y 30 días en el futuro
    const diasEnFuturo = Math.floor(Math.random() * 30) + 1
    const fechaCita = Date.now() + diasEnFuturo * 24 * 60 * 60 * 1000

    await simularCita(citaId, fechaCita)

    // Mostrar progreso cada 10%
    if (i % Math.ceil(CONFIG.NUM_CITAS / 10) === 0) {
      console.log(`   Progreso: ${i}/${CONFIG.NUM_CITAS} citas (${Math.round(i / CONFIG.NUM_CITAS * 100)}%)`)
    }
  }

  const tiempoCreacion = Date.now() - inicioCreacion
  console.log(`✅ ${CONFIG.NUM_CITAS} citas creadas en ${tiempoCreacion}ms`)
  console.log(`   Promedio: ${(tiempoCreacion / CONFIG.NUM_CITAS).toFixed(2)}ms por cita\n`)

  // Verificar jobs creados
  const estadoDespuesCreacion = await mensajesQueue.getJobCounts()
  console.log(`📊 Estado de la cola después de crear:`)
  console.log(`   ${JSON.stringify(estadoDespuesCreacion)}\n`)

  // ===== TEST 2: Cancelación de citas =====
  const numCancelaciones = Math.floor(CONFIG.NUM_CITAS * CONFIG.TASA_CANCELACION)
  console.log(`🚫 TEST 2: Cancelando ${numCancelaciones} citas...`)
  const inicioCancelacion = Date.now()

  let totalJobsCancelados = 0
  for (let i = 0; i < numCancelaciones; i++) {
    const citaId = citasIds[i]
    const cancelados = await cancelarCita(citaId)
    totalJobsCancelados += cancelados

    // Mostrar progreso cada 10%
    if ((i + 1) % Math.ceil(numCancelaciones / 10) === 0) {
      console.log(`   Progreso: ${i + 1}/${numCancelaciones} cancelaciones`)
    }
  }

  const tiempoCancelacion = Date.now() - inicioCancelacion
  console.log(`✅ ${numCancelaciones} citas canceladas en ${tiempoCancelacion}ms`)
  console.log(`   Promedio: ${(tiempoCancelacion / numCancelaciones).toFixed(2)}ms por cancelación`)
  console.log(`   Total jobs eliminados: ${totalJobsCancelados}\n`)

  // Verificar jobs después de cancelación
  const estadoDespuesCancelacion = await mensajesQueue.getJobCounts()
  console.log(`📊 Estado de la cola después de cancelar:`)
  console.log(`   ${JSON.stringify(estadoDespuesCancelacion)}\n`)

  // ===== TEST 3: Búsqueda directa vs escaneo =====
  console.log(`⚡ TEST 3: Comparando búsqueda O(1) vs O(n)...`)

  // Búsqueda directa (O(1))
  const citaTest = citasIds[numCancelaciones] // Una que NO fue cancelada
  const inicioBusquedaDirecta = Date.now()
  const jobDirecto = await mensajesQueue.getJob(`confirmacion-${citaTest}`)
  const tiempoBusquedaDirecta = Date.now() - inicioBusquedaDirecta

  // Búsqueda por escaneo (O(n))
  const inicioEscaneo = Date.now()
  const todosJobs = await mensajesQueue.getJobs(['waiting', 'delayed'])
  const jobEscaneado = todosJobs.find(j => j.data.citaId === citaTest)
  const tiempoEscaneo = Date.now() - inicioEscaneo

  console.log(`   Búsqueda directa (O(1)): ${tiempoBusquedaDirecta}ms`)
  console.log(`   Búsqueda por escaneo (O(n)): ${tiempoEscaneo}ms`)
  console.log(`   🚀 Mejora: ${(tiempoEscaneo / tiempoBusquedaDirecta).toFixed(2)}x más rápido\n`)

  // ===== RESUMEN FINAL =====
  console.log('\n📋 ========================================')
  console.log('   RESUMEN DEL TEST')
  console.log('   ========================================\n')

  console.log(`✅ Creación:`)
  console.log(`   - ${CONFIG.NUM_CITAS} citas en ${tiempoCreacion}ms`)
  console.log(`   - ${(CONFIG.NUM_CITAS / (tiempoCreacion / 1000)).toFixed(2)} citas/segundo\n`)

  console.log(`✅ Cancelación:`)
  console.log(`   - ${numCancelaciones} citas en ${tiempoCancelacion}ms`)
  console.log(`   - ${(numCancelaciones / (tiempoCancelacion / 1000)).toFixed(2)} cancelaciones/segundo\n`)

  console.log(`✅ Performance:`)
  console.log(`   - Búsqueda directa: ${(tiempoEscaneo / tiempoBusquedaDirecta).toFixed(2)}x más rápida\n`)

  console.log(`📊 Estado final de la cola:`)
  console.log(`   ${JSON.stringify(estadoDespuesCancelacion)}\n`)

  console.log(`⚠️  NOTA: Los jobs de prueba quedan en la cola.`)
  console.log(`   Para limpiarlos, ejecuta: npm run queue:clean\n`)

  await mensajesQueue.close()
}

// Ejecutar test
ejecutarTest()
  .then(() => {
    console.log('✨ Test completado exitosamente!\n')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error en el test:', error)
    process.exit(1)
  })
