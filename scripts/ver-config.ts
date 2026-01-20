import prisma from '../src/lib/prisma'

async function main() {
  console.log('📋 PLANTILLAS DE WHATSAPP:\n')
  const plantillas = await prisma.plantillaWhatsApp.findMany({
    orderBy: { categoria: 'asc' }
  })

  if (plantillas.length === 0) {
    console.log('❌ No hay plantillas registradas\n')
  } else {
    plantillas.forEach(p => {
      console.log('─────────────────────────────────────')
      console.log('Nombre:', p.nombre)
      console.log('Categoría:', p.categoria)
      console.log('Activa:', p.activa ? '✅ Sí' : '❌ No')
      console.log('Twilio SID:', p.twilio_sid || 'No asignado')
      console.log('Contenido:')
      console.log(p.contenido)
      console.log()
    })
  }

  console.log('\n⚙️  CONFIGURACIÓN GENERAL:\n')
  const config = await prisma.configuracionGeneral.findFirst()
  if (config) {
    console.log('Confirmación automática:', config.confirmacion_automatica_activa ? '✅ Activa' : '❌ Inactiva')
    console.log('Recordatorio 24h:', config.recordatorio_24h_activo ? '✅ Activo' : '❌ Inactivo')
    console.log('Recordatorio 1h:', config.recordatorio_1h_activo ? '✅ Activo' : '❌ Inactivo')
    console.log('Seguimiento:', config.seguimiento_activo ? '✅ Activo' : '❌ Inactivo')
    console.log('Días para seguimiento:', config.seguimiento_dias_despues)
  } else {
    console.log('❌ No hay configuración general')
  }

  await prisma.$disconnect()
}

main().catch(console.error)
