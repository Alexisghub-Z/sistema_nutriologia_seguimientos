#!/usr/bin/env node
/**
 * Monitor de Redis con estadísticas en tiempo real
 * Muestra información sobre memoria, keys, y estado del servidor
 */

const Redis = require('redis')

const client = Redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'),
  },
  password: process.env.REDIS_PASSWORD || 'redis123',
})

async function monitorRedis() {
  try {
    await client.connect()

    console.log('\n🔴 ========================================')
    console.log('   MONITOR DE REDIS')
    console.log('   ========================================\n')

    // Ping
    const pong = await client.ping()
    console.log(`✅ Conexión: ${pong === 'PONG' ? 'OK' : 'ERROR'}\n`)

    // Info del servidor
    const info = await client.info('server')
    const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1]
    const uptime = info.match(/uptime_in_days:([^\r\n]+)/)?.[1]

    console.log('📊 Información del Servidor:')
    console.log(`   - Versión: Redis ${redisVersion}`)
    console.log(`   - Uptime: ${uptime} días\n`)

    // Memoria
    const memoryInfo = await client.info('memory')
    const usedMemory = memoryInfo.match(/used_memory_human:([^\r\n]+)/)?.[1]
    const peakMemory = memoryInfo.match(/used_memory_peak_human:([^\r\n]+)/)?.[1]
    const maxMemory = memoryInfo.match(/maxmemory_human:([^\r\n]+)/)?.[1]
    const memoryPolicy = memoryInfo.match(/maxmemory_policy:([^\r\n]+)/)?.[1]

    console.log('💾 Memoria:')
    console.log(`   - Uso actual: ${usedMemory}`)
    console.log(`   - Pico: ${peakMemory}`)
    console.log(`   - Límite: ${maxMemory || 'Sin límite'}`)
    console.log(`   - Política: ${memoryPolicy}\n`)

    // Keys
    const dbSize = await client.dbSize()
    console.log(`🔑 Keys en base de datos: ${dbSize}\n`)

    // Stats específicos de Bull
    console.log('📋 Keys de Bull Queue:')
    const bullKeys = await client.keys('bull:mensajes-automaticos:*')
    const keysTypes = {
      jobs: 0,
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      other: 0,
    }

    for (const key of bullKeys) {
      if (key.includes(':jobs:')) keysTypes.jobs++
      else if (key.includes(':waiting')) keysTypes.waiting++
      else if (key.includes(':active')) keysTypes.active++
      else if (key.includes(':completed')) keysTypes.completed++
      else if (key.includes(':failed')) keysTypes.failed++
      else if (key.includes(':delayed')) keysTypes.delayed++
      else keysTypes.other++
    }

    console.log(`   - Total keys de Bull: ${bullKeys.length}`)
    console.log(`   - Jobs: ${keysTypes.jobs}`)
    console.log(`   - Waiting: ${keysTypes.waiting}`)
    console.log(`   - Active: ${keysTypes.active}`)
    console.log(`   - Completed: ${keysTypes.completed}`)
    console.log(`   - Failed: ${keysTypes.failed}`)
    console.log(`   - Delayed: ${keysTypes.delayed}`)
    console.log(`   - Otros: ${keysTypes.other}\n`)

    // Stats
    const stats = await client.info('stats')
    const totalConnections = stats.match(/total_connections_received:([^\r\n]+)/)?.[1]
    const totalCommands = stats.match(/total_commands_processed:([^\r\n]+)/)?.[1]

    console.log('📈 Estadísticas:')
    console.log(`   - Conexiones totales: ${totalConnections}`)
    console.log(`   - Comandos procesados: ${totalCommands}\n`)

    // Recomendaciones
    console.log('💡 Herramientas Recomendadas:')
    console.log('   - Bull Board: npm run monitor:queue')
    console.log('   - RedisInsight: https://redis.io/insight/')
    console.log('   - Redis Commander: npm install -g redis-commander && redis-commander\n')

  } catch (error) {
    console.error('❌ Error conectando a Redis:', error.message)
    console.log('\n💡 Asegúrate de que Redis esté corriendo:')
    console.log('   npm run docker:up\n')
  } finally {
    await client.quit()
  }
}

monitorRedis()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
