/**
 * Cálculos del cuadro dietosintético
 * ============================================================
 * Base científica de una dieta, según el estándar clínico mexicano.
 *
 * Flujo de cálculo:
 *   1. GEB (Gasto Energético Basal)  → Mifflin-St Jeor
 *   2. GET (Gasto Energético Total)  → GEB × factor de actividad
 *   3. kcal meta                     → GET ± ajuste por objetivo
 *   4. Distribución de macronutrientes → % configurables por el nutriólogo
 *
 * Todas las funciones son PURAS (sin efectos secundarios) para poder
 * verificarlas de forma aislada. No dependen de Prisma ni de la red.
 *
 * IMPORTANTE (validación clínica): las fórmulas y constantes aquí son el
 * estándar de referencia (Mifflin-St Jeor, factores de actividad FAO/OMS).
 * El nutriólogo valida los números finales; los % de macros y el ajuste por
 * objetivo son configurables para adaptarse a su criterio.
 */

export type Sexo = 'MASCULINO' | 'FEMENINO'

/**
 * Nivel de actividad física. El factor multiplica al GEB para obtener el GET.
 * Valores estándar FAO/OMS/ONU.
 */
export type NivelActividad =
  | 'SEDENTARIO' // Poco o nada de ejercicio
  | 'LIGERO' // Ejercicio ligero 1-3 días/semana
  | 'MODERADO' // Ejercicio moderado 3-5 días/semana
  | 'ACTIVO' // Ejercicio intenso 6-7 días/semana
  | 'MUY_ACTIVO' // Ejercicio muy intenso / trabajo físico

export const FACTORES_ACTIVIDAD: Record<NivelActividad, number> = {
  SEDENTARIO: 1.2,
  LIGERO: 1.375,
  MODERADO: 1.55,
  ACTIVO: 1.725,
  MUY_ACTIVO: 1.9,
}

/**
 * Objetivo del tratamiento. Determina el ajuste calórico sobre el GET.
 */
export type ObjetivoDieta = 'BAJAR_PESO' | 'MANTENER' | 'SUBIR_PESO'

/**
 * Ajuste calórico por objetivo (kcal a sumar/restar del GET).
 * Un déficit/superávit de ~500 kcal equivale a ~0.5 kg por semana.
 * Configurable: el nutriólogo puede pasar su propio ajuste.
 */
export const AJUSTE_OBJETIVO_DEFAULT: Record<ObjetivoDieta, number> = {
  BAJAR_PESO: -500,
  MANTENER: 0,
  SUBIR_PESO: 400,
}

/**
 * Distribución de macronutrientes en porcentaje del total calórico.
 * Debe sumar 100. Valores por defecto (estándar equilibrado); el nutriólogo
 * los ajusta en su configuración.
 */
export interface DistribucionMacros {
  proteina: number // % del total de kcal
  grasa: number // % del total de kcal
  carbohidrato: number // % del total de kcal
}

export const DISTRIBUCION_MACROS_DEFAULT: DistribucionMacros = {
  proteina: 25,
  grasa: 25,
  carbohidrato: 50,
}

// kcal por gramo de cada macronutriente (factores de Atwater)
export const KCAL_POR_GRAMO = {
  proteina: 4,
  grasa: 9,
  carbohidrato: 4,
} as const

/**
 * Calcula el Gasto Energético Basal (GEB) con la fórmula de Mifflin-St Jeor.
 *
 *   Hombres:  (10 × peso) + (6.25 × talla_cm) − (5 × edad) + 5
 *   Mujeres:  (10 × peso) + (6.25 × talla_cm) − (5 × edad) − 161
 *
 * @param peso   Peso en kilogramos
 * @param tallaCm Talla en centímetros
 * @param edad   Edad en años
 * @param sexo   'MASCULINO' | 'FEMENINO'
 * @returns GEB en kcal/día
 */
export function calcularGEB(peso: number, tallaCm: number, edad: number, sexo: Sexo): number {
  const base = 10 * peso + 6.25 * tallaCm - 5 * edad
  const ajusteSexo = sexo === 'MASCULINO' ? 5 : -161
  return redondear(base + ajusteSexo)
}

/**
 * Calcula el Gasto Energético Total (GET) = GEB × factor de actividad.
 *
 * @param geb            GEB en kcal/día
 * @param nivelActividad Nivel de actividad física
 * @returns GET en kcal/día
 */
export function calcularGET(geb: number, nivelActividad: NivelActividad): number {
  return redondear(geb * FACTORES_ACTIVIDAD[nivelActividad])
}

/**
 * Aplica el ajuste calórico por objetivo sobre el GET para obtener las kcal meta.
 *
 * @param get      GET en kcal/día
 * @param objetivo Objetivo del tratamiento
 * @param ajusteCustom Ajuste en kcal (opcional; si se omite usa el default por objetivo)
 * @returns kcal meta/día (nunca menor a un piso de seguridad)
 */
export function calcularKcalMeta(
  get: number,
  objetivo: ObjetivoDieta,
  ajusteCustom?: number
): number {
  const ajuste = ajusteCustom ?? AJUSTE_OBJETIVO_DEFAULT[objetivo]
  // Piso de seguridad: no recomendar dietas por debajo de 1200 kcal sin
  // supervisión. El nutriólogo puede bajar de aquí manualmente si lo decide.
  const PISO_KCAL = 1200
  return Math.max(redondear(get + ajuste), PISO_KCAL)
}

export interface MacroCalculado {
  gramos: number
  kcal: number
  porcentaje: number
}

export interface MacrosCalculados {
  proteina: MacroCalculado
  grasa: MacroCalculado
  carbohidrato: MacroCalculado
  kcalTotal: number
}

/**
 * Distribuye las kcal meta en gramos de cada macronutriente según los % dados.
 *
 * @param kcalMeta     kcal meta/día
 * @param distribucion % de proteína/grasa/carbohidrato (debe sumar 100)
 * @returns gramos y kcal de cada macro
 * @throws Error si los porcentajes no suman ~100
 */
export function distribuirMacros(
  kcalMeta: number,
  distribucion: DistribucionMacros = DISTRIBUCION_MACROS_DEFAULT
): MacrosCalculados {
  const suma = distribucion.proteina + distribucion.grasa + distribucion.carbohidrato
  if (Math.abs(suma - 100) > 0.5) {
    throw new Error(`Los porcentajes de macronutrientes deben sumar 100 (suman ${suma}).`)
  }

  const calcMacro = (porcentaje: number, kcalGramo: number): MacroCalculado => {
    const kcal = redondear((kcalMeta * porcentaje) / 100)
    const gramos = redondear(kcal / kcalGramo, 1)
    return { gramos, kcal, porcentaje }
  }

  return {
    proteina: calcMacro(distribucion.proteina, KCAL_POR_GRAMO.proteina),
    grasa: calcMacro(distribucion.grasa, KCAL_POR_GRAMO.grasa),
    carbohidrato: calcMacro(distribucion.carbohidrato, KCAL_POR_GRAMO.carbohidrato),
    kcalTotal: kcalMeta,
  }
}

/**
 * Calcula el IMC (Índice de Masa Corporal) = peso / talla²  (talla en metros).
 *
 * @param peso    Peso en kg
 * @param tallaCm Talla en cm
 * @returns IMC con 1 decimal
 */
export function calcularIMC(peso: number, tallaCm: number): number {
  const tallaM = tallaCm / 100
  return redondear(peso / (tallaM * tallaM), 1)
}

/**
 * Clasificación del IMC según la OMS.
 */
export function clasificarIMC(imc: number): string {
  if (imc < 18.5) return 'Bajo peso'
  if (imc < 25) return 'Normal'
  if (imc < 30) return 'Sobrepeso'
  if (imc < 35) return 'Obesidad grado I'
  if (imc < 40) return 'Obesidad grado II'
  return 'Obesidad grado III'
}

/**
 * Peso ideal por el método de Lorentz (referencia orientativa).
 *
 * @param tallaCm Talla en cm
 * @param sexo    Sexo
 * @returns peso ideal aproximado en kg
 */
export function calcularPesoIdeal(tallaCm: number, sexo: Sexo): number {
  const divisor = sexo === 'MASCULINO' ? 4 : 2
  return redondear(tallaCm - 100 - (tallaCm - 150) / divisor, 1)
}

/**
 * Entrada completa para calcular el cuadro dietosintético.
 */
export interface EntradaCuadro {
  peso: number // kg
  tallaCm: number // cm
  edad: number // años
  sexo: Sexo
  nivelActividad: NivelActividad
  objetivo: ObjetivoDieta
  distribucionMacros?: DistribucionMacros
  ajusteObjetivoCustom?: number
}

/**
 * Resultado completo del cuadro dietosintético.
 */
export interface CuadroDietosintetico {
  geb: number
  get: number
  kcalMeta: number
  imc: number
  clasificacionImc: string
  pesoIdeal: number
  macros: MacrosCalculados
}

/**
 * Calcula el cuadro dietosintético completo a partir de los datos del paciente.
 * Orquesta todos los cálculos anteriores en un solo resultado listo para guardar.
 *
 * @throws Error si algún dato de entrada es inválido (no positivo, etc.)
 */
export function calcularCuadroDietosintetico(entrada: EntradaCuadro): CuadroDietosintetico {
  validarEntrada(entrada)

  const geb = calcularGEB(entrada.peso, entrada.tallaCm, entrada.edad, entrada.sexo)
  const get = calcularGET(geb, entrada.nivelActividad)
  const kcalMeta = calcularKcalMeta(get, entrada.objetivo, entrada.ajusteObjetivoCustom)
  const imc = calcularIMC(entrada.peso, entrada.tallaCm)
  const macros = distribuirMacros(kcalMeta, entrada.distribucionMacros)

  return {
    geb,
    get,
    kcalMeta,
    imc,
    clasificacionImc: clasificarIMC(imc),
    pesoIdeal: calcularPesoIdeal(entrada.tallaCm, entrada.sexo),
    macros,
  }
}

function validarEntrada(e: EntradaCuadro): void {
  if (e.peso <= 0 || e.peso > 500) throw new Error(`Peso inválido: ${e.peso} kg`)
  if (e.tallaCm <= 0 || e.tallaCm > 260) throw new Error(`Talla inválida: ${e.tallaCm} cm`)
  if (e.edad <= 0 || e.edad > 120) throw new Error(`Edad inválida: ${e.edad} años`)
}

/**
 * Redondea a `decimales` posiciones (por defecto entero).
 */
function redondear(n: number, decimales = 0): number {
  const factor = Math.pow(10, decimales)
  return Math.round(n * factor) / factor
}
