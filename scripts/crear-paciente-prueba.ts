import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    const paciente = await prisma.paciente.create({
      data: {
        nombre: 'Juan Pérez García',
        email: 'juan.perez@example.com',
        telefono: '5512345678',
        fecha_nacimiento: new Date('1990-05-15'),
      },
    })

    console.log('✅ Paciente creado:', paciente)
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
