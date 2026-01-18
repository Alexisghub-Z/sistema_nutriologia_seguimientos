// Script para limpiar todos los jobs de la cola
const Queue = require('bull')

const mensajesQueue = new Queue('mensajes-automaticos', {
  redis: {
    host: 'localhost',
    port: 6380,
    password: 'redis123',
  },
})

async function limpiarCola() {
  console.log('\n🧹 Limpiando cola de mensajes...\n')

  await mensajesQueue.clean(0, 'completed')
  console.log('✅ Jobs completados eliminados')

  await mensajesQueue.clean(0, 'failed')
  console.log('✅ Jobs fallidos eliminados')

  await mensajesQueue.clean(0, 'wait')
  console.log('✅ Jobs en espera eliminados')

  await mensajesQueue.clean(0, 'active')
  console.log('✅ Jobs activos eliminados')

  await mensajesQueue.clean(0, 'delayed')
  console.log('✅ Jobs programados eliminados')

  console.log('\n✨ Cola limpia!\n')

  await mensajesQueue.close()
  process.exit(0)
}

limpiarCola().catch(console.error)
