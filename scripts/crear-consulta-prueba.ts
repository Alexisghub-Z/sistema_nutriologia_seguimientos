import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Crear una cita de prueba
    const cita = await prisma.cita.create({
      data: {
        paciente_id: 'cmkblg1g0000aywblyrw5hg6k', // Juan Pérez
        fecha_hora: new Date('2026-01-10T10:00:00'),
        duracion_minutos: 60,
        motivo_consulta: 'Control de peso - Primera consulta',
        estado: 'COMPLETADA',
      },
    })

    console.log('✅ Cita creada:', cita.id)

    // Crear consulta asociada
    const consulta = await prisma.consulta.create({
      data: {
        cita_id: cita.id,
        paciente_id: 'cmkblg1g0000aywblyrw5hg6k',
        fecha: new Date('2026-01-10T10:00:00'),
        motivo: 'Primera consulta - Control de peso',
        peso: 85.5,
        talla: 1.7,
        imc: 29.6,
        cintura: 95,
        cadera_maximo: 105,
        brazo_relajado: 32,
        muslo_maximo: 55,
        grasa_corporal: 28.5,
        notas:
          'Paciente presenta sobrepeso. Refiere dificultad para bajar de peso en los últimos 6 meses. Realiza poca actividad física.',
        diagnostico:
          'Sobrepeso grado I (IMC 29.6). Resistencia a la insulina probable. Se requieren estudios de laboratorio.',
        objetivo:
          'Reducir 8kg en 3 meses mediante plan nutricional personalizado y actividad física moderada.',
        plan: 'Plan hipocalórico 1800 kcal/día:\n- Desayuno: Avena con fruta\n- Colación: Frutos secos\n- Comida: Proteína + verduras\n- Colación: Yogurt\n- Cena: Ensalada + proteína ligera',
        observaciones:
          'Paciente motivado. Se le solicitaron estudios de glucosa en ayuno, perfil lipídico y hemoglobina glucosilada.',
        proxima_cita: new Date('2026-02-10T10:00:00'),
      },
    })

    console.log('✅ Consulta creada:', consulta.id)
    console.log('\n📋 Resumen:')
    console.log(`   Paciente: Juan Pérez`)
    console.log(`   Peso: ${consulta.peso} kg`)
    console.log(`   IMC: ${consulta.imc}`)
    console.log(`   Próxima cita: ${consulta.proxima_cita?.toLocaleDateString('es-MX')}`)
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
