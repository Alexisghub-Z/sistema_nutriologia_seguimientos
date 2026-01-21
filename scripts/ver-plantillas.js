/**
 * Script para ver plantillas existentes en la base de datos
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verPlantillas() {
  console.log('📋 Plantillas existentes en la base de datos:\n')

  try {
    const plantillas = await prisma.plantillaMensaje.findMany({
      orderBy: [
        { tipo: 'asc' },
        { nombre: 'asc' },
      ],
    })

    if (plantillas.length === 0) {
      console.log('❌ No hay plantillas en la base de datos')
      return
    }

    for (const plantilla of plantillas) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📝 Nombre: ${plantilla.nombre}`)
      console.log(`📌 Tipo: ${plantilla.tipo}`)
      console.log(`✅ Activa: ${plantilla.activa ? 'Sí' : 'No'}`)
      console.log(`📅 Creada: ${plantilla.createdAt.toLocaleDateString('es-MX')}`)
      console.log(`\n💬 Contenido:`)
      console.log(plantilla.contenido)
      console.log(`\n`)
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`\n📊 Total de plantillas: ${plantillas.length}`)

  } catch (error) {
    console.error('❌ Error al obtener plantillas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verPlantillas()
