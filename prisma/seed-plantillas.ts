import { PrismaClient, TipoMensaje } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando plantillas por defecto...')

  const plantillas = [
    {
      nombre: 'Confirmación de Cita',
      tipo: 'AUTOMATICO_CONFIRMACION' as TipoMensaje,
      contenido: `✅ Cita confirmada

Hola {nombre}, tu cita ha sido agendada exitosamente.

📅 Fecha: {fecha_cita}
🕐 Hora: {hora_cita}
📍 Consultorio Dr. Paul

🔑 Código de cita: {codigo_cita}

Usa este código para ver, modificar o cancelar tu cita en:
{url_portal}/cita/{codigo_cita}

Recibirás un recordatorio 24 horas antes.`,
      activa: true,
    },
    {
      nombre: 'Recordatorio 24 horas',
      tipo: 'AUTOMATICO_RECORDATORIO' as TipoMensaje,
      contenido: `🔔 Recordatorio de cita

Hola {nombre}, te recordamos tu cita:

📅 Mañana {fecha_cita}
🕐 A las {hora_cita}
📍 Consultorio Dr. Paul

Por favor confirma:
1️⃣ - Confirmo que asistiré
2️⃣ - No puedo asistir

🔑 Código: {codigo_cita}
Si necesitas reagendar: {url_portal}/cita/{codigo_cita}`,
      activa: true,
    },
    {
      nombre: 'Recordatorio 1 hora',
      tipo: 'AUTOMATICO_RECORDATORIO' as TipoMensaje,
      contenido: `⏰ Tu cita es en 1 hora

Hola {nombre}, te esperamos en:

🕐 1 hora ({hora_cita})
📍 Consultorio Dr. Paul

Nos vemos pronto!`,
      activa: true,
    },
    {
      nombre: 'Seguimiento Post-Consulta',
      tipo: 'AUTOMATICO_SEGUIMIENTO' as TipoMensaje,
      contenido: `🌟 Gracias por tu visita

Hola {nombre}, esperamos que hayas tenido una buena consulta.

Si tienes dudas sobre tu plan nutricional o necesitas agendar tu próxima cita, contáctanos.

¡Mucho éxito! 💪

Consultorio Dr. Paul`,
      activa: true,
    },
    {
      nombre: 'Agradecimiento Post-Consulta',
      tipo: 'AUTOMATICO_SEGUIMIENTO' as TipoMensaje,
      contenido: `Hola {nombre} 👋

Gracias por tu consulta de hoy. Fue un placer atenderte 😊

Recuerda seguir tu plan nutricional y cualquier duda estamos aquí para apoyarte.

Síguenos en nuestras redes sociales para tips, recetas y más contenido de nutrición:
https://linktr.ee/ederalvarez.osmo`,
      activa: true,
    },
    {
      nombre: 'Confirmación de Cancelación',
      tipo: 'MANUAL' as TipoMensaje,
      contenido: `❓ Confirmación de cancelación

Hola {nombre}, ¿estás seguro que deseas cancelar tu cita?

📅 {fecha_cita}
🕐 {hora_cita}

Responde SÍ para confirmar la cancelación.`,
      activa: true,
    },
    {
      nombre: 'Cita Cancelada',
      tipo: 'MANUAL' as TipoMensaje,
      contenido: `❌ Cita cancelada

Hola {nombre}, tu cita del {fecha_cita} a las {hora_cita} ha sido cancelada.

Si deseas agendar una nueva cita, visita:
{url_portal}

¡Gracias!`,
      activa: true,
    },
  ]

  for (const plantilla of plantillas) {
    const existing = await prisma.plantillaMensaje.findFirst({
      where: { nombre: plantilla.nombre },
    })

    if (!existing) {
      await prisma.plantillaMensaje.create({
        data: plantilla,
      })
      console.log(`✅ Plantilla creada: ${plantilla.nombre}`)
    } else {
      console.log(`⏭️  Plantilla ya existe: ${plantilla.nombre}`)
    }
  }

  console.log('✨ Plantillas creadas exitosamente')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
