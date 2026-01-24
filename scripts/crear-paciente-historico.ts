import prisma from '../src/lib/prisma'

async function main() {
  console.log('🏥 Creando paciente con historial clínico...\n')

  // Datos del paciente
  const pacienteData = {
    nombre: 'Manuel Antonio Guzmán',
    email: 'manuel.guzman@example.com',
    telefono: '+525512345679',
    fecha_nacimiento: new Date('1990-05-15'),
  }

  // Crear paciente
  console.log('👤 Creando paciente:', pacienteData.nombre)
  const paciente = await prisma.paciente.create({
    data: pacienteData,
  })
  console.log('✅ Paciente creado con ID:', paciente.id)
  console.log('')

  // Talla del paciente
  const talla = 1.68

  // Datos de las consultas históricas
  const consultas = [
    {
      fecha: new Date('2025-03-04'),
      peso: 80.4,
      grasa_corporal: 26.7,
      porcentaje_agua: 53.4,
      masa_muscular_kg: 56,
      grasa_visceral: 8,
      brazo_relajado: 35.8,
      brazo_flexionado: 37.5,
      cintura: 90,
      cadera_maximo: 101,
      muslo_maximo: 61.5,
      muslo_medio: 55,
      pantorrilla_maximo: 36.5,
      pliegue_tricipital: 9,
      pliegue_subescapular: 20,
      pliegue_bicipital: 8,
      pliegue_cresta_iliaca: 33,
      pliegue_supraespinal: 27,
      pliegue_abdominal: 33,
    },
    {
      fecha: new Date('2025-04-02'),
      peso: 79.8,
      grasa_corporal: 25.4,
      porcentaje_agua: 54.1,
      masa_muscular_kg: 56.5,
      grasa_visceral: 7.5,
      brazo_relajado: 35.5,
      brazo_flexionado: 37,
      cintura: 91,
      cadera_maximo: 100,
      muslo_maximo: 62,
      muslo_medio: 55,
      pantorrilla_maximo: 36.7,
      pliegue_tricipital: 9,
      pliegue_subescapular: 17,
      pliegue_bicipital: 9,
      pliegue_cresta_iliaca: 30,
      pliegue_supraespinal: 24,
      pliegue_abdominal: 35,
    },
    {
      fecha: new Date('2025-06-07'),
      peso: 80.7,
      grasa_corporal: 26.6,
      porcentaje_agua: 53.5,
      masa_muscular_kg: 56.3,
      grasa_visceral: 8,
      brazo_relajado: 35.4,
      brazo_flexionado: 37,
      cintura: 90.5,
      cadera_maximo: 100,
      muslo_maximo: 61,
      muslo_medio: 56,
      pantorrilla_maximo: 36.5,
      pliegue_tricipital: 16,
      pliegue_subescapular: 21,
      pliegue_bicipital: 10,
      pliegue_cresta_iliaca: 30,
      pliegue_supraespinal: 25,
      pliegue_abdominal: 35,
    },
    {
      fecha: new Date('2025-07-05'),
      peso: 79.9,
      grasa_corporal: 25.3,
      porcentaje_agua: 54.2,
      masa_muscular_kg: 56.5,
      grasa_visceral: 7,
      brazo_relajado: 35,
      brazo_flexionado: 37.5,
      cintura: 90.5,
      cadera_maximo: 101,
      muslo_maximo: 63,
      muslo_medio: 55,
      pantorrilla_maximo: 37,
      pliegue_tricipital: 11,
      pliegue_subescapular: 21,
      pliegue_bicipital: 10,
      pliegue_cresta_iliaca: 33,
      pliegue_supraespinal: 25,
      pliegue_abdominal: 34,
    },
    {
      fecha: new Date('2025-07-05T12:00:00'), // Segunda consulta el mismo día (hora diferente)
      peso: 80.7,
      grasa_corporal: 26.6,
      porcentaje_agua: 53.5,
      masa_muscular_kg: 56.3,
      grasa_visceral: 8,
      brazo_relajado: 35.4,
      brazo_flexionado: 37,
      cintura: 90.5,
      cadera_maximo: 100.5,
      muslo_maximo: 61,
      muslo_medio: 56,
      pantorrilla_maximo: 36.5,
      pliegue_tricipital: 16,
      pliegue_subescapular: 21,
      pliegue_bicipital: 10,
      pliegue_cresta_iliaca: 30,
      pliegue_supraespinal: 25,
      pliegue_abdominal: 35,
    },
    {
      fecha: new Date('2025-08-09'),
      peso: 81.8,
      grasa_corporal: 27.5,
      porcentaje_agua: 53.1,
      masa_muscular_kg: 56.4,
      grasa_visceral: 8.5,
      brazo_relajado: 36.2,
      brazo_flexionado: 37,
      cintura: 91,
      cadera_maximo: 101.5,
      muslo_maximo: 63.5,
      muslo_medio: 56,
      pantorrilla_maximo: 36.5,
      pliegue_tricipital: null, // Vacío en los datos
      pliegue_subescapular: null,
      pliegue_bicipital: null,
      pliegue_cresta_iliaca: null,
      pliegue_supraespinal: null,
      pliegue_abdominal: null,
    },
    {
      fecha: new Date('2025-09-08'),
      peso: 81.2,
      grasa_corporal: 26.9,
      porcentaje_agua: 53.3,
      masa_muscular_kg: 56.4,
      grasa_visceral: 8,
      brazo_relajado: 36.5,
      brazo_flexionado: 37,
      cintura: 92,
      cadera_maximo: 102,
      muslo_maximo: 63.5,
      muslo_medio: 57,
      pantorrilla_maximo: 37,
      pliegue_tricipital: null,
      pliegue_subescapular: null,
      pliegue_bicipital: null,
      pliegue_cresta_iliaca: null,
      pliegue_supraespinal: null,
      pliegue_abdominal: null,
    },
    {
      fecha: new Date('2025-10-10'),
      peso: 81.3,
      grasa_corporal: 29.4,
      porcentaje_agua: 52.3,
      masa_muscular_kg: 54.5,
      grasa_visceral: 9,
      brazo_relajado: 36.8,
      brazo_flexionado: 38,
      cintura: 93,
      cadera_maximo: 102,
      muslo_maximo: 64.5,
      muslo_medio: 56.5,
      pantorrilla_maximo: 37,
      pliegue_tricipital: 12,
      pliegue_subescapular: 22,
      pliegue_bicipital: 10,
      pliegue_cresta_iliaca: null,
      pliegue_supraespinal: null,
      pliegue_abdominal: null,
    },
    {
      fecha: new Date('2025-11-20'),
      peso: 82.9,
      grasa_corporal: 27.2,
      porcentaje_agua: 53.1,
      masa_muscular_kg: 57.4,
      grasa_visceral: 8,
      brazo_relajado: 36.2,
      brazo_flexionado: 37.5,
      cintura: 95,
      cadera_maximo: 104,
      muslo_maximo: 63.5,
      muslo_medio: 57,
      pantorrilla_maximo: 37,
      pliegue_tricipital: 15,
      pliegue_subescapular: 25,
      pliegue_bicipital: 10,
      pliegue_cresta_iliaca: null,
      pliegue_supraespinal: null,
      pliegue_abdominal: null,
    },
    {
      fecha: new Date('2025-12-20'),
      peso: 82,
      grasa_corporal: 29,
      porcentaje_agua: 52.4,
      masa_muscular_kg: 55.3,
      grasa_visceral: 9,
      brazo_relajado: 36.3,
      brazo_flexionado: 37.3,
      cintura: 92,
      cadera_maximo: 102,
      muslo_maximo: 63.5,
      muslo_medio: 58,
      pantorrilla_maximo: 37,
      pliegue_tricipital: 11,
      pliegue_subescapular: 23,
      pliegue_bicipital: 10,
      pliegue_cresta_iliaca: null,
      pliegue_supraespinal: null,
      pliegue_abdominal: null,
    },
  ]

  console.log(`📋 Creando ${consultas.length} consultas históricas...\n`)

  // Crear consultas históricas
  for (let i = 0; i < consultas.length; i++) {
    const consultaData = consultas[i]
    if (!consultaData) continue

    // Calcular IMC
    const imc = consultaData.peso / (talla * talla)

    await prisma.consulta.create({
      data: {
        paciente_id: paciente.id,
        fecha: consultaData.fecha,
        motivo: `Consulta de seguimiento #${i + 1}`,
        peso: consultaData.peso,
        talla,
        imc: Math.round(imc * 10) / 10,
        grasa_corporal: consultaData.grasa_corporal,
        porcentaje_agua: consultaData.porcentaje_agua,
        masa_muscular_kg: consultaData.masa_muscular_kg,
        grasa_visceral: consultaData.grasa_visceral,
        brazo_relajado: consultaData.brazo_relajado,
        brazo_flexionado: consultaData.brazo_flexionado,
        cintura: consultaData.cintura,
        cadera_maximo: consultaData.cadera_maximo,
        muslo_maximo: consultaData.muslo_maximo,
        muslo_medio: consultaData.muslo_medio,
        pantorrilla_maximo: consultaData.pantorrilla_maximo,
        pliegue_tricipital: consultaData.pliegue_tricipital,
        pliegue_subescapular: consultaData.pliegue_subescapular,
        pliegue_bicipital: consultaData.pliegue_bicipital,
        pliegue_cresta_iliaca: consultaData.pliegue_cresta_iliaca,
        pliegue_supraespinal: consultaData.pliegue_supraespinal,
        pliegue_abdominal: consultaData.pliegue_abdominal,
      },
    })

    console.log(
      `✅ Consulta ${i + 1}/${consultas.length}: ${consultaData.fecha.toLocaleDateString('es-MX')} - Peso: ${consultaData.peso}kg, IMC: ${Math.round(imc * 10) / 10}`
    )
  }

  console.log('\n🎉 ¡Paciente e historial creados exitosamente!')
  console.log(`\n📊 Resumen:`)
  console.log(`   - Paciente ID: ${paciente.id}`)
  console.log(`   - Nombre: ${paciente.nombre}`)
  console.log(`   - Email: ${paciente.email}`)
  console.log(`   - Consultas registradas: ${consultas.length}`)
  console.log(
    `   - Rango de fechas: ${consultas[0]?.fecha.toLocaleDateString('es-MX')} - ${consultas[consultas.length - 1]?.fecha.toLocaleDateString('es-MX')}`
  )
  console.log(
    `   - Peso inicial: ${consultas[0]?.peso}kg → Peso final: ${consultas[consultas.length - 1]?.peso}kg`
  )
  const pesoFinal = consultas[consultas.length - 1]?.peso
  const pesoInicial = consultas[0]?.peso
  if (pesoFinal && pesoInicial) {
    console.log(`   - Cambio: ${(pesoFinal - pesoInicial).toFixed(1)}kg`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
