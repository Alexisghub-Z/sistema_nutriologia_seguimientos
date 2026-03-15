import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper: fecha relativa a hoy en meses
function mesesAtras(meses: number, dia: number = 10): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - meses)
  d.setDate(dia)
  d.setHours(10, 0, 0, 0)
  return d
}

const PACIENTES_DEMO = [
  {
    nombre: 'Ana Martínez López',
    email: 'ana.martinez.demo@test.com',
    telefono: '+525511111001',
    fecha_nacimiento: new Date('1992-03-14T12:00:00.000Z'),
  },
  {
    nombre: 'Carlos Rodríguez Pérez',
    email: 'carlos.rodriguez.demo@test.com',
    telefono: '+525511111002',
    fecha_nacimiento: new Date('1988-07-22T12:00:00.000Z'),
  },
  {
    nombre: 'Sofía Hernández García',
    email: 'sofia.hernandez.demo@test.com',
    telefono: '+525511111003',
    fecha_nacimiento: new Date('1995-11-05T12:00:00.000Z'),
  },
  {
    nombre: 'Miguel Ángel Torres',
    email: 'miguel.torres.demo@test.com',
    telefono: '+525511111004',
    fecha_nacimiento: new Date('1980-02-18T12:00:00.000Z'),
  },
  {
    nombre: 'Valentina Flores Cruz',
    email: 'valentina.flores.demo@test.com',
    telefono: '+525511111005',
    fecha_nacimiento: new Date('1998-09-30T12:00:00.000Z'),
  },
  {
    nombre: 'Roberto Sánchez Luna',
    email: 'roberto.sanchez.demo@test.com',
    telefono: '+525511111006',
    fecha_nacimiento: new Date('1975-04-12T12:00:00.000Z'),
  },
  {
    nombre: 'Daniela López Vega',
    email: 'daniela.lopez.demo@test.com',
    telefono: '+525511111007',
    fecha_nacimiento: new Date('2000-06-25T12:00:00.000Z'),
  },
  {
    nombre: 'Fernando Morales Díaz',
    email: 'fernando.morales.demo@test.com',
    telefono: '+525511111008',
    fecha_nacimiento: new Date('1983-12-08T12:00:00.000Z'),
  },
  {
    nombre: 'Mariana Castro Reyes',
    email: 'mariana.castro.demo@test.com',
    telefono: '+525511111009',
    fecha_nacimiento: new Date('1990-08-17T12:00:00.000Z'),
  },
]

// Progresión de 12 consultas (de mes -12 a mes -1)
const CONSULTAS_ANA = [
  { mes: 12, peso: 82.5, grasa: 38.2, musculo: 44.1, cintura: 96.0, imc: 29.8, agua: 48.0, visceral: 12.0, cadera: 108.0 },
  { mes: 11, peso: 81.0, grasa: 37.5, musculo: 44.3, cintura: 94.5, imc: 29.2, agua: 48.5, visceral: 11.5, cadera: 106.5 },
  { mes: 10, peso: 79.8, grasa: 36.8, musculo: 44.6, cintura: 93.0, imc: 28.8, agua: 49.0, visceral: 11.0, cadera: 105.0 },
  { mes: 9,  peso: 78.3, grasa: 36.0, musculo: 44.8, cintura: 91.5, imc: 28.3, agua: 49.5, visceral: 10.5, cadera: 104.0 },
  { mes: 8,  peso: 77.0, grasa: 35.2, musculo: 45.1, cintura: 90.0, imc: 27.8, agua: 50.0, visceral: 10.0, cadera: 103.0 },
  { mes: 7,  peso: 75.9, grasa: 34.5, musculo: 45.4, cintura: 88.5, imc: 27.4, agua: 50.5, visceral: 9.5,  cadera: 102.5 },
  { mes: 6,  peso: 74.5, grasa: 33.8, musculo: 45.6, cintura: 87.0, imc: 26.9, agua: 51.0, visceral: 9.0,  cadera: 102.0 },
  { mes: 5,  peso: 73.2, grasa: 33.0, musculo: 45.9, cintura: 85.5, imc: 26.4, agua: 51.0, visceral: 9.0,  cadera: 103.0 },
  { mes: 4,  peso: 72.1, grasa: 32.3, musculo: 46.1, cintura: 84.0, imc: 26.0, agua: 51.5, visceral: 8.5,  cadera: 102.5 },
  { mes: 3,  peso: 71.0, grasa: 31.5, musculo: 46.4, cintura: 83.0, imc: 25.6, agua: 51.5, visceral: 8.5,  cadera: 102.0 },
  { mes: 2,  peso: 70.2, grasa: 30.8, musculo: 46.6, cintura: 82.0, imc: 25.3, agua: 52.0, visceral: 8.0,  cadera: 101.5 },
  { mes: 1,  peso: 69.5, grasa: 30.2, musculo: 46.8, cintura: 81.0, imc: 25.1, agua: 52.0, visceral: 8.0,  cadera: 101.0 },
]

const NOTAS_CONSULTA = [
  'Reporta alimentación desordenada por fiestas. Se refuerza importancia del orden en horarios de comida.',
  'Buena adherencia al plan. Come 4 veces al día, reduce harinas por las noches.',
  'Incorporó más verduras. Redujo refrescos a 1 por semana. Continúa con plan.',
  'Semana difícil por trabajo. Saltó desayunos algunos días. Se ajusta el plan para facilitar rutina.',
  'Mejor control de porciones. Desayuna todos los días. Hidratación adecuada.',
  'Introduce licuados de proteína post-entrenamiento. Reduce snacks procesados.',
  'Excelente adherencia. Come en horarios regulares. Refiere sentirse con más energía.',
  'Ligera recaída por viaje. Regresó al plan al volver. Continúa progresando.',
  'Come 5 veces al día con porciones controladas. Buena variedad de alimentos.',
  'Incorporó más proteína en el desayuno. Reduce carbohidratos simples por la noche.',
  'Adherencia del 90% al plan. Muy buena hidratación. Continúa con ajustes menores.',
  'Control excelente. Logra mantener hábitos incluso en salidas sociales.',
]

const OBJETIVOS_CONSULTA = [
  'Alcanzar 78 kg en los próximos 2 meses. Reducir % de grasa a menos del 35%.',
  'Continuar pérdida de 1-1.5 kg por mes. Establecer horarios fijos de comida.',
  'Reducir grasa visceral. Aumentar masa muscular con actividad física.',
  'Mantener el ritmo de pérdida gradual. Evitar dietas restrictivas.',
  'Llegar a menos del 33% de grasa para el próximo control.',
  'Mejorar composición corporal. Meta: 74 kg para el siguiente mes.',
  'Consolidar hábitos alimenticios. Acercarse al peso saludable (IMC < 25).',
  'Retomar progreso post-viaje. Reforzar plan de alimentación en situaciones sociales.',
  'Continuar bajando cintura. Meta: 83 cm al siguiente control.',
  'Reducir grasa corporal al 30%. Mantener masa muscular > 46 kg.',
  'Llegar a 70 kg para cierre de año. Mantener agua corporal sobre 51%.',
  'Mantener peso logrado. Transición a fase de mantenimiento.',
]

async function main() {
  console.log('🌱 Iniciando seed de datos demo...')

  // Verificar si ya existen datos demo
  const existing = await prisma.paciente.findUnique({
    where: { email: 'ana.martinez.demo@test.com' },
  })

  if (existing) {
    console.log('⚠️  Los datos demo ya existen, omitiendo...')
    return
  }

  // Crear los 9 pacientes
  console.log('👥 Creando 9 pacientes demo...')
  const pacientesCreados: { id: string; nombre: string }[] = []

  for (const datos of PACIENTES_DEMO) {
    const paciente = await prisma.paciente.create({ data: datos })
    pacientesCreados.push({ id: paciente.id, nombre: paciente.nombre })
    console.log(`  ✅ ${paciente.nombre}`)
  }

  // Crear citas pasadas simples para los 8 pacientes restantes
  console.log('📅 Creando citas pasadas para pacientes secundarios...')
  const pacientesSecundarios = pacientesCreados.slice(1)

  for (let i = 0; i < pacientesSecundarios.length; i++) {
    const p = pacientesSecundarios[i]!
    const mesesOffset = (i % 6) + 1

    // 1 cita pasada (completada)
    await prisma.cita.create({
      data: {
        paciente_id: p.id,
        fecha_hora: mesesAtras(mesesOffset, 8 + i),
        duracion_minutos: 60,
        motivo_consulta: 'Control nutricional',
        estado: 'COMPLETADA',
        estado_confirmacion: 'CONFIRMADA',
        confirmada_por_paciente: true,
      },
    })

    // 1 cita futura o reciente
    const citaFutura = new Date()
    citaFutura.setDate(citaFutura.getDate() + ((i + 1) * 5))
    citaFutura.setHours(11 + (i % 4), 0, 0, 0)

    await prisma.cita.create({
      data: {
        paciente_id: p.id,
        fecha_hora: citaFutura,
        duracion_minutos: 60,
        motivo_consulta: 'Seguimiento y ajuste de plan',
        estado: 'PENDIENTE',
        estado_confirmacion: 'PENDIENTE',
      },
    })
  }

  // Crear 12 consultas históricas para Ana Martínez
  const ana = pacientesCreados[0]!
  console.log(`\n📋 Creando 12 consultas históricas para ${ana.nombre}...`)

  for (let i = 0; i < CONSULTAS_ANA.length; i++) {
    const c = CONSULTAS_ANA[i]!
    const fechaConsulta = mesesAtras(c.mes, 10)

    await prisma.consulta.create({
      data: {
        paciente_id: ana.id,
        fecha: fechaConsulta,
        motivo: 'Control mensual',
        talla: 1.66,
        peso: c.peso,
        imc: c.imc,
        grasa_corporal: c.grasa,
        porcentaje_agua: c.agua,
        masa_muscular_kg: c.musculo,
        grasa_visceral: c.visceral,
        cintura: c.cintura,
        cadera_maximo: c.cadera,
        notas: NOTAS_CONSULTA[i]!,
        objetivo: OBJETIVOS_CONSULTA[i]!,
        diagnostico: 'Sobrepeso grado I con distribución central de grasa. Sin comorbilidades activas.',
        observaciones: 'Realiza caminata 3 veces por semana, 30 min. Se recomienda agregar ejercicio de resistencia.',
        monto_consulta: 500.00,
        metodo_pago: 'EFECTIVO',
        estado_pago: 'PAGADO',
      },
    })

    console.log(`  ✅ Consulta mes -${c.mes}: ${c.peso} kg, ${c.grasa}% grasa`)
  }

  console.log('\n🎉 Seed demo completado exitosamente!')
  console.log(`   - 9 pacientes creados`)
  console.log(`   - ${pacientesSecundarios.length * 2} citas creadas para pacientes secundarios`)
  console.log(`   - 12 consultas históricas creadas para Ana Martínez López`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed demo:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
