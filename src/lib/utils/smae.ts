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

/**
 * Porciones-equivalente verificadas para los grupos donde la IA suele fallar
 * (cereales y leguminosas: confunde peso crudo vs cocido). Cada entrada es la
 * MEDIDA CASERA que equivale a 1 equivalente SMAE. Se inyecta en el prompt como
 * referencia para que la IA use la porción correcta, sin perder flexibilidad en
 * el resto de grupos (que la IA maneja bien).
 *
 * Fuente: medidas caseras del SMAE (1 equivalente por porción indicada).
 */
export const PORCIONES_REFERENCIA: Partial<Record<GrupoSMAEId, string[]>> = {
  CEREALES_SG: [
    'Tortilla de maíz: 1 pieza (30 g)',
    'Pan de caja: 1 rebanada',
    'Arroz cocido: 1/4 de taza',
    'Pasta cocida: 1/2 taza',
    'Avena cruda: 1/3 de taza (~20 g); cocida: 1/2 taza',
    'Papa cocida: 1/2 pieza chica (~70 g)',
    'Bolillo sin migajón: 1/3 de pieza',
    'Galletas saladas: 4 piezas',
  ],
  CEREALES_CG: ['Tlacoyo: 1/2 pieza', 'Tamal: 1/3 de pieza', 'Papas fritas: 1/2 taza'],
  LEGUMINOSAS: [
    'Frijol cocido: 1/2 taza (~85 g)',
    'Lenteja cocida: 1/2 taza',
    'Garbanzo cocido: 1/2 taza',
    'Haba cocida: 1/2 taza',
  ],
}

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

// Aportes por equivalente indexados por id de grupo (acceso O(1)).
const APORTE_POR_GRUPO = Object.fromEntries(GRUPOS_SMAE.map((g) => [g.id, g])) as Record<
  GrupoSMAEId,
  GrupoSMAE
>

/**
 * Nutrientes que aporta un alimento según su grupo y nº de equivalentes.
 * Es el aporte del SMAE (exacto), no un valor inventado. Base de la tabla de
 * comprobación de la dieta generada por IA.
 *
 * @param grupo        grupo SMAE del alimento
 * @param equivalentes nº de equivalentes de ese grupo que aporta el alimento
 */
export function nutrientesDeAlimento(grupo: GrupoSMAEId, equivalentes: number): TotalesMacro {
  const g = APORTE_POR_GRUPO[grupo]
  const n = equivalentes || 0
  if (!g) return { hco: 0, proteina: 0, lipidos: 0, kcal: 0 }
  return {
    hco: redondear(g.hco * n, 1),
    proteina: redondear(g.proteina * n, 1),
    lipidos: redondear(g.lipidos * n, 1),
    kcal: redondear(g.kcal * n),
  }
}

/**
 * Nivel de cercanía de una diferencia a cero, en 5 escalones. Sirve para
 * pintar un gradiente (verde → lima → amarillo → naranja → rojo) según qué tan
 * cerca está el total de la meta.
 *
 * @param diferencia  total − meta (en la unidad que sea)
 * @param tolerancia  margen considerado "en meta" (nivel 0). Por defecto 5.
 * @returns 0 (cuadra) … 4 (muy lejos)
 */
export function nivelCercania(diferencia: number, tolerancia = 5): 0 | 1 | 2 | 3 | 4 {
  const abs = Math.abs(diferencia)
  if (abs <= tolerancia) return 0
  if (abs <= tolerancia * 2) return 1
  if (abs <= tolerancia * 4) return 2
  if (abs <= tolerancia * 7) return 3
  return 4
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
 * Rol de un tiempo de comida, inferido de su nombre. Sirve para repartir los
 * equivalentes con la misma lógica que usaría un nutriólogo: las comidas
 * fuertes concentran cereales, AOA y verduras; las colaciones llevan sobre todo
 * fruta, lácteos y algún cereal ligero.
 */
export type RolTiempo = 'principal' | 'colacion'

/**
 * Clasifica un tiempo por su nombre. "Desayuno", "Comida"/"Almuerzo" y "Cena"
 * son principales; "Colación", "Snack", "Refrigerio", "Merienda", "Pre/Post
 * entreno" son colaciones. Si no se reconoce, se asume principal (más seguro:
 * recibe carga completa antes que dejar comida en una colación).
 */
export function rolDeTiempo(nombre: string): RolTiempo {
  const n = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  if (/(colacion|snack|refrigerio|merienda|entreno|colación|tentempie)/.test(n)) {
    return 'colacion'
  }
  return 'principal'
}

/**
 * Peso (preferencia) de cada grupo en cada rol de tiempo. Valores relativos:
 * cuanto más alto, más equivalentes de ese grupo tienden a caer en ese rol.
 * 0 = ese grupo normalmente NO va en ese rol. Refleja práctica dietética común
 * mexicana (SMAE): verduras y AOA en comidas fuertes, fruta en colaciones, etc.
 */
const PESO_ROL: Record<GrupoSMAEId, { principal: number; colacion: number }> = {
  VERDURAS: { principal: 3, colacion: 1 },
  FRUTAS: { principal: 1, colacion: 3 },
  CEREALES_SG: { principal: 3, colacion: 1 },
  CEREALES_CG: { principal: 3, colacion: 1 },
  LEGUMINOSAS: { principal: 3, colacion: 0 },
  AOA_MBAG: { principal: 3, colacion: 1 },
  AOA_BAG: { principal: 3, colacion: 1 },
  AOA_MAG: { principal: 3, colacion: 0 },
  AOA_AAG: { principal: 3, colacion: 0 },
  LECHE_DES: { principal: 1, colacion: 3 },
  LECHE_SEMI: { principal: 1, colacion: 3 },
  LECHE_ENTERA: { principal: 1, colacion: 3 },
  LECHE_CA: { principal: 1, colacion: 3 },
  ACEITES_SP: { principal: 3, colacion: 1 },
  ACEITES_CP: { principal: 2, colacion: 1 },
  AZUCAR_SG: { principal: 2, colacion: 1 },
  AZUCAR_CG: { principal: 2, colacion: 1 },
}

/**
 * Genera automáticamente una distribución de los equivalentes entre los tiempos
 * de comida, imitando el criterio de un nutriólogo capacitado. Garantiza que la
 * suma repartida de cada grupo sea EXACTAMENTE la del cuadro (cuadre perfecto),
 * trabajando en medios equivalentes.
 *
 * Método: para cada grupo se calcula un peso por tiempo (según el rol del
 * tiempo) y se reparten sus equivalentes de forma proporcional a esos pesos,
 * usando el método del mayor residuo sobre medios-equivalentes para que la suma
 * cierre exacta.
 *
 * @param totales   equivalentes por grupo del cuadro (pestaña 1)
 * @param tiempos   tiempos de comida definidos (con su nombre → rol)
 * @param variacion semilla opcional: con la misma semilla el resultado es
 *                  idéntico; cambiándola se obtiene otra propuesta igualmente
 *                  válida (misma lógica, cuadre exacto). Útil para el botón
 *                  "Proponer distribución" que ofrece alternativas al reclicar.
 * @returns reparto { tiempoId: { grupo: equivalentes } }
 */
export function distribuirEnTiemposAuto(
  totales: Equivalentes,
  tiempos: TiempoComida[],
  variacion = 0
): DistribucionTiempos {
  const reparto: DistribucionTiempos = {}
  for (const t of tiempos) reparto[t.id] = {}
  if (tiempos.length === 0) return reparto

  const roles = tiempos.map((t) => rolDeTiempo(t.nombre))
  const hayColacion = roles.includes('colacion')

  // PRNG determinista (mulberry32) sembrado con la variación: misma semilla →
  // mismo resultado; distinta semilla → propuesta diferente pero válida.
  let semilla = (variacion * 2654435761) >>> 0
  const rand = () => {
    semilla |= 0
    semilla = (semilla + 0x6d2b79f5) | 0
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  for (const grupo of GRUPOS_SMAE) {
    const totalGrupo = totales[grupo.id] ?? 0
    if (totalGrupo <= 0) continue

    // Unidades de medio-equivalente a repartir (enteras).
    const unidades = Math.round(totalGrupo * 2)

    // Peso de cada tiempo para este grupo. Cuando variacion !== 0 se añade un
    // pequeño "jitter" (±35%) a cada peso, para que el reparto cambie sin
    // romper el criterio (un tiempo de peso 0 sigue en 0).
    const pesos = tiempos.map((_t, i) => {
      const rol = roles[i] ?? 'principal'
      let w = PESO_ROL[grupo.id][rol]
      // Si NO hay ningún tiempo tipo colación, no anulamos grupos "de colación":
      // se reparten igualmente en los principales para no perder equivalentes.
      if (w === 0 && !hayColacion) w = 1
      if (w > 0 && variacion !== 0) {
        const jitter = 0.65 + rand() * 0.7 // factor en [0.65, 1.35]
        w = w * jitter
      }
      return w
    })

    const sumaPesos = pesos.reduce((a, b) => a + b, 0)
    if (sumaPesos === 0) {
      // Ningún tiempo admite el grupo: cae todo en el primer principal.
      const idx = roles.indexOf('principal')
      const destino = tiempos[idx >= 0 ? idx : 0]
      if (destino) reparto[destino.id]![grupo.id] = totalGrupo
      continue
    }

    // Reparto proporcional con método del mayor residuo (cuadre exacto).
    const ideales = pesos.map((w) => (unidades * w) / sumaPesos)
    const base = ideales.map((x) => Math.floor(x))
    const asignadas = base.reduce((a, b) => a + b, 0)
    let faltan = unidades - asignadas

    const orden = ideales
      .map((x, i) => ({ i, resto: x - Math.floor(x), peso: pesos[i]! }))
      .filter((o) => o.peso > 0)
      .sort((a, b) => b.resto - a.resto || b.peso - a.peso)

    const cantidades = [...base]
    let k = 0
    while (faltan > 0 && orden.length > 0) {
      const destino = orden[k % orden.length]!
      cantidades[destino.i] = (cantidades[destino.i] ?? 0) + 1
      faltan -= 1
      k += 1
    }

    tiempos.forEach((t, i) => {
      const cant = cantidades[i] ?? 0
      if (cant > 0) reparto[t.id]![grupo.id] = cant / 2
    })
  }

  return reparto
}

// ============================================================
// Propuesta automática de equivalentes por grupo (pestaña "Cuadro")
// ============================================================

/** Meta de macros (g) que la propuesta de equivalentes debe aproximar. */
export interface MetaEquivalentes {
  hco_g: number
  proteina_g: number
  lipidos_g: number
  kcalMeta: number
}

/** PRNG determinista (mulberry32) sembrado por una semilla entera. */
function prng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const elegir = <T,>(arr: readonly T[], r: number): T => arr[Math.floor(r * arr.length) % arr.length]!

/**
 * Propone automáticamente los equivalentes de cada grupo para acercarse a la
 * meta de macros, con un patrón alimentario saludable y balanceado (base
 * científica: guía del plato del buen comer / recomendaciones SMAE):
 *
 *  - Verduras: base amplia (libres/casi libres), 3–6 equiv.
 *  - Frutas: 2–4 equiv (aporte de HCO y micronutrientes).
 *  - Leguminosas: 1–2 equiv (fibra + proteína vegetal).
 *  - Una fuente principal de cereal (con o sin grasa) que absorbe el HCO restante.
 *  - Una fuente principal de AOA (proteína) según la meta de proteína.
 *  - Lácteo descremado/semi (1–2 equiv).
 *  - Aceites/grasas que cierran los lípidos.
 *
 * Método: fija cantidades base sensatas para verduras/frutas/leguminosas/lácteo,
 * calcula el resto de HCO → cereal, el resto de proteína → AOA, el resto de
 * lípidos → aceite; luego hace un ajuste greedy en pasos de 0.5 equivalentes
 * para minimizar la diferencia ponderada con la meta (kcal, HCO, prot, líp).
 *
 * @param meta      metas de macros del paciente
 * @param variacion semilla: misma semilla → misma propuesta; distinta → otra
 *                  propuesta balanceada (elige distintos subtipos de alimento y
 *                  cantidades base). 0 = propuesta "canónica".
 */
export function calcularEquivalentesAuto(
  meta: MetaEquivalentes,
  variacion = 0
): Equivalentes {
  const rand = prng(variacion + 1)
  const grupoDe = (id: GrupoSMAEId) => GRUPOS_SMAE.find((g) => g.id === id)!

  // Subtipos elegibles por semilla. La fuente PRINCIPAL de proteína se mantiene
  // magra (muy bajo / bajo aporte de grasa): así queda margen para cuadrar los
  // lípidos con aceite y no dispararlos. El cereal principal es sin grasa (base
  // del plato); la variante con grasa se usa solo como acento en una segunda
  // fuente pequeña, no como base. La leche, descremada o semi.
  const idAOA = elegir(['AOA_MBAG', 'AOA_BAG'] as const, variacion === 0 ? 0 : rand())
  const idLeche = elegir(['LECHE_DES', 'LECHE_SEMI'] as const, variacion === 0 ? 0 : rand())
  const idCereal: GrupoSMAEId = 'CEREALES_SG'

  const medio = (n: number) => Math.max(0, Math.round(n * 2) / 2)

  // Cantidades base con pequeña variación por semilla.
  const jit = (base: number, amp: number) => base + (variacion === 0 ? 0 : (rand() - 0.5) * 2 * amp)

  // Base: leguminosas y lácteo aportan proteína (vegetal y láctea) para que el
  // AOA no tenga que cubrir toda la meta y quede en una cifra realista.
  const eq: Equivalentes = {}
  eq.VERDURAS = medio(jit(4, 1.5)) // 2.5–5.5
  eq.FRUTAS = medio(jit(3, 1)) // 2–4
  eq.LEGUMINOSAS = medio(jit(2, 1)) // 1–3 (fibra + proteína vegetal)
  eq[idLeche] = medio(jit(2, 0.5)) // 1.5–2.5
  eq.ACEITES_SP = 0
  eq[idCereal] = 0
  eq[idAOA] = 0

  const aporte = () => sumarEquivalentes(eq)

  // 1) Proteína → AOA magro (tras verduras/leguminosas/lácteo).
  const protRestante = meta.proteina_g - aporte().proteina
  eq[idAOA] = medio(Math.max(0, protRestante / grupoDe(idAOA).proteina))

  // 2) HCO → cereal sin grasa (tras verduras/frutas/leguminosas/lácteo).
  const hcoRestante = meta.hco_g - aporte().hco
  eq[idCereal] = medio(Math.max(0, hcoRestante / grupoDe(idCereal).hco))

  // 3) Lípidos → aceite (tras AOA/cereal/lácteo).
  const lipRestante = meta.lipidos_g - aporte().lipidos
  eq.ACEITES_SP = medio(Math.max(0, lipRestante / grupoDe('ACEITES_SP').lipidos))

  // 4) Ajuste greedy: mover ±0.5 el grupo que más reduzca el error ponderado.
  // Proteína y kcal pesan fuerte para que el óptimo NO las sacrifique.
  const gruposAjustables: GrupoSMAEId[] = [
    'VERDURAS',
    'FRUTAS',
    'LEGUMINOSAS',
    idLeche,
    idCereal,
    idAOA,
    'ACEITES_SP',
  ]
  // Límites por grupo (equivalentes) para propuestas realistas.
  const maxDe = (gid: GrupoSMAEId): number => {
    if (gid === 'VERDURAS') return 7
    if (gid === 'FRUTAS') return 5
    if (gid === 'LEGUMINOSAS') return 4
    if (gid === idLeche) return 3
    if (gid === 'ACEITES_SP') return 7
    if (gid === idAOA) return 8 // fuente de proteína, tope realista
    return 14 // cereal
  }
  const error = (e: Equivalentes) => {
    const t = sumarEquivalentes(e)
    return (
      Math.abs(t.hco - meta.hco_g) * 2.0 +
      Math.abs(t.proteina - meta.proteina_g) * 2.4 +
      Math.abs(t.lipidos - meta.lipidos_g) * 2.4 +
      Math.abs(t.kcal - meta.kcalMeta) * 0.3
    )
  }

  for (let iter = 0; iter < 80; iter++) {
    let mejor = error(eq)
    let mejorGrupo: GrupoSMAEId | null = null
    let mejorDelta = 0
    for (const gid of gruposAjustables) {
      for (const delta of [0.5, -0.5]) {
        const actual = eq[gid] ?? 0
        if (actual + delta < 0 || actual + delta > maxDe(gid)) continue
        const err = error({ ...eq, [gid]: actual + delta })
        if (err < mejor - 1e-6) {
          mejor = err
          mejorGrupo = gid
          mejorDelta = delta
        }
      }
    }
    if (!mejorGrupo) break
    eq[mejorGrupo] = (eq[mejorGrupo] ?? 0) + mejorDelta
  }

  // Limpia ceros para no dejar grupos vacíos en el objeto.
  for (const k of Object.keys(eq) as GrupoSMAEId[]) {
    if (!eq[k]) delete eq[k]
  }
  return eq
}

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
