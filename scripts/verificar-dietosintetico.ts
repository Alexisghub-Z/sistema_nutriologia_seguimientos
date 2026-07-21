/**
 * Verificación del módulo de cálculo dietosintético.
 *
 * Ejecuta:  npx tsx scripts/verificar-dietosintetico.ts
 *
 * Comprueba las fórmulas contra valores calculados a mano para casos conocidos.
 * No requiere framework de tests: imprime ✅/❌ y sale con código 1 si algo falla.
 */

import {
  calcularGEB,
  calcularGET,
  calcularKcalMeta,
  calcularIMC,
  clasificarIMC,
  distribuirMacros,
  calcularMLG,
  calcularCuadroDietosintetico,
  DISTRIBUCION_MACROS_DEFAULT,
} from '../src/lib/utils/dietosintetico'
import { sumarEquivalentes, calcularDiferencia, cuadroDistribucion } from '../src/lib/utils/smae'

let fallos = 0

function aprox(actual: number, esperado: number, tolerancia: number, etiqueta: string) {
  const ok = Math.abs(actual - esperado) <= tolerancia
  console.log(
    `${ok ? '✅' : '❌'} ${etiqueta}: obtenido=${actual} esperado≈${esperado} (±${tolerancia})`
  )
  if (!ok) fallos++
}

function igual<T>(actual: T, esperado: T, etiqueta: string) {
  const ok = actual === esperado
  console.log(`${ok ? '✅' : '❌'} ${etiqueta}: obtenido="${actual}" esperado="${esperado}"`)
  if (!ok) fallos++
}

function lanza(fn: () => unknown, etiqueta: string) {
  let lanzo = false
  try {
    fn()
  } catch {
    lanzo = true
  }
  console.log(
    `${lanzo ? '✅' : '❌'} ${etiqueta}: ${lanzo ? 'lanzó error como se esperaba' : 'NO lanzó error'}`
  )
  if (!lanzo) fallos++
}

console.log('\n── GEB (Mifflin-St Jeor) ──')
// Hombre 80kg, 180cm, 30 años:
// 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
aprox(calcularGEB(80, 180, 30, 'MASCULINO'), 1780, 0, 'Hombre 80kg/180cm/30a')
// Mujer 60kg, 165cm, 25 años:
// 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 → 1345
aprox(calcularGEB(60, 165, 25, 'FEMENINO'), 1345, 1, 'Mujer 60kg/165cm/25a')

console.log('\n── GEB otras fórmulas ──')
// Harris-Benedict revisada, hombre 80/180/30:
// 13.397*80 + 4.799*180 - 5.677*30 + 88.362 = 1071.76 + 863.82 - 170.31 + 88.362 = 1853.6 → 1854
aprox(calcularGEB(80, 180, 30, 'MASCULINO', 'HARRIS'), 1854, 1, 'Harris-Benedict hombre')
// Harris mujer 60/165/25:
// 9.247*60 + 3.098*165 - 4.33*25 + 447.593 = 554.82 + 511.17 - 108.25 + 447.593 = 1405.3 → 1405
aprox(calcularGEB(60, 165, 25, 'FEMENINO', 'HARRIS'), 1405, 1, 'Harris-Benedict mujer')
// Katch-McArdle con MLG 65 kg: 370 + 21.6*65 = 370 + 1404 = 1774
aprox(calcularGEB(80, 180, 30, 'MASCULINO', 'KATCH', 65), 1774, 0, 'Katch-McArdle (MLG 65)')
// Cunningham con MLG 65 kg: 500 + 22*65 = 500 + 1430 = 1930
aprox(calcularGEB(80, 180, 30, 'MASCULINO', 'CUNNINGHAM', 65), 1930, 0, 'Cunningham (MLG 65)')
// MLG: 80 kg con 18% grasa = 80*0.82 = 65.6
aprox(calcularMLG(80, 18), 65.6, 0.1, 'MLG (80kg, 18% grasa)')
// Katch sin MLG debe lanzar
lanza(() => calcularGEB(80, 180, 30, 'MASCULINO', 'KATCH'), 'Katch sin MLG lanza error')

console.log('\n── GET (GEB × factor actividad) ──')
// 1780 × 1.55 (moderado) = 2759
aprox(calcularGET(1780, 'MODERADO'), 2759, 1, 'GEB 1780 × moderado')
// 1780 × 1.2 (sedentario) = 2136
aprox(calcularGET(1780, 'SEDENTARIO'), 2136, 0, 'GEB 1780 × sedentario')

console.log('\n── kcal meta (ajuste por objetivo) ──')
// GET 2759, bajar peso (-500) = 2259
aprox(calcularKcalMeta(2759, 'BAJAR_PESO'), 2259, 0, 'GET 2759 bajar peso')
// GET 2759, mantener (0) = 2759
aprox(calcularKcalMeta(2759, 'MANTENER'), 2759, 0, 'GET 2759 mantener')
// GET 2759, subir peso (+400) = 3159
aprox(calcularKcalMeta(2759, 'SUBIR_PESO'), 3159, 0, 'GET 2759 subir peso')
// Piso de seguridad: GET 1500 bajar peso (-500)=1000 → sube a 1200
aprox(calcularKcalMeta(1500, 'BAJAR_PESO'), 1200, 0, 'Piso de seguridad 1200 kcal')

console.log('\n── IMC y clasificación ──')
// 80 / 1.8² = 80/3.24 = 24.69 → 24.7
aprox(calcularIMC(80, 180), 24.7, 0.05, 'IMC 80kg/180cm')
igual(clasificarIMC(24.7), 'Normal', 'Clasificación 24.7')
igual(clasificarIMC(27), 'Sobrepeso', 'Clasificación 27')
igual(clasificarIMC(32), 'Obesidad grado I', 'Clasificación 32')
igual(clasificarIMC(17), 'Bajo peso', 'Clasificación 17')

console.log('\n── Distribución de macros ──')
// 2000 kcal, 25/25/50
// Proteína: 2000*0.25=500 kcal / 4 = 125 g
// Grasa:    2000*0.25=500 kcal / 9 = 55.6 g
// Carbo:    2000*0.50=1000 kcal / 4 = 250 g
const macros = distribuirMacros(2000, DISTRIBUCION_MACROS_DEFAULT)
aprox(macros.proteina.gramos, 125, 0.1, 'Proteína gramos @2000kcal')
aprox(macros.proteina.kcal, 500, 0.1, 'Proteína kcal @2000kcal')
aprox(macros.grasa.gramos, 55.6, 0.2, 'Grasa gramos @2000kcal')
aprox(macros.carbohidrato.gramos, 250, 0.1, 'Carbohidrato gramos @2000kcal')
// La suma de kcal de macros debe aproximar el total
aprox(
  macros.proteina.kcal + macros.grasa.kcal + macros.carbohidrato.kcal,
  2000,
  1,
  'Suma kcal de macros ≈ total'
)

console.log('\n── Validaciones (deben lanzar error) ──')
lanza(
  () => distribuirMacros(2000, { proteina: 30, grasa: 30, carbohidrato: 30 }),
  'Macros que no suman 100'
)
lanza(
  () =>
    calcularCuadroDietosintetico({
      peso: -5,
      tallaCm: 180,
      edad: 30,
      sexo: 'MASCULINO',
      nivelActividad: 'MODERADO',
      objetivo: 'BAJAR_PESO',
    }),
  'Peso negativo'
)

console.log('\n── Cuadro completo (integración) ──')
const cuadro = calcularCuadroDietosintetico({
  peso: 80,
  tallaCm: 180,
  edad: 30,
  sexo: 'MASCULINO',
  nivelActividad: 'MODERADO',
  objetivo: 'BAJAR_PESO',
})
aprox(cuadro.geb, 1780, 0, 'Cuadro.geb')
aprox(cuadro.get, 2759, 1, 'Cuadro.get')
aprox(cuadro.kcalMeta, 2259, 1, 'Cuadro.kcalMeta')
igual(cuadro.clasificacionImc, 'Normal', 'Cuadro.clasificacionImc')
console.log('  Resumen:', JSON.stringify(cuadro, null, 0))

console.log('\n── SMAE: suma de equivalentes ──')
// 3 verduras (25) + 2 frutas (60) + 4 cereales SG (70) = 75+120+280 = 475 kcal
// HCO: 3*4 + 2*15 + 4*15 = 12+30+60 = 102
// Prot: 3*2 + 0 + 4*2 = 6+8 = 14
// Lip: 0
const tot = sumarEquivalentes({ VERDURAS: 3, FRUTAS: 2, CEREALES_SG: 4 })
aprox(tot.kcal, 475, 0, 'SMAE kcal (3V+2F+4CerSG)')
aprox(tot.hco, 102, 0, 'SMAE HCO')
aprox(tot.proteina, 14, 0, 'SMAE proteína')
aprox(tot.lipidos, 0, 0, 'SMAE lípidos')
// Grupo vacío no aporta
const tot0 = sumarEquivalentes({})
aprox(tot0.kcal, 0, 0, 'SMAE sin equivalentes = 0')

console.log('\n── SMAE: diferencia contra meta ──')
// meta 500 kcal, HCO 100g; totales 475 kcal, HCO 102 → dif -25 kcal, +2 HCO
const dif = calcularDiferencia(
  { hco: 102, proteina: 14, lipidos: 0, kcal: 475 },
  { kcalMeta: 500, hco_g: 100, proteina_g: 20, lipidos_g: 10 }
)
aprox(dif.kcal, -25, 0, 'Diferencia kcal (falta 25)')
aprox(dif.hco, 2, 0, 'Diferencia HCO (+2)')
aprox(dif.proteina, -6, 0, 'Diferencia proteína (-6)')

console.log('\n── SMAE: cuadro de distribución ──')
// 2000 kcal, HCO 50% → 1000 kcal / 4 = 250 g; Lip 25% → 500/9 = 55.6; Pro 25% → 500/4 = 125
const dist = cuadroDistribucion(2000, 50, 25, 25)
aprox(dist[0]!.gramos, 250, 0.1, 'Distribución HCO gramos')
aprox(dist[1]!.gramos, 55.6, 0.2, 'Distribución Lípidos gramos')
aprox(dist[2]!.gramos, 125, 0.1, 'Distribución Proteína gramos')
igual(dist[3]!.nombre, 'HCO simples (máx.)', 'Distribución incluye HCO simples')

console.log(`\n${'─'.repeat(40)}`)
if (fallos === 0) {
  console.log('✅ TODOS LOS CÁLCULOS CORRECTOS')
  process.exit(0)
} else {
  console.log(`❌ ${fallos} verificación(es) fallaron`)
  process.exit(1)
}
