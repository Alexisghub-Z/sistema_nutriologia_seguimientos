/**
 * Verificación del motor de generación de dietas (Fase B).
 *
 * Ejecuta:  npx tsx scripts/verificar-generador-dietas.ts
 *
 * Prueba la lógica pura (validación de equivalentes) SIN llamar a OpenAI.
 * Con OPENAI_API_KEY + AI_ENABLED=true y el flag --live hace una generación real.
 */

import {
  validarDietaGenerada,
  isGeneradorDisponible,
  generarDietaConIA,
  type EntradaGeneracion,
  type DietaGenerada,
} from '../src/lib/services/generador-dietas'

let fallos = 0
function check(cond: boolean, etiqueta: string) {
  console.log(`${cond ? '✅' : '❌'} ${etiqueta}`)
  if (!cond) fallos++
}

// Entrada de ejemplo: 2 tiempos con equivalentes definidos.
const entrada: EntradaGeneracion = {
  kcalMeta: 1800,
  macros: { proteina_g: 112, grasa_g: 50, carbohidrato_g: 225 },
  tiempos: [
    { id: 't1', nombre: 'Desayuno', equivalentes: { CEREALES_SG: 2, FRUTAS: 1, AOA_BAG: 1 } },
    { id: 't3', nombre: 'Comida', equivalentes: { CEREALES_SG: 3, VERDURAS: 2, AOA_BAG: 2 } },
  ],
  perfil: {
    region: 'Oaxaca, México',
    alimentos_tipicos: 'tlayudas, quintoniles, frijol negro, quesillo',
  },
}

console.log('── Validación: dieta que SÍ respeta los equivalentes ──')
// Dieta perfecta: cumple exactamente los equivalentes pedidos.
const dietaOk: DietaGenerada = {
  mensaje: 'Listo',
  tiempos: [
    {
      id: 't1',
      nombre: 'Desayuno',
      alimentos: [
        { grupo: 'CEREALES_SG', equivalentes: 2, descripcion: '2 memelas de frijol' },
        { grupo: 'FRUTAS', equivalentes: 1, descripcion: '1 taza de papaya' },
        { grupo: 'AOA_BAG', equivalentes: 1, descripcion: '30 g de quesillo' },
      ],
    },
    {
      id: 't3',
      nombre: 'Comida',
      alimentos: [
        { grupo: 'CEREALES_SG', equivalentes: 3, descripcion: '3 tortillas' },
        { grupo: 'VERDURAS', equivalentes: 2, descripcion: 'ensalada de quintoniles' },
        { grupo: 'AOA_BAG', equivalentes: 2, descripcion: '60 g de pollo' },
      ],
    },
  ],
}
const disc1 = validarDietaGenerada(entrada, dietaOk)
check(disc1.length === 0, `Sin discrepancias (obtuvo ${disc1.length})`)

console.log('\n── Validación: dieta que NO respeta (falta 1 cereal en comida) ──')
const dietaMal: DietaGenerada = JSON.parse(JSON.stringify(dietaOk))
dietaMal.tiempos[1]!.alimentos[0]!.equivalentes = 2 // pidió 3, propone 2
const disc2 = validarDietaGenerada(entrada, dietaMal)
check(disc2.length === 1, `Detecta 1 discrepancia (obtuvo ${disc2.length})`)
check(
  disc2[0]?.grupo === 'CEREALES_SG' && disc2[0]?.pedido === 3 && disc2[0]?.propuesto === 2,
  `Discrepancia correcta: ${JSON.stringify(disc2[0])}`
)

console.log('\n── Validación: tiempo completamente ausente ──')
const dietaVacia: DietaGenerada = { mensaje: '', tiempos: [] }
const disc3 = validarDietaGenerada(entrada, dietaVacia)
check(disc3.length > 0, `Detecta faltantes cuando no hay tiempos (${disc3.length} discrepancias)`)

console.log(`\n${'─'.repeat(40)}`)
if (fallos === 0) {
  console.log('✅ LÓGICA DEL GENERADOR CORRECTA')
} else {
  console.log(`❌ ${fallos} verificación(es) fallaron`)
  process.exit(1)
}

// --- Generación real (opcional, con --live) ---
if (process.argv.includes('--live')) {
  ;(async () => {
    console.log('\n── Generación REAL con OpenAI (--live) ──')
    if (!isGeneradorDisponible()) {
      console.log('⚠️  OpenAI no configurado (OPENAI_API_KEY + AI_ENABLED=true). Se omite.')
      return
    }
    const dieta = await generarDietaConIA(entrada)
    console.log('Mensaje IA:', dieta.mensaje)
    for (const t of dieta.tiempos) {
      console.log(`\n${t.nombre}:`)
      for (const a of t.alimentos) {
        console.log(`  · ${a.descripcion} (${a.equivalentes} de ${a.grupo})`)
      }
    }
    const disc = validarDietaGenerada(entrada, dieta)
    console.log(
      `\nRespeta los equivalentes: ${disc.length === 0 ? '✅ SÍ' : `❌ ${disc.length} discrepancias`}`
    )
    if (disc.length > 0) console.log(JSON.stringify(disc, null, 2))
  })().catch((e) => {
    console.error('ERROR en generación real:', e.message)
    process.exit(1)
  })
}
