/**
 * Script para crear un paciente de prueba con 6 consultas variadas
 * para probar los colores y deltas de las gráficas de evolución.
 *
 * Los datos tienen altibajos deliberados para ver verde y rojo en el tooltip.
 *
 * Ejecutar: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-test-charts.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 6 consultas con variaciones realistas (algunas mejoran, otras empeoran)
//
// PESO/IMC: bajar = verde, subir = rojo
// GRASA:    bajar = verde, subir = rojo
// AGUA:     subir = verde, bajar = rojo
// MÚSCULO:  subir = verde, bajar = rojo
// PERÍMETROS: bajar = verde, subir = rojo
// PLIEGUES:   bajar = verde, subir = rojo
//
const CONSULTAS = [
  // Consulta 1 — baseline (sin delta, 5 meses atrás)
  {
    mes: 5, dia: 5,
    peso: 88.0, imc: 30.5, talla: 1.70,
    grasa: 34.0, agua: 47.5, musculo: 52.0, visceral: 13.0,
    cintura: 98.0, cadera: 110.0, brazo_r: 36.0, brazo_f: 38.5, muslo_max: 62.0, muslo_med: 56.0, pantorrilla: 40.0,
    tricipital: 28.0, subescapular: 22.0, bicipital: 14.0, cresta: 25.0, supraespinal: 20.0, abdominal: 30.0,
  },
  // Consulta 2 — mejora general (peso baja, grasa baja, músculo sube)
  {
    mes: 4, dia: 5,
    peso: 86.2, imc: 29.8, talla: 1.70,
    grasa: 33.1, agua: 48.2, musculo: 52.6, visceral: 12.5,
    cintura: 96.5, cadera: 108.5, brazo_r: 35.5, brazo_f: 38.8, muslo_max: 61.0, muslo_med: 55.2, pantorrilla: 39.5,
    tricipital: 26.5, subescapular: 21.0, bicipital: 13.2, cresta: 23.8, supraespinal: 19.0, abdominal: 28.5,
  },
  // Consulta 3 — recaída (peso sube, grasa sube, agua baja)
  {
    mes: 3, dia: 5,
    peso: 87.1, imc: 30.2, talla: 1.70,
    grasa: 33.8, agua: 47.8, musculo: 52.3, visceral: 12.8,
    cintura: 97.2, cadera: 109.0, brazo_r: 35.8, brazo_f: 38.6, muslo_max: 61.5, muslo_med: 55.6, pantorrilla: 39.8,
    tricipital: 27.2, subescapular: 21.5, bicipital: 13.6, cresta: 24.3, supraespinal: 19.5, abdominal: 29.3,
  },
  // Consulta 4 — buena recuperación (peso baja significativo, grasa baja)
  {
    mes: 2, dia: 5,
    peso: 85.0, imc: 29.5, talla: 1.70,
    grasa: 32.5, agua: 48.8, musculo: 53.1, visceral: 12.0,
    cintura: 94.8, cadera: 107.5, brazo_r: 35.0, brazo_f: 39.0, muslo_max: 60.2, muslo_med: 54.5, pantorrilla: 39.0,
    tricipital: 25.8, subescapular: 20.2, bicipital: 12.8, cresta: 23.0, supraespinal: 18.3, abdominal: 27.5,
  },
  // Consulta 5 — meseta con ligero retroceso en agua y músculo
  {
    mes: 1, dia: 5,
    peso: 84.8, imc: 29.4, talla: 1.70,
    grasa: 32.2, agua: 48.5, musculo: 52.9, visceral: 11.8,
    cintura: 94.5, cadera: 107.2, brazo_r: 35.1, brazo_f: 39.1, muslo_max: 60.0, muslo_med: 54.3, pantorrilla: 38.9,
    tricipital: 25.5, subescapular: 20.0, bicipital: 12.5, cresta: 22.8, supraespinal: 18.0, abdominal: 27.0,
  },
  // Consulta 6 — esta semana, resultados mixtos (peso sigue bajando, pero grasa subió un poco)
  {
    mes: 0, dia: 3,
    peso: 83.9, imc: 29.1, talla: 1.70,
    grasa: 32.6, agua: 49.1, musculo: 53.4, visceral: 11.5,
    cintura: 93.8, cadera: 106.8, brazo_r: 34.8, brazo_f: 39.3, muslo_max: 59.5, muslo_med: 54.0, pantorrilla: 38.7,
    tricipital: 25.8, subescapular: 20.4, bicipital: 12.7, cresta: 22.5, supraespinal: 17.8, abdominal: 26.5,
  },
]

function fechaConsulta(mes: number, dia: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - mes)
  d.setDate(dia)
  d.setHours(10, 0, 0, 0)
  return d
}

async function main() {
  console.log('🧪 Creando paciente de prueba para gráficas...')

  // Evitar duplicado
  const existing = await prisma.paciente.findUnique({
    where: { email: 'prueba.graficas@test.com' },
  })
  if (existing) {
    console.log('⚠️  El paciente de prueba ya existe.')
    console.log(`   ID: ${existing.id} — ${existing.nombre}`)
    return
  }

  const paciente = await prisma.paciente.create({
    data: {
      nombre: 'Luis Prueba Gráficas',
      email: 'prueba.graficas@test.com',
      telefono: '+525599990001',
      fecha_nacimiento: new Date('1990-06-15T12:00:00.000Z'),
    },
  })

  console.log(`✅ Paciente creado: ${paciente.nombre} (ID: ${paciente.id})`)
  console.log('📋 Creando 6 consultas con datos variados...\n')

  const notas = [
    'Inicio de tratamiento. Paciente motivado, refiere alimentación alta en carbohidratos y sedentarismo.',
    'Buena adherencia al plan. Redujo harinas y refrescos. Inició caminata 3 veces por semana.',
    'Semana difícil por viaje de trabajo. Comió fuera de casa varios días. Refiere estrés elevado.',
    'Excelente recuperación. Retomó el plan con constancia. Incorporó ejercicio de pesas 2 veces por semana.',
    'Semana con meseta. Mantiene hábitos pero sin variedad. Se ajusta el plan para romper el estancamiento.',
    'Resultados mixtos: peso sigue bajando pero grasa subió levemente. Se revisa composición de macronutrientes.',
  ]

  for (let i = 0; i < CONSULTAS.length; i++) {
    const c = CONSULTAS[i]!
    const prev = i > 0 ? CONSULTAS[i - 1]! : null
    await prisma.consulta.create({
      data: {
        paciente_id: paciente.id,
        fecha: fechaConsulta(c.mes, c.dia),
        motivo: 'Control mensual',
        talla: c.talla,
        peso: c.peso,
        imc: c.imc,
        grasa_corporal: c.grasa,
        porcentaje_agua: c.agua,
        masa_muscular_kg: c.musculo,
        grasa_visceral: c.visceral,
        cintura: c.cintura,
        cadera_maximo: c.cadera,
        brazo_relajado: c.brazo_r,
        brazo_flexionado: c.brazo_f,
        muslo_maximo: c.muslo_max,
        muslo_medio: c.muslo_med,
        pantorrilla_maximo: c.pantorrilla,
        pliegue_tricipital: c.tricipital,
        pliegue_subescapular: c.subescapular,
        pliegue_bicipital: c.bicipital,
        pliegue_cresta_iliaca: c.cresta,
        pliegue_supraespinal: c.supraespinal,
        pliegue_abdominal: c.abdominal,
        notas: notas[i] ?? '',
        objetivo: 'Reducir peso y grasa corporal manteniendo masa muscular.',
        diagnostico: 'Sobrepeso grado I. Sin comorbilidades.',
        observaciones: 'Actividad física moderada.',
        monto_consulta: 500,
        metodo_pago: 'EFECTIVO',
        estado_pago: 'PAGADO',
      },
    })

    const delta_peso = prev != null ? c.peso - prev.peso : null
    const delta_grasa = prev != null ? c.grasa - prev.grasa : null
    console.log(
      `  ✅ Consulta ${i + 1}: ${c.peso} kg (${delta_peso != null ? (delta_peso > 0 ? '+' : '') + delta_peso.toFixed(1) + ' kg' : 'base'}) | grasa ${c.grasa}% (${delta_grasa != null ? (delta_grasa > 0 ? '+' : '') + delta_grasa.toFixed(1) + '%' : 'base'})`
    )
  }

  console.log('\n🎉 Paciente de prueba listo.')
  console.log('   Deltas esperados en tooltip:')
  console.log('   • Consulta 2: todo VERDE (mejora)')
  console.log('   • Consulta 3: peso/grasa/perímetros ROJO (recaída), agua/músculo ROJO')
  console.log('   • Consulta 4: todo VERDE (recuperación)')
  console.log('   • Consulta 5: peso VERDE, agua/músculo ROJO (ligero retroceso)')
  console.log('   • Consulta 6: peso VERDE, grasa ROJO (resultado mixto)')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
