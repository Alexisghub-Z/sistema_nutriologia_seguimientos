// Script para ver los jobs en la cola de Redis
const Queue = require('bull')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const mensajesQueue = new Queue('mensajes-automaticos', {
  redis: {
    host: 'localhost',
    port: 6380,
    password: 'redis123',
  },
})

async function obtenerInfoCita(citaId) {
  try {
    const cita = await prisma.cita.findUnique({
      where: { id: citaId },
      include: {
        paciente: {
          select: {
            nombre: true,
          },
        },
      },
    })
    return cita
  } catch (error) {
    return null
  }
}

async function obtenerInfoConsulta(consultaId) {
  try {
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
      include: {
        paciente: {
          select: {
            nombre: true,
          },
        },
      },
    })
    return consulta
  } catch (error) {
    return null
  }
}

async function verCola() {
  console.log('\n📊 Estado de la cola de mensajes:\n')

  const waiting = await mensajesQueue.getWaiting()
  const active = await mensajesQueue.getActive()
  const completed = await mensajesQueue.getCompleted()
  const failed = await mensajesQueue.getFailed()
  const delayed = await mensajesQueue.getDelayed()

  console.log(`⏳ En espera: ${waiting.length}`)
  console.log(`⚡ Activos: ${active.length}`)
  console.log(`✅ Completados: ${completed.length}`)
  console.log(`❌ Fallidos: ${failed.length}`)
  console.log(`⏰ Programados (delayed): ${delayed.length}`)

  if (delayed.length > 0) {
    console.log('\n⏰ Jobs programados:\n')
    for (const job of delayed) {
      const delay = job.opts.delay || 0
      const executeAt = new Date(Date.now() + delay)

      console.log(`  📧 [${job.name}]`)

      // Determinar si es job de seguimiento o de cita
      if (job.name === 'seguimiento') {
        // Obtener información de la consulta
        const consulta = await obtenerInfoConsulta(job.data.consultaId)

        console.log(`     ID Consulta: ${job.data.consultaId}`)

        if (consulta) {
          console.log(`     👤 Paciente: ${consulta.paciente.nombre}`)
          console.log(`     📅 Próxima cita sugerida: ${new Date(consulta.proxima_cita).toLocaleString('es-MX')}`)
          console.log(`     📝 Motivo: ${consulta.motivo || 'No especificado'}`)
        } else {
          console.log(`     ⚠️  Consulta no encontrada (puede haber sido eliminada)`)
        }
      } else {
        // Obtener información de la cita
        const cita = await obtenerInfoCita(job.data.citaId)

        console.log(`     ID Cita: ${job.data.citaId}`)

        if (cita) {
          console.log(`     👤 Paciente: ${cita.paciente.nombre}`)
          console.log(`     📅 Fecha cita: ${new Date(cita.fecha_hora).toLocaleString('es-MX')}`)
          console.log(`     📋 Estado: ${cita.estado}`)
        } else {
          console.log(`     ⚠️  Cita no encontrada (puede haber sido eliminada)`)
        }
      }

      console.log(`     ⏰ Se ejecutará: ${executeAt.toLocaleString('es-MX')}`)
      console.log(`     ⏱️  Delay: ${Math.round(delay / 1000 / 60)} minutos\n`)
    }
  }

  if (waiting.length > 0) {
    console.log('\n⏳ Jobs en espera:\n')
    for (const job of waiting) {
      console.log(`  📧 [${job.name}]`)

      // Determinar si es job de seguimiento o de cita
      if (job.name === 'seguimiento') {
        const consulta = await obtenerInfoConsulta(job.data.consultaId)

        console.log(`     ID Consulta: ${job.data.consultaId}`)

        if (consulta) {
          console.log(`     👤 Paciente: ${consulta.paciente.nombre}`)
          console.log(`     📅 Próxima cita sugerida: ${new Date(consulta.proxima_cita).toLocaleString('es-MX')}`)
        }
      } else {
        const cita = await obtenerInfoCita(job.data.citaId)

        console.log(`     ID Cita: ${job.data.citaId}`)

        if (cita) {
          console.log(`     👤 Paciente: ${cita.paciente.nombre}`)
          console.log(`     📅 Fecha cita: ${new Date(cita.fecha_hora).toLocaleString('es-MX')}`)
        }
      }
      console.log('')
    }
  }

  if (failed.length > 0) {
    console.log('\n❌ Jobs fallidos:\n')
    for (const job of failed) {
      console.log(`  📧 [${job.name}]`)

      // Determinar si es job de seguimiento o de cita
      if (job.name === 'seguimiento') {
        const consulta = await obtenerInfoConsulta(job.data.consultaId)

        console.log(`     ID Consulta: ${job.data.consultaId}`)

        if (consulta) {
          console.log(`     👤 Paciente: ${consulta.paciente.nombre}`)
          console.log(`     📅 Próxima cita sugerida: ${new Date(consulta.proxima_cita).toLocaleString('es-MX')}`)
        }
      } else {
        const cita = await obtenerInfoCita(job.data.citaId)

        console.log(`     ID Cita: ${job.data.citaId}`)

        if (cita) {
          console.log(`     👤 Paciente: ${cita.paciente.nombre}`)
          console.log(`     📅 Fecha cita: ${new Date(cita.fecha_hora).toLocaleString('es-MX')}`)
        }
      }

      console.log(`     💥 Error: ${job.failedReason}`)
      console.log('')
    }
  }

  await prisma.$disconnect()
  await mensajesQueue.close()
  process.exit(0)
}

verCola().catch((error) => {
  console.error('Error:', error)
  prisma.$disconnect()
  process.exit(1)
})
