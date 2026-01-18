import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Actualizando configuración con campos de calendario...')

  const config = await prisma.configuracionGeneral.findFirst()

  if (!config) {
    console.log('❌ No se encontró configuración existente')
    console.log('💡 Ejecuta: npx tsx prisma/seed-configuracion.ts')
    return
  }

  // Actualizar con los nuevos campos del calendario
  await prisma.configuracionGeneral.update({
    where: { id: config.id },
    data: {
      horario_inicio: '09:00',
      horario_fin: '18:00',
      duracion_cita_default: 60,
      intervalo_entre_citas: 0,
      dias_laborales: '1,2,3,4,5', // Lun-Vie
      citas_simultaneas_max: 1,
      dias_anticipacion_max: 30,
      horas_anticipacion_min: 24,
    },
  })

  console.log('✅ Configuración actualizada exitosamente:')
  console.log('   📅 Horario: 09:00 - 18:00')
  console.log('   ⏱️  Duración: 60 minutos')
  console.log('   📆 Días laborales: Lun-Vie')
  console.log('   🔢 Citas simultáneas: 1')
  console.log('   📌 Anticipación: 24h - 30 días')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
