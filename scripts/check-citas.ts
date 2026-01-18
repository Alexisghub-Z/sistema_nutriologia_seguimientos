import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCitas() {
  const citas = await prisma.cita.findMany({
    where: {
      fecha_hora: {
        gte: new Date('2026-01-16T00:00:00.000Z'),
        lte: new Date('2026-01-16T23:59:59.999Z'),
      }
    },
    include: {
      paciente: {
        select: {
          nombre: true,
          email: true
        }
      }
    },
    orderBy: {
      fecha_hora: 'asc'
    }
  })

  console.log(`📅 Citas en el sistema para 2026-01-16:`)
  console.log(`Total: ${citas.length}\n`)

  citas.forEach((cita, i) => {
    const fechaLocal = new Date(cita.fecha_hora).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
    console.log(`${i + 1}. ${cita.paciente.nombre}`)
    console.log(`   Hora UTC: ${cita.fecha_hora.toISOString()}`)
    console.log(`   Hora Local: ${fechaLocal}`)
    console.log(`   Estado: ${cita.estado}`)
    console.log(`   Duración: ${cita.duracion_minutos} min`)
    console.log(`   ID: ${cita.id}\n`)
  })

  await prisma.$disconnect()
}

checkCitas().catch(console.error)
