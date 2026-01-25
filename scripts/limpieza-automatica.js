#!/usr/bin/env node
// Script de limpieza automática de jobs antiguos
// Se debe ejecutar periódicamente (diariamente recomendado) via cron
// Ejemplo cron: 0 2 * * * cd /path/to/project && node scripts/limpieza-automatica.js

const Queue = require('bull')

const mensajesQueue = new Queue('mensajes-automaticos', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'),
    password: process.env.REDIS_PASSWORD || 'redis123',
  },
})

async function limpiarJobsAntiguos() {
  console.log('\n🧹 [Limpieza Automática] Iniciando limpieza de jobs antiguos...\n')

  try {
    // Eliminar jobs completados con más de 24 horas
    const completedCleaned = await mensajesQueue.clean(24 * 3600 * 1000, 'completed')
    console.log(`✅ ${completedCleaned.length} jobs completados eliminados (>24h)`)

    // Eliminar jobs fallidos con más de 7 días (para debugging)
    const failedCleaned = await mensajesQueue.clean(7 * 24 * 3600 * 1000, 'failed')
    console.log(`✅ ${failedCleaned.length} jobs fallidos eliminados (>7 días)`)

    // Obtener estadísticas actuales
    const counts = await mensajesQueue.getJobCounts()
    console.log('\n📊 Estado actual de la cola:')
    console.log(`   - Esperando: ${counts.waiting}`)
    console.log(`   - Activos: ${counts.active}`)
    console.log(`   - Completados: ${counts.completed}`)
    console.log(`   - Fallidos: ${counts.failed}`)
    console.log(`   - Programados: ${counts.delayed}`)
    console.log(`   - Pausados: ${counts.paused}`)

    console.log('\n✨ Limpieza completada exitosamente!\n')
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
    throw error
  } finally {
    await mensajesQueue.close()
  }
}

// Ejecutar limpieza
limpiarJobsAntiguos()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })
