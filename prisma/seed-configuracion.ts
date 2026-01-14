import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando configuración general por defecto...')

  // Verificar si ya existe configuración
  const existente = await prisma.configuracionGeneral.findFirst()

  if (existente) {
    console.log('⏭️  Ya existe configuración general')
    return
  }

  // Crear configuración por defecto
  const config = await prisma.configuracionGeneral.create({
    data: {
      recordatorio_24h_activo: true,
      recordatorio_1h_activo: true,
      seguimiento_activo: true,
      seguimiento_dias_despues: 2,
      confirmacion_automatica_activa: true,
      url_portal: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      nombre_consultorio: 'Consultorio Dr. Paul',
      // Configuración del calendario
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

  console.log('✅ Configuración general creada:', {
    id: config.id,
    seguimiento_dias: config.seguimiento_dias_despues,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
