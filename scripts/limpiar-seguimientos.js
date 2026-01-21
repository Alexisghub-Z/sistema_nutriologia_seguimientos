/**
 * Script para limpiar seguimientos huérfanos
 * Busca jobs en la cola que ya no tienen seguimiento_programado en la BD
 */

const { PrismaClient } = require('@prisma/client')
const Bull = require('bull')

const prisma = new PrismaClient()

const mensajesQueue = new Bull('mensajes-automaticos', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6380'),
    password: process.env.REDIS_PASSWORD,
  },
})

async function limpiarSeguimientosHuerfanos() {
  console.log('🧹 Iniciando limpieza de seguimientos huérfanos...\n')

  try {
    // Obtener todos los jobs de seguimiento en la cola
    const jobs = await mensajesQueue.getJobs(['waiting', 'delayed'])
    const jobsSeguimiento = jobs.filter((job) => job.name === 'seguimiento')

    console.log(`📊 Total de jobs de seguimiento en cola: ${jobsSeguimiento.length}`)

    if (jobsSeguimiento.length === 0) {
      console.log('✅ No hay jobs de seguimiento en la cola')
      return
    }

    let limpiezas = 0

    for (const job of jobsSeguimiento) {
      const { consultaId } = job.data

      // Buscar la consulta en la BD
      const consulta = await prisma.consulta.findUnique({
        where: { id: consultaId },
        select: {
          id: true,
          seguimiento_programado: true,
          paciente_id: true,
        },
      })

      if (!consulta) {
        console.log(`🗑️  Job ${job.id}: Consulta ${consultaId} no existe - ELIMINANDO`)
        await job.remove()
        limpiezas++
      } else if (!consulta.seguimiento_programado) {
        console.log(
          `🗑️  Job ${job.id}: Consulta ${consultaId} tiene seguimiento_programado=false - ELIMINANDO`
        )
        await job.remove()

        // Asegurar que la BD esté limpia
        await prisma.consulta.update({
          where: { id: consultaId },
          data: {
            seguimiento_programado: false,
            tipo_seguimiento: null,
          },
        })
        limpiezas++
      } else {
        console.log(`✓ Job ${job.id}: Consulta ${consultaId} está activo y correcto`)
      }
    }

    console.log(`\n✅ Limpieza completada: ${limpiezas} job(s) eliminado(s)`)
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
  } finally {
    await mensajesQueue.close()
    await prisma.$disconnect()
  }
}

limpiarSeguimientosHuerfanos()
