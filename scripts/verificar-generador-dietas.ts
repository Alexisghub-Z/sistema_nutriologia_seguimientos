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
import { nutrientesDeAlimento, nivelCercania, sumarEquivalentes } from '../src/lib/utils/smae'

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

console.log('\n── Tabla: nutrientes por alimento (SMAE) ──')
// 2 equivalentes de cereal sin grasa (15 HCO, 2 prot, 0 líp, 70 kcal c/u)
const nut = nutrientesDeAlimento('CEREALES_SG', 2)
check(
  nut.hco === 30 && nut.proteina === 4 && nut.lipidos === 0 && nut.kcal === 140,
  `2× cereal = ${JSON.stringify(nut)}`
)
// 1 fruta (15 HCO, 60 kcal)
const nutFruta = nutrientesDeAlimento('FRUTAS', 1)
check(nutFruta.hco === 15 && nutFruta.kcal === 60, `1× fruta = ${JSON.stringify(nutFruta)}`)

console.log('\n── Tabla: la suma por alimento cuadra con sumarEquivalentes ──')
// Suma manual de la dieta dietaOk (t1: 2 cereal + 1 fruta + 1 AOA_BAG)
const totalT1 = [
  nutrientesDeAlimento('CEREALES_SG', 2),
  nutrientesDeAlimento('FRUTAS', 1),
  nutrientesDeAlimento('AOA_BAG', 1),
].reduce(
  (s, n) => ({
    hco: s.hco + n.hco,
    proteina: s.proteina + n.proteina,
    lipidos: s.lipidos + n.lipidos,
    kcal: s.kcal + n.kcal,
  }),
  { hco: 0, proteina: 0, lipidos: 0, kcal: 0 }
)
const totalEquiv = sumarEquivalentes({ CEREALES_SG: 2, FRUTAS: 1, AOA_BAG: 1 })
check(
  totalT1.kcal === totalEquiv.kcal && totalT1.hco === totalEquiv.hco,
  `Suma por alimento (${totalT1.kcal} kcal) == sumarEquivalentes (${totalEquiv.kcal} kcal)`
)

console.log('\n── Gradiente de color: nivelCercania (5 escalones) ──')
check(nivelCercania(0) === 0, `dif 0 → nivel 0 (cuadra)`)
check(nivelCercania(3) === 0, `dif 3 (≤tol 5) → nivel 0`)
check(nivelCercania(8) === 1, `dif 8 → nivel 1 (muy cerca)`)
check(nivelCercania(15) === 2, `dif 15 → nivel 2 (cerca)`)
check(nivelCercania(30) === 3, `dif 30 → nivel 3 (se aleja)`)
check(nivelCercania(60) === 4, `dif 60 → nivel 4 (muy lejos)`)
check(nivelCercania(-60) === 4, `dif negativa también cuenta (abs)`)

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
