#!/usr/bin/env node
/**
 * Bull Board - Dashboard visual para monitorear la cola de mensajes
 * Accede a http://localhost:3001 después de ejecutar este script
 */

const express = require('express')
const { createBullBoard } = require('@bull-board/api')
const { BullAdapter } = require('@bull-board/api/bullAdapter')
const { ExpressAdapter } = require('@bull-board/express')
const Queue = require('bull')

// Crear cola
const mensajesQueue = new Queue('mensajes-automaticos', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'),
    password: process.env.REDIS_PASSWORD || 'redis123',
  },
})

// Configurar Bull Board
const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/')

createBullBoard({
  queues: [new BullAdapter(mensajesQueue)],
  serverAdapter: serverAdapter,
})

// Crear servidor Express
const app = express()
app.use('/', serverAdapter.getRouter())

const PORT = process.env.BULL_BOARD_PORT || 3001

app.listen(PORT, () => {
  console.log('\n🎯 ========================================')
  console.log('   BULL BOARD - DASHBOARD DE COLA')
  console.log('   ========================================\n')
  console.log(`✅ Dashboard disponible en: http://localhost:${PORT}`)
  console.log('\n📊 Aquí puedes ver:')
  console.log('   - Jobs en espera (waiting)')
  console.log('   - Jobs activos (active)')
  console.log('   - Jobs completados (completed)')
  console.log('   - Jobs fallidos (failed)')
  console.log('   - Jobs programados (delayed)')
  console.log('\n🔧 Acciones disponibles:')
  console.log('   - Ver detalles de cada job')
  console.log('   - Reintentar jobs fallidos')
  console.log('   - Eliminar jobs')
  console.log('   - Limpiar cola')
  console.log('\n🛑 Presiona Ctrl+C para detener el servidor\n')
})
