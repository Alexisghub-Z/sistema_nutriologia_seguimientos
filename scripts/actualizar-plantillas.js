/**
 * Script para actualizar plantillas existentes y crear las nuevas
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function actualizarPlantillas() {
  console.log('🔧 Actualizando plantillas existentes...\n')

  try {
    // 1. Actualizar Confirmación de Cita
    await prisma.plantillaMensaje.updateMany({
      where: { nombre: 'Confirmación de Cita' },
      data: {
        contenido: `✅ Cita confirmada

Hola {nombre}, tu cita ha sido agendada exitosamente.

📅 Fecha: {fecha_cita}
🕐 Hora: {hora_cita}
📍 Consultorio Nutricional

🔑 Código de cita: {codigo_cita}

Usa este código para ver, modificar o cancelar tu cita en:
{url_portal}/cita/{codigo_cita}

Recibirás un recordatorio 24 horas antes.

Paul
Nutriólogo`
      }
    })
    console.log('✅ Actualizada: Confirmación de Cita')

    // 2. Actualizar Recordatorio 24 horas
    await prisma.plantillaMensaje.updateMany({
      where: { nombre: 'Recordatorio 24 horas' },
      data: {
        contenido: `🔔 Recordatorio de cita

Hola {nombre}, te recordamos tu cita:

📅 Mañana {fecha_cita}
🕐 A las {hora_cita}
📍 Consultorio Nutricional

Por favor confirma:
1️⃣ - Confirmo que asistiré
2️⃣ - No puedo asistir

🔑 Código: {codigo_cita}
Si necesitas reagendar: {url_portal}/cita/{codigo_cita}

Paul
Nutriólogo`
      }
    })
    console.log('✅ Actualizada: Recordatorio 24 horas')

    // 3. Actualizar Recordatorio 1 hora
    await prisma.plantillaMensaje.updateMany({
      where: { nombre: 'Recordatorio 1 hora' },
      data: {
        contenido: `⏰ Tu cita es en 1 hora

Hola {nombre}, te esperamos en:

🕐 1 hora ({hora_cita})
📍 Consultorio Nutricional

¡Nos vemos pronto!

Paul
Nutriólogo`
      }
    })
    console.log('✅ Actualizada: Recordatorio 1 hora')

    // 4. Actualizar Seguimiento Post-Consulta
    await prisma.plantillaMensaje.updateMany({
      where: { nombre: 'Seguimiento Post-Consulta' },
      data: {
        contenido: `🌟 Gracias por tu visita

Hola {nombre}, esperamos que hayas tenido una buena consulta.

Si tienes dudas sobre tu plan nutricional o necesitas agendar tu próxima cita, contáctanos.

¡Mucho éxito! 💪

Paul
Nutriólogo`
      }
    })
    console.log('✅ Actualizada: Seguimiento Post-Consulta')

    // 5. Actualizar Cita Cancelada
    await prisma.plantillaMensaje.updateMany({
      where: { nombre: 'Cita Cancelada' },
      data: {
        contenido: `❌ Cita cancelada

Hola {nombre}, tu cita del {fecha_cita} a las {hora_cita} ha sido cancelada.

Si deseas agendar una nueva cita, visita:
{url_portal}

¡Gracias!

Paul
Nutriólogo`
      }
    })
    console.log('✅ Actualizada: Cita Cancelada')

    console.log('\n📝 Creando nuevas plantillas de seguimiento...\n')

    // 6. Crear SEGUIMIENTO_INICIAL
    const existeSeguimientoInicial = await prisma.plantillaMensaje.findFirst({
      where: { nombre: 'Seguimiento Inicial' }
    })

    if (!existeSeguimientoInicial) {
      await prisma.plantillaMensaje.create({
        data: {
          nombre: 'Seguimiento Inicial',
          tipo: 'AUTOMATICO_SEGUIMIENTO',
          contenido: `Hola {nombre} 👋

¿Cómo has estado desde tu última consulta?

Espero que estés siguiendo bien tu plan nutricional. Si has tenido alguna duda o dificultad con las indicaciones, responde este mensaje.

¡Estoy aquí para ayudarte! 💪

Paul
Nutriólogo`,
          activa: true,
        }
      })
      console.log('✅ Creada: Seguimiento Inicial')
    } else {
      console.log('⚠️  Ya existe: Seguimiento Inicial')
    }

    // 7. Crear SEGUIMIENTO_INTERMEDIO
    const existeSeguimientoIntermedio = await prisma.plantillaMensaje.findFirst({
      where: { nombre: 'Seguimiento Intermedio' }
    })

    if (!existeSeguimientoIntermedio) {
      await prisma.plantillaMensaje.create({
        data: {
          nombre: 'Seguimiento Intermedio',
          tipo: 'AUTOMATICO_SEGUIMIENTO',
          contenido: `Hola {nombre} 👋

¿Cómo vas con tu plan nutricional? ¿Has notado algún cambio o mejora en cómo te sientes?

Si necesitas algún ajuste o tienes preguntas sobre tus alimentos, escríbeme.

¡Vas por buen camino! 🥗

Paul
Nutriólogo`,
          activa: true,
        }
      })
      console.log('✅ Creada: Seguimiento Intermedio')
    } else {
      console.log('⚠️  Ya existe: Seguimiento Intermedio')
    }

    // 8. Crear SEGUIMIENTO_PREVIO_CITA
    const existeSeguimientoPrevio = await prisma.plantillaMensaje.findFirst({
      where: { nombre: 'Seguimiento Previo Cita' }
    })

    if (!existeSeguimientoPrevio) {
      await prisma.plantillaMensaje.create({
        data: {
          nombre: 'Seguimiento Previo Cita',
          tipo: 'AUTOMATICO_SEGUIMIENTO',
          contenido: `Hola {nombre} 👋

Tu próxima cita de seguimiento se acerca (sugerida para {fecha_cita}).

¿Cómo te has sentido con el plan? ¿Has tenido alguna dificultad?

Cualquier duda que tengas la resolveremos en tu próxima consulta. ¡Nos vemos pronto! 📊

Paul
Nutriólogo`,
          activa: true,
        }
      })
      console.log('✅ Creada: Seguimiento Previo Cita')
    } else {
      console.log('⚠️  Ya existe: Seguimiento Previo Cita')
    }

    // 9. Crear RECORDATORIO_AGENDAR
    const existeRecordatorioAgendar = await prisma.plantillaMensaje.findFirst({
      where: { nombre: 'Recordatorio Agendar' }
    })

    if (!existeRecordatorioAgendar) {
      await prisma.plantillaMensaje.create({
        data: {
          nombre: 'Recordatorio Agendar',
          tipo: 'AUTOMATICO_RECORDATORIO',
          contenido: `Hola {nombre} 👋

Te recuerdo que tu próxima cita de seguimiento nutricional está sugerida para el {fecha_cita}.

Si aún no has agendado, puedes hacerlo aquí:
{url_portal}

¡Te esperamos! 🗓️

Paul
Nutriólogo`,
          activa: true,
        }
      })
      console.log('✅ Creada: Recordatorio Agendar')
    } else {
      console.log('⚠️  Ya existe: Recordatorio Agendar')
    }

    console.log('\n✅ Proceso completado!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

actualizarPlantillas()
