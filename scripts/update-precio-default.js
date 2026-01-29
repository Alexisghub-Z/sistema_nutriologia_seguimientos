const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Verificando configuración actual...')

  const config = await prisma.configuracionGeneral.findFirst()

  if (config) {
    console.log('Configuración encontrada:')
    console.log('- ID:', config.id)
    console.log('- Precio actual:', config.precio_consulta_default.toString())

    if (config.precio_consulta_default.toString() !== '500' && config.precio_consulta_default.toString() !== '500.00') {
      console.log('\nActualizando precio a 500...')
      await prisma.configuracionGeneral.update({
        where: { id: config.id },
        data: { precio_consulta_default: 500.00 }
      })
      console.log('✅ Precio actualizado correctamente a $500.00')
    } else {
      console.log('✅ El precio ya está en $500.00')
    }
  } else {
    console.log('No existe configuración. Creando...')
    await prisma.configuracionGeneral.create({
      data: {
        precio_consulta_default: 500.00
      }
    })
    console.log('✅ Configuración creada con precio $500.00')
  }

  // Verificar resultado
  const updated = await prisma.configuracionGeneral.findFirst()
  console.log('\nConfiguración final:')
  console.log('- Precio default:', updated.precio_consulta_default.toString())
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
