/**
 * Sistema Mexicano de Alimentos Equivalentes (SMAE)
 * ============================================================
 * Aportes nutricionales por equivalente de cada grupo de alimentos, según el
 * SMAE (Pérez Lizaur et al., 4ª ed.). Un "equivalente" es una porción de un
 * grupo que aporta una cantidad definida de hidratos de carbono (HCO),
 * proteína (Prot), lípidos (Lip) y energía (kcal).
 *
 * El nutriólogo elige CUÁNTOS equivalentes de cada grupo lleva la dieta; el
 * sistema suma los aportes y los compara con la meta del cuadro dietosintético
 * hasta que la diferencia tienda a cero.
 *
 * Estos valores son un ESTÁNDAR clínico: van como constantes. El nutriólogo
 * valida los totales; solo ajusta el número de equivalentes por grupo.
 *
 * Nota sobre las kcal: en el SMAE la energía por equivalente es un valor de
 * tabla redondeado, no exactamente HCO*4 + Prot*4 + Lip*9. Guardamos la kcal
 * oficial de tabla (`kcal`) para los totales que ve el nutriólogo.
 */

export type GrupoSMAEId =
  | 'VERDURAS'
  | 'FRUTAS'
  | 'CEREALES_SG' // sin grasa
  | 'CEREALES_CG' // con grasa
  | 'LEGUMINOSAS'
  | 'AOA_MBAG' // alimento de origen animal, muy bajo aporte de grasa
  | 'AOA_BAG' // bajo aporte de grasa
  | 'AOA_MAG' // moderado aporte de grasa
  | 'AOA_AAG' // alto aporte de grasa
  | 'LECHE_DES' // descremada
  | 'LECHE_SEMI' // semidescremada
  | 'LECHE_ENTERA'
  | 'LECHE_CA' // con azúcar
  | 'ACEITES_SP' // sin proteína
  | 'ACEITES_CP' // con proteína
  | 'AZUCAR_SG' // sin grasa
  | 'AZUCAR_CG' // con grasa

export interface GrupoSMAE {
  id: GrupoSMAEId
  nombre: string
  hco: number // g de hidratos de carbono por equivalente
  proteina: number // g de proteína por equivalente
  lipidos: number // g de lípidos por equivalente
  kcal: number // energía por equivalente (valor de tabla SMAE)
}

/**
 * Aportes por equivalente — SMAE 4ª ed.
 * Orden igual al que usa el nutriólogo en su cuadro.
 */
export const GRUPOS_SMAE: GrupoSMAE[] = [
  { id: 'VERDURAS', nombre: 'Verduras', hco: 4, proteina: 2, lipidos: 0, kcal: 25 },
  { id: 'FRUTAS', nombre: 'Frutas', hco: 15, proteina: 0, lipidos: 0, kcal: 60 },
  { id: 'CEREALES_SG', nombre: 'Cereales sin grasa', hco: 15, proteina: 2, lipidos: 0, kcal: 70 },
  { id: 'CEREALES_CG', nombre: 'Cereales con grasa', hco: 15, proteina: 2, lipidos: 5, kcal: 115 },
  { id: 'LEGUMINOSAS', nombre: 'Leguminosas', hco: 20, proteina: 8, lipidos: 1, kcal: 120 },
  {
    id: 'AOA_MBAG',
    nombre: 'AOA muy bajo aporte de grasa',
    hco: 0,
    proteina: 7,
    lipidos: 1,
    kcal: 40,
  },
  { id: 'AOA_BAG', nombre: 'AOA bajo aporte de grasa', hco: 0, proteina: 7, lipidos: 3, kcal: 55 },
  {
    id: 'AOA_MAG',
    nombre: 'AOA moderado aporte de grasa',
    hco: 0,
    proteina: 7,
    lipidos: 5,
    kcal: 75,
  },
  { id: 'AOA_AAG', nombre: 'AOA alto aporte de grasa', hco: 0, proteina: 7, lipidos: 8, kcal: 100 },
  { id: 'LECHE_DES', nombre: 'Leche descremada', hco: 12, proteina: 9, lipidos: 2, kcal: 95 },
  { id: 'LECHE_SEMI', nombre: 'Leche semidescremada', hco: 12, proteina: 9, lipidos: 4, kcal: 110 },
  { id: 'LECHE_ENTERA', nombre: 'Leche entera', hco: 12, proteina: 9, lipidos: 8, kcal: 150 },
  { id: 'LECHE_CA', nombre: 'Leche con azúcar', hco: 30, proteina: 8, lipidos: 5, kcal: 200 },
  {
    id: 'ACEITES_SP',
    nombre: 'Aceites y grasas sin proteína',
    hco: 0,
    proteina: 0,
    lipidos: 5,
    kcal: 45,
  },
  {
    id: 'ACEITES_CP',
    nombre: 'Aceites y grasas con proteína',
    hco: 3,
    proteina: 3,
    lipidos: 5,
    kcal: 70,
  },
  { id: 'AZUCAR_SG', nombre: 'Azúcares sin grasa', hco: 10, proteina: 0, lipidos: 0, kcal: 40 },
  { id: 'AZUCAR_CG', nombre: 'Azúcares con grasa', hco: 10, proteina: 1, lipidos: 5, kcal: 85 },
]

/** kcal por gramo de cada macronutriente (Atwater) — para el cuadro de distribución. */
export const KCAL_POR_GRAMO = { hco: 4, proteina: 4, lipidos: 9 } as const

/** Equivalentes elegidos por el nutriólogo: { VERDURAS: 3, FRUTAS: 2, ... }. */
export type Equivalentes = Partial<Record<GrupoSMAEId, number>>

export interface TotalesMacro {
  hco: number
  proteina: number
  lipidos: number
  kcal: number
}

/**
 * Suma los aportes de todos los grupos según los equivalentes elegidos.
 *
 * @param equivalentes nº de equivalentes por grupo
 * @returns totales de HCO, proteína, lípidos (g) y kcal
 */
export function sumarEquivalentes(equivalentes: Equivalentes): TotalesMacro {
  const total: TotalesMacro = { hco: 0, proteina: 0, lipidos: 0, kcal: 0 }
  for (const grupo of GRUPOS_SMAE) {
    const n = equivalentes[grupo.id] ?? 0
    if (!n) continue
    total.hco += grupo.hco * n
    total.proteina += grupo.proteina * n
    total.lipidos += grupo.lipidos * n
    total.kcal += grupo.kcal * n
  }
  return {
    hco: redondear(total.hco, 1),
    proteina: redondear(total.proteina, 1),
    lipidos: redondear(total.lipidos, 1),
    kcal: redondear(total.kcal),
  }
}

// ============================================================
// Distribución en tiempos de comida
// ============================================================
// El nutriólogo reparte los equivalentes totales de cada grupo entre varios
// tiempos de comida (configurables: Desayuno, Colación, Comida, etc.).

/** Un tiempo de comida con nombre editable. */
export interface TiempoComida {
  id: string // identificador estable (ej. "t1")
  nombre: string // "Desayuno", "Colación 1", "Pre-entreno"...
}

/** Reparto: para cada tiempo, cuántos equivalentes de cada grupo lleva. */
export type DistribucionTiempos = Record<string, Equivalentes> // { "t1": { VERDURAS: 1, ... } }

/** Tiempos de comida por defecto (los 5 clásicos del SMAE). */
export const TIEMPOS_DEFAULT: TiempoComida[] = [
  { id: 't1', nombre: 'Desayuno' },
  { id: 't2', nombre: 'Colación 1' },
  { id: 't3', nombre: 'Comida' },
  { id: 't4', nombre: 'Colación 2' },
  { id: 't5', nombre: 'Cena' },
]

/**
 * Resumen nutricional de un tiempo de comida (los equivalentes que se le
 * asignaron). Reutiliza sumarEquivalentes.
 *
 * @param equivalentesTiempo equivalentes por grupo asignados a ese tiempo
 */
export function resumenTiempo(equivalentesTiempo: Equivalentes): TotalesMacro {
  return sumarEquivalentes(equivalentesTiempo)
}

/**
 * Suma cuántos equivalentes de un grupo se repartieron entre todos los tiempos.
 *
 * @param distribucion reparto por tiempo
 * @param grupo grupo del SMAE
 * @returns total de equivalentes repartidos de ese grupo
 */
export function repartidoDeGrupo(distribucion: DistribucionTiempos, grupo: GrupoSMAEId): number {
  let suma = 0
  for (const tiempoId of Object.keys(distribucion)) {
    suma += distribucion[tiempoId]?.[grupo] ?? 0
  }
  return Math.round(suma * 2) / 2 // medios equivalentes
}

/** Estado del cuadre de un grupo: lo repartido vs el total disponible. */
export interface CuadreGrupo {
  grupo: GrupoSMAEId
  total: number // equivalentes definidos en la pestaña 1
  repartido: number // equivalentes repartidos en los tiempos
  completo: boolean // repartido === total
}

/**
 * Valida, para cada grupo con equivalentes, cuántos se repartieron vs el total.
 * Solo considera grupos con total > 0 (los que el nutriólogo definió).
 *
 * @param totales      equivalentes totales por grupo (pestaña 1)
 * @param distribucion reparto por tiempo (pestaña 2)
 */
export function validarDistribucion(
  totales: Equivalentes,
  distribucion: DistribucionTiempos
): CuadreGrupo[] {
  const cuadres: CuadreGrupo[] = []
  for (const grupo of GRUPOS_SMAE) {
    const total = totales[grupo.id] ?? 0
    if (!total) continue
    const repartido = repartidoDeGrupo(distribucion, grupo.id)
    cuadres.push({
      grupo: grupo.id,
      total,
      repartido,
      completo: Math.abs(repartido - total) < 0.001,
    })
  }
  return cuadres
}

export interface MetaMacros {
  kcalMeta: number
  hco_g: number
  proteina_g: number
  lipidos_g: number
}

export interface DiferenciaMacros {
  hco: number // g (total − meta); negativo = falta
  proteina: number
  lipidos: number
  kcal: number
}

/**
 * Diferencia entre lo sumado por equivalentes y la meta del cuadro.
 * El nutriólogo ajusta equivalentes hasta que estas diferencias tiendan a cero.
 */
export function calcularDiferencia(totales: TotalesMacro, meta: MetaMacros): DiferenciaMacros {
  return {
    hco: redondear(totales.hco - meta.hco_g, 1),
    proteina: redondear(totales.proteina - meta.proteina_g, 1),
    lipidos: redondear(totales.lipidos - meta.lipidos_g, 1),
    kcal: redondear(totales.kcal - meta.kcalMeta),
  }
}

export interface FilaDistribucion {
  nombre: string
  porcentaje: number // % del total calórico
  kcal: number
  gramos: number
}

/**
 * Cuadro de distribución final (HCO / Lípidos / Proteína) a partir de la meta.
 * Es la tabla "Porcentaje | Kcal | Gramos" que acompaña al cuadro dietosintético.
 *
 * @param kcalMeta   kcal meta/día
 * @param pctHco     % de hidratos de carbono
 * @param pctLip     % de lípidos
 * @param pctPro     % de proteína
 * @param pctHcoSimples % máximo recomendado de HCO simples (informativo, típico <10%)
 */
export function cuadroDistribucion(
  kcalMeta: number,
  pctHco: number,
  pctLip: number,
  pctPro: number,
  pctHcoSimples = 10
): FilaDistribucion[] {
  const fila = (nombre: string, pct: number, kcalGramo: number): FilaDistribucion => {
    const kcal = redondear((kcalMeta * pct) / 100)
    return { nombre, porcentaje: pct, kcal, gramos: redondear(kcal / kcalGramo, 1) }
  }
  return [
    fila('HCO', pctHco, KCAL_POR_GRAMO.hco),
    fila('Lípidos', pctLip, KCAL_POR_GRAMO.lipidos),
    fila('Proteína', pctPro, KCAL_POR_GRAMO.proteina),
    fila('HCO simples (máx.)', pctHcoSimples, KCAL_POR_GRAMO.hco),
  ]
}

function redondear(n: number, decimales = 0): number {
  const factor = Math.pow(10, decimales)
  return Math.round(n * factor) / factor
}
