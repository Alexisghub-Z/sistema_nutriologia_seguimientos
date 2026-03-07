import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Limpiar base de datos (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning database...')
    await prisma.configuracionMensajePaciente.deleteMany()
    await prisma.configuracionMensajeCita.deleteMany()
    await prisma.mensajeWhatsApp.deleteMany()
    await prisma.archivoAdjunto.deleteMany()
    await prisma.consulta.deleteMany()
    await prisma.cita.deleteMany()
    await prisma.paciente.deleteMany()
    await prisma.plantillaWhatsApp.deleteMany()
    await prisma.configuracionSistema.deleteMany()
    await prisma.usuario.deleteMany()
  }

  // Crear usuario admin
  console.log('👤 Creating admin user...')
  const passwordHash = await bcrypt.hash('Cort3z18', 12)
  const admin = await prisma.usuario.create({
    data: {
      email: 'paul_nutricion@hotmail.com',
      nombre: 'Paul Cortes',
      password_hash: passwordHash,
      rol: 'ADMIN',
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Crear plantillas de WhatsApp
  console.log('📝 Creating WhatsApp templates...')
  const plantillaConfirmacion = await prisma.plantillaWhatsApp.create({
    data: {
      nombre: 'confirmacion_cita',
      categoria: 'CONFIRMACION',
      contenido:
        'Hola {nombre}, tu cita ha sido confirmada para el {fecha} a las {hora}. ¡Te esperamos!',
      activa: true,
    },
  })

  const plantillaRecordatorio = await prisma.plantillaWhatsApp.create({
    data: {
      nombre: 'recordatorio_cita',
      categoria: 'RECORDATORIO',
      contenido:
        'Hola {nombre}, te recordamos tu cita de mañana {fecha} a las {hora}. ¡Te esperamos!',
      activa: true,
    },
  })

  const plantillaSeguimiento = await prisma.plantillaWhatsApp.create({
    data: {
      nombre: 'seguimiento_consulta',
      categoria: 'SEGUIMIENTO',
      contenido:
        'Hola {nombre}, ¿cómo has estado? Recuerda seguir las indicaciones de tu última consulta. ¿Tienes alguna duda?',
      activa: true,
    },
  })

  console.log('✅ WhatsApp templates created:', {
    confirmacion: plantillaConfirmacion.nombre,
    recordatorio: plantillaRecordatorio.nombre,
    seguimiento: plantillaSeguimiento.nombre,
  })

  // Crear configuración del sistema
  console.log('⚙️  Creating system configuration...')
  await prisma.configuracionSistema.createMany({
    data: [
      {
        clave: 'nombre_negocio',
        valor: 'Consultorio Nutrición',
        descripcion: 'Nombre del negocio',
      },
      {
        clave: 'duracion_cita_default',
        valor: '60',
        descripcion: 'Duración predeterminada de citas en minutos',
      },
      {
        clave: 'zona_horaria',
        valor: 'America/Mexico_City',
        descripcion: 'Zona horaria del sistema',
      },
      {
        clave: 'recordatorio_horas_antes',
        valor: '24',
        descripcion: 'Horas antes de la cita para enviar recordatorio',
      },
      {
        clave: 'seguimiento_dias_despues',
        valor: '7',
        descripcion: 'Días después de la consulta para enviar seguimiento',
      },
    ],
  })
  console.log('✅ System configuration created')

  // Crear pacientes de ejemplo (opcional, solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('👥 Creating sample patients...')
    const paciente1 = await prisma.paciente.create({
      data: {
        nombre: 'María García',
        email: 'maria.garcia@example.com',
        telefono: '+525512345678',
        fecha_nacimiento: new Date('1990-05-15'),
      },
    })

    const paciente2 = await prisma.paciente.create({
      data: {
        nombre: 'Juan Pérez',
        email: 'juan.perez@example.com',
        telefono: '+525587654321',
        fecha_nacimiento: new Date('1985-08-20'),
      },
    })

    console.log('✅ Sample patients created:', [paciente1.nombre, paciente2.nombre])

    // Crear citas de ejemplo
    console.log('📅 Creating sample appointments...')
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)

    const cita1 = await prisma.cita.create({
      data: {
        paciente_id: paciente1.id,
        fecha_hora: tomorrow,
        duracion_minutos: 60,
        motivo_consulta: 'Control de peso y plan nutricional',
        estado: 'PENDIENTE',
      },
    })

    // Crear configuración de mensajes para la cita
    await prisma.configuracionMensajeCita.create({
      data: {
        cita_id: cita1.id,
        recordatorio_activo: true,
        recordatorio_horas_antes: 24,
        seguimiento_activo: true,
        seguimiento_frecuencia: 7,
      },
    })

    console.log('✅ Sample appointments created')
  }

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
