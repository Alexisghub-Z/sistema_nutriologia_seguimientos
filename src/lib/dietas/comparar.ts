/**
 * Comparar dos dietas del mismo paciente.
 * ------------------------------------------------------------
 * En la consulta de seguimiento la pregunta es siempre la misma: qué cambió
 * desde la vez pasada. Con tres planes guardados y ninguna forma de cruzarlos,
 * esa respuesta había que reconstruirla a ojo abriendo dos pestañas.
 *
 * La comparación se hace en tres capas, y la más útil no es la de los
 * platillos:
 *   1. Contexto clínico — peso, IMC y meta calórica. Explica POR QUÉ cambió
 *      el plan, y es lo que se le enseña al paciente.
 *   2. Equivalentes por grupo — el cambio estructural: más proteína, menos
 *      cereal.
 *   3. Platillos — qué alimentos entraron, salieron o siguen.
 *
 * Todo son funciones puras: se prueban sin base de datos y sin React.
 */

import { GRUPOS_SMAE, type Equivalentes, type GrupoSMAEId } from '@/lib/utils/smae'
import { nombreDeAlimento } from '@/lib/dietas/variedad'
import { formaDeTiempos } from '@/lib/dietas/autoguardado'

/**
 * Palabras que describen CÓMO viene un alimento, no cuál es.
 *
 * Comparar necesita una normalización más tosca que la de variedad: allí
 * "pechuga pollo" y "muslo pollo" deben distinguirse para no repetir comida,
 * pero aquí "papaya" y "papaya en cubos" son el mismo alimento y separarlos
 * inventaría un cambio que el paciente nunca notó.
 */
const FORMA_DE_SERVIR = new Set([
  'cubos', 'rebanadas', 'rebanada', 'tiras', 'trozos', 'picado', 'picada',
  'rallado', 'rallada', 'molido', 'molida', 'entero', 'entera', 'mitad',
  'asado', 'asada', 'cocido', 'cocida', 'crudo', 'cruda', 'hervido', 'hervida',
  'plancha', 'horno', 'vapor', 'salteado', 'salteada', 'guisado', 'guisada',
  'frito', 'frita', 'revuelto', 'revuelta', 'estrellado', 'estrellada',
  'natural', 'fresco', 'fresca', 'integral', 'light', 'desgrasado', 'magro',
])

/**
 * El alimento, reducido a lo que lo identifica.
 *
 * Se apoya en `nombreDeAlimento` —que ya quita cantidades y unidades— y además
 * descarta la forma de servir, quedándose con el primer sustantivo útil.
 */
function alimentoComparable(descripcion: string): string {
  const base = nombreDeAlimento(descripcion)
  if (!base) return ''
  const palabras = base.split(' ').filter((w) => !FORMA_DE_SERVIR.has(w))
  // Si todo era forma de servir, se conserva la base: mejor comparar algo
  // impreciso que descartar el alimento entero.
  return (palabras[0] ?? base.split(' ')[0]) ?? ''
}

/** Una dieta guardada, tal como sale de la base con su cuadro. */
export interface DietaComparable {
  id: string
  modo: 'DIETA' | 'RECETARIO'
  /** Cuándo se creó, en ISO. */
  fecha: string
  contenido: unknown
  equivalentes?: Equivalentes | null
  cuadro: {
    peso?: number | null
    imc?: number | null
    kcalMeta?: number | null
    objetivo?: string | null
  }
}

/** Un dato clínico y cómo cambió entre las dos dietas. */
export interface CambioNumerico {
  etiqueta: string
  antes: number
  despues: number
  /** despues - antes. Negativo es una bajada. */
  delta: number
  /** Con cuántos decimales se presenta, según lo que mide. */
  decimales: number
  unidad: string
}

export interface CambioGrupo {
  grupo: GrupoSMAEId
  nombre: string
  antes: number
  despues: number
  delta: number
}

export interface CambioPlatillos {
  tiempo: string
  /** Alimentos que solo están en la dieta nueva. */
  entraron: string[]
  /** Alimentos que solo estaban en la anterior. */
  salieron: string[]
  /** Alimentos presentes en las dos. */
  siguen: string[]
}

export type MotivoSinPlatillos = 'modos_distintos' | 'contenido_no_legible'

export interface Comparacion {
  /** La más antigua de las dos, se comparen en el orden que se comparen. */
  anterior: DietaComparable
  nueva: DietaComparable
  /** Días transcurridos entre una y otra. */
  diasEntre: number
  contexto: CambioNumerico[]
  grupos: CambioGrupo[]
  /** Null cuando los platillos no son comparables; `motivo` explica por qué. */
  platillos: CambioPlatillos[] | null
  motivoSinPlatillos: MotivoSinPlatillos | null
}

/** Un tiempo tal como se guarda dentro del contenido. */
interface TiempoGuardado {
  nombre?: string
  alimentos?: Array<{ descripcion?: string }>
  opciones?: Array<{ nombre?: string; alimentos?: Array<{ descripcion?: string }> }>
}

/**
 * Los alimentos de un tiempo, normalizados y sin repetir.
 *
 * Se normaliza con `nombreDeAlimento` —el mismo criterio con el que el sistema
 * evita repetirle comida al paciente— para que "1 taza de papaya" y "1 taza de
 * papaya en cubos" cuenten como el mismo alimento. Sin eso, cualquier retoque
 * en la redacción aparecería como un alimento que sale y otro que entra.
 */
function alimentosDeTiempo(tiempo: TiempoGuardado): Set<string> {
  const nombres = new Set<string>()

  const anotar = (descripcion?: string) => {
    if (!descripcion) return
    const nombre = alimentoComparable(descripcion)
    if (nombre) nombres.add(nombre)
  }

  for (const a of tiempo.alimentos ?? []) anotar(a.descripcion)
  // En un recetario los alimentos viven dentro de cada opción.
  for (const o of tiempo.opciones ?? []) {
    for (const a of o.alimentos ?? []) anotar(a.descripcion)
  }

  return nombres
}

/** Los tiempos de un contenido guardado, o `null` si no tiene forma válida. */
function tiemposDe(contenido: unknown): TiempoGuardado[] | null {
  const tiempos = (contenido as { tiempos?: unknown } | null)?.tiempos
  if (!Array.isArray(tiempos)) return null
  return tiempos as TiempoGuardado[]
}

/**
 * Cambios en los platillos, tiempo a tiempo.
 *
 * Los tiempos se cruzan por NOMBRE y no por posición: si el nutriólogo añade
 * una colación al principio, comparar por índice marcaría todo el día como
 * cambiado. Un tiempo que solo existe en una de las dos dietas también sale,
 * con la otra columna vacía.
 */
export function compararPlatillos(
  anterior: unknown,
  nueva: unknown
): CambioPlatillos[] | null {
  const tiemposAnt = tiemposDe(anterior)
  const tiemposNue = tiemposDe(nueva)
  if (!tiemposAnt || !tiemposNue) return null

  const clave = (t: TiempoGuardado, i: number) =>
    (t.nombre ?? `Tiempo ${i + 1}`).trim().toLowerCase()

  const porNombreAnt = new Map<string, TiempoGuardado>()
  tiemposAnt.forEach((t, i) => porNombreAnt.set(clave(t, i), t))

  const resultado: CambioPlatillos[] = []
  const vistos = new Set<string>()

  for (const [i, t] of tiemposNue.entries()) {
    const k = clave(t, i)
    vistos.add(k)
    const enAnterior = porNombreAnt.get(k)
    const nuevos = alimentosDeTiempo(t)
    const viejos = enAnterior ? alimentosDeTiempo(enAnterior) : new Set<string>()

    resultado.push({
      tiempo: t.nombre?.trim() || `Tiempo ${i + 1}`,
      entraron: [...nuevos].filter((n) => !viejos.has(n)).sort(),
      salieron: [...viejos].filter((v) => !nuevos.has(v)).sort(),
      siguen: [...nuevos].filter((n) => viejos.has(n)).sort(),
    })
  }

  // Tiempos que estaban antes y ya no: se quitaron enteros y hay que decirlo.
  for (const [i, t] of tiemposAnt.entries()) {
    const k = clave(t, i)
    if (vistos.has(k)) continue
    resultado.push({
      tiempo: t.nombre?.trim() || `Tiempo ${i + 1}`,
      entraron: [],
      salieron: [...alimentosDeTiempo(t)].sort(),
      siguen: [],
    })
  }

  return resultado
}

/** Cambios en los equivalentes de cada grupo SMAE. */
export function compararGrupos(
  anterior: Equivalentes | null | undefined,
  nueva: Equivalentes | null | undefined
): CambioGrupo[] {
  const a = anterior ?? {}
  const n = nueva ?? {}

  return GRUPOS_SMAE.map((g) => {
    const antes = a[g.id] ?? 0
    const despues = n[g.id] ?? 0
    return {
      grupo: g.id,
      nombre: g.nombre,
      antes,
      despues,
      // Dos decimales: los equivalentes van de medio en medio y la resta de
      // flotantes deja colas como 0.30000000000000004.
      delta: Math.round((despues - antes) * 100) / 100,
    }
  })
    // Un grupo que no se usa en ninguna de las dos no aporta nada.
    .filter((c) => c.antes !== 0 || c.despues !== 0)
}

/** Redondea a los decimales indicados, sin arrastrar colas binarias. */
function redondear(n: number, decimales: number): number {
  const factor = 10 ** decimales
  return Math.round(n * factor) / factor
}

/** Los datos clínicos que cambiaron entre las dos dietas. */
export function compararContexto(
  anterior: DietaComparable['cuadro'],
  nueva: DietaComparable['cuadro']
): CambioNumerico[] {
  const campos: Array<{
    clave: keyof DietaComparable['cuadro']
    etiqueta: string
    decimales: number
    unidad: string
  }> = [
    { clave: 'peso', etiqueta: 'Peso', decimales: 1, unidad: 'kg' },
    { clave: 'imc', etiqueta: 'IMC', decimales: 1, unidad: '' },
    { clave: 'kcalMeta', etiqueta: 'Meta diaria', decimales: 0, unidad: 'kcal' },
  ]

  const cambios: CambioNumerico[] = []
  for (const c of campos) {
    const antes = anterior[c.clave]
    const despues = nueva[c.clave]
    // Un dato que falta en alguna de las dos no se puede comparar: mostrar
    // "0 kg → 74 kg" sería una bajada inventada de 74 kilos.
    if (typeof antes !== 'number' || typeof despues !== 'number') continue

    cambios.push({
      etiqueta: c.etiqueta,
      antes: redondear(antes, c.decimales),
      despues: redondear(despues, c.decimales),
      delta: redondear(despues - antes, c.decimales),
      decimales: c.decimales,
      unidad: c.unidad,
    })
  }
  return cambios
}

/** Días naturales entre dos fechas ISO. Siempre positivo. */
function diasEntreFechas(a: string, b: string): number {
  const ta = new Date(a).getTime()
  const tb = new Date(b).getTime()
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0
  return Math.abs(Math.round((tb - ta) / 86400000))
}

/**
 * Compara dos dietas guardadas del mismo paciente.
 *
 * El orden en que se pasen da igual: se ordenan por fecha, porque "qué cambió"
 * solo tiene sentido de la más vieja a la más nueva. Marcar dos casillas en un
 * historial no garantiza ese orden.
 */
export function compararDietas(a: DietaComparable, b: DietaComparable): Comparacion {
  const [anterior, nueva] =
    new Date(a.fecha).getTime() <= new Date(b.fecha).getTime() ? [a, b] : [b, a]

  // Los platillos solo son comparables entre planes del mismo tipo: una dieta
  // lista alimentos fijos y un recetario ofrece alternativas, así que cruzarlos
  // daría un resultado que induce a error. El contexto clínico sí se compara
  // siempre, y es lo más valioso de las tres capas.
  let platillos: CambioPlatillos[] | null = null
  let motivoSinPlatillos: MotivoSinPlatillos | null = null

  if (anterior.modo !== nueva.modo) {
    motivoSinPlatillos = 'modos_distintos'
  } else {
    platillos = compararPlatillos(anterior.contenido, nueva.contenido)
    if (!platillos) motivoSinPlatillos = 'contenido_no_legible'
  }

  return {
    anterior,
    nueva,
    diasEntre: diasEntreFechas(anterior.fecha, nueva.fecha),
    contexto: compararContexto(anterior.cuadro, nueva.cuadro),
    grupos: compararGrupos(anterior.equivalentes, nueva.equivalentes),
    platillos,
    motivoSinPlatillos,
  }
}

/**
 * ¿Se puede comparar este par?
 *
 * Se usa para habilitar el botón antes de calcular nada, así que devuelve el
 * motivo y no un booleano: una acción apagada sin explicación solo genera
 * dudas.
 */
export function motivoNoComparable(
  a: DietaComparable | null,
  b: DietaComparable | null
): string | null {
  if (!a || !b) return 'Elige dos dietas para compararlas'
  if (a.id === b.id) return 'Son la misma dieta'
  // La forma real manda sobre la etiqueta `modo`: en producción apareció un
  // borrador marcado DIETA cuyo contenido era un recetario.
  const formaA = formaDeTiempos(tiemposDe(a.contenido))
  const formaB = formaDeTiempos(tiemposDe(b.contenido))
  if (formaA && formaB && formaA !== formaB) {
    return 'Una es dieta y la otra recetario: solo se compara peso y meta'
  }
  return null
}
