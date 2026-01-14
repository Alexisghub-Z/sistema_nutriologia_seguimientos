import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const pacientes = await prisma.paciente.findMany({
      include: {
        _count: {
          select: {
            citas: true,
            consultas: true,
          },
        },
      },
    })

    console.log('📋 Pacientes en la base de datos:', pacientes.length)
    console.log('')
    pacientes.forEach((p) => {
      console.log(`- ${p.nombre} (${p.email})`)
      console.log(`  ID: ${p.id}`)
      console.log(`  Citas: ${p._count.citas} | Consultas: ${p._count.consultas}`)
      console.log('')
    })
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
