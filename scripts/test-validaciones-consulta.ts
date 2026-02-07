/**
 * Script de pruebas para validaciones del formulario de consulta
 *
 * Este script prueba todos los rangos de validación del esquema Zod
 * para asegurar que el formulario funcione correctamente.
 *
 * Ejecutar: npx tsx scripts/test-validaciones-consulta.ts
 */

import { z } from 'zod'

// Schema de validación (copiado de /api/consultas/route.ts)
const consultaSchema = z.object({
  cita_id: z.string().min(1, 'ID de cita requerido'),
  paciente_id: z.string().min(1, 'ID de paciente requerido'),
  fecha: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Fecha inválida'),
  motivo: z.string().optional(),

  // Mediciones básicas
  peso: z.number().min(2.5).max(600).optional(),
  talla: z.number().min(0.25).max(5).optional(),

  // Composición corporal
  grasa_corporal: z.number().min(0).max(100).optional(),
  porcentaje_agua: z.number().min(0).max(100).optional(),
  masa_muscular_kg: z.number().min(0.5).max(400).optional(),
  grasa_visceral: z.number().int().min(0).max(60).optional(),

  // Perímetros (cm)
  brazo_relajado: z.number().min(5).max(160).optional(),
  brazo_flexionado: z.number().min(5).max(180).optional(),
  cintura: z.number().min(15).max(400).optional(),
  cadera_maximo: z.number().min(30).max(400).optional(),
  muslo_maximo: z.number().min(10).max(240).optional(),
  muslo_medio: z.number().min(10).max(240).optional(),
  pantorrilla_maximo: z.number().min(10).max(160).optional(),

  // Pliegues cutáneos (mm)
  pliegue_tricipital: z.number().min(0.5).max(120).optional(),
  pliegue_subescapular: z.number().min(0.5).max(120).optional(),
  pliegue_bicipital: z.number().min(0.5).max(120).optional(),
  pliegue_cresta_iliaca: z.number().min(0.5).max(120).optional(),
  pliegue_supraespinal: z.number().min(0.5).max(120).optional(),
  pliegue_abdominal: z.number().min(0.5).max(120).optional(),

  // Notas
  notas: z.string().optional(),
  diagnostico: z.string().optional(),
  objetivo: z.string().optional(),
  plan: z.string().optional(),
  observaciones: z.string().optional(),
  proxima_cita: z.string().optional(),

  // Información financiera
  monto_consulta: z.number().positive().optional(),
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO']).optional(),
  estado_pago: z.enum(['PAGADO', 'PENDIENTE', 'PARCIAL']).optional(),
  notas_pago: z.string().optional(),
})

interface TestCase {
  name: string
  data: any
  shouldPass: boolean
  expectedError?: string
}

const testCases: TestCase[] = [
  // ===== MEDICIONES BÁSICAS =====
  {
    name: '✅ Peso válido mínimo (2.5 kg)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), peso: 2.5 },
    shouldPass: true,
  },
  {
    name: '✅ Peso válido máximo (600 kg)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), peso: 600 },
    shouldPass: true,
  },
  {
    name: '❌ Peso inválido bajo (1 kg)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), peso: 1 },
    shouldPass: false,
    expectedError: 'peso',
  },
  {
    name: '❌ Peso inválido alto (601 kg)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), peso: 601 },
    shouldPass: false,
    expectedError: 'peso',
  },
  {
    name: '✅ Talla válida mínima (0.25 m)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), talla: 0.25 },
    shouldPass: true,
  },
  {
    name: '✅ Talla válida máxima (5 m)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), talla: 5 },
    shouldPass: true,
  },
  {
    name: '❌ Talla inválida baja (0.1 m)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), talla: 0.1 },
    shouldPass: false,
    expectedError: 'talla',
  },

  // ===== COMPOSICIÓN CORPORAL =====
  {
    name: '✅ Grasa corporal válida (50%)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), grasa_corporal: 50 },
    shouldPass: true,
  },
  {
    name: '❌ Grasa corporal inválida (101%)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), grasa_corporal: 101 },
    shouldPass: false,
    expectedError: 'grasa_corporal',
  },
  {
    name: '✅ Masa muscular válida mínima (0.5 kg)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), masa_muscular_kg: 0.5 },
    shouldPass: true,
  },
  {
    name: '✅ Masa muscular válida máxima (400 kg)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), masa_muscular_kg: 400 },
    shouldPass: true,
  },
  {
    name: '❌ Masa muscular inválida (0.3 kg)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), masa_muscular_kg: 0.3 },
    shouldPass: false,
    expectedError: 'masa_muscular_kg',
  },
  {
    name: '✅ Grasa visceral válida (30)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), grasa_visceral: 30 },
    shouldPass: true,
  },
  {
    name: '❌ Grasa visceral inválida (65)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), grasa_visceral: 65 },
    shouldPass: false,
    expectedError: 'grasa_visceral',
  },

  // ===== PERÍMETROS =====
  {
    name: '✅ Brazo relajado válido mínimo (5 cm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), brazo_relajado: 5 },
    shouldPass: true,
  },
  {
    name: '✅ Brazo relajado válido máximo (160 cm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), brazo_relajado: 160 },
    shouldPass: true,
  },
  {
    name: '❌ Brazo relajado inválido (3 cm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), brazo_relajado: 3 },
    shouldPass: false,
    expectedError: 'brazo_relajado',
  },
  {
    name: '✅ Cintura válida (100 cm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), cintura: 100 },
    shouldPass: true,
  },
  {
    name: '❌ Cintura inválida (10 cm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), cintura: 10 },
    shouldPass: false,
    expectedError: 'cintura',
  },
  {
    name: '✅ Cadera máximo válida (100 cm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), cadera_maximo: 100 },
    shouldPass: true,
  },
  {
    name: '❌ Cadera máximo inválida (20 cm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), cadera_maximo: 20 },
    shouldPass: false,
    expectedError: 'cadera_maximo',
  },

  // ===== PLIEGUES CUTÁNEOS =====
  {
    name: '✅ Pliegue tricipital válido mínimo (0.5 mm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), pliegue_tricipital: 0.5 },
    shouldPass: true,
  },
  {
    name: '✅ Pliegue tricipital válido máximo (120 mm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), pliegue_tricipital: 120 },
    shouldPass: true,
  },
  {
    name: '❌ Pliegue tricipital inválido (0.3 mm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), pliegue_tricipital: 0.3 },
    shouldPass: false,
    expectedError: 'pliegue_tricipital',
  },
  {
    name: '❌ Pliegue abdominal inválido (130 mm)',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString(), pliegue_abdominal: 130 },
    shouldPass: false,
    expectedError: 'pliegue_abdominal',
  },

  // ===== CAMPOS OPCIONALES =====
  {
    name: '✅ Todos los campos opcionales vacíos',
    data: { cita_id: 'test', paciente_id: 'test', fecha: new Date().toISOString() },
    shouldPass: true,
  },
  {
    name: '✅ Consulta completa con todos los campos válidos',
    data: {
      cita_id: 'test',
      paciente_id: 'test',
      fecha: new Date().toISOString(),
      peso: 75,
      talla: 1.75,
      grasa_corporal: 20,
      porcentaje_agua: 60,
      masa_muscular_kg: 50,
      grasa_visceral: 8,
      brazo_relajado: 30,
      brazo_flexionado: 32,
      cintura: 85,
      cadera_maximo: 95,
      muslo_maximo: 55,
      muslo_medio: 50,
      pantorrilla_maximo: 38,
      pliegue_tricipital: 15,
      pliegue_subescapular: 18,
      pliegue_bicipital: 12,
      pliegue_cresta_iliaca: 20,
      pliegue_supraespinal: 16,
      pliegue_abdominal: 22,
      motivo: 'Consulta de seguimiento',
      diagnostico: 'Sobrepeso',
      objetivo: 'Bajar 5 kg',
      plan: 'Dieta de 1800 kcal',
      monto_consulta: 500,
      metodo_pago: 'EFECTIVO',
      estado_pago: 'PAGADO',
    },
    shouldPass: true,
  },
]

// Ejecutar pruebas
console.log('\n🧪 INICIANDO PRUEBAS DE VALIDACIÓN DEL FORMULARIO DE CONSULTA\n')
console.log('='  .repeat(70))

let passed = 0
let failed = 0

for (const testCase of testCases) {
  try {
    consultaSchema.parse(testCase.data)

    if (testCase.shouldPass) {
      console.log(`✅ ${testCase.name}`)
      passed++
    } else {
      console.log(`❌ ${testCase.name}`)
      console.log(`   ERROR: Se esperaba que fallara pero pasó`)
      failed++
    }
  } catch (error) {
    if (!testCase.shouldPass) {
      if (error instanceof z.ZodError) {
        const hasExpectedError = testCase.expectedError
          ? error.errors.some(e => e.path.includes(testCase.expectedError!))
          : true

        if (hasExpectedError) {
          console.log(`✅ ${testCase.name}`)
          passed++
        } else {
          console.log(`❌ ${testCase.name}`)
          const errorPath = error.errors[0]?.path?.join('.') || 'campo desconocido'
          console.log(`   ERROR: Campo esperado: ${testCase.expectedError}, pero falló en: ${errorPath}`)
          failed++
        }
      }
    } else {
      console.log(`❌ ${testCase.name}`)
      if (error instanceof z.ZodError) {
        const errorPath = error.errors[0]?.path?.join('.') || 'campo desconocido'
        const errorMessage = error.errors[0]?.message || 'Error desconocido'
        console.log(`   ERROR: ${errorMessage} en ${errorPath}`)
      }
      failed++
    }
  }
}

console.log('='  .repeat(70))
console.log(`\n📊 RESULTADOS:`)
console.log(`   ✅ Pasadas: ${passed}/${testCases.length}`)
console.log(`   ❌ Falladas: ${failed}/${testCases.length}`)
console.log(`   📈 Tasa de éxito: ${((passed / testCases.length) * 100).toFixed(1)}%\n`)

if (failed === 0) {
  console.log('🎉 ¡TODAS LAS PRUEBAS PASARON!\n')
  process.exit(0)
} else {
  console.log('⚠️  ALGUNAS PRUEBAS FALLARON\n')
  process.exit(1)
}
