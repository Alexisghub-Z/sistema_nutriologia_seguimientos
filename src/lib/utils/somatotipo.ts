/**
 * Cálculo de somatotipo antropométrico Heath-Carter
 *
 * Componentes:
 *  - Endomorfia: adiposidad relativa (pliegues corregidos por talla)
 *  - Mesomorfia: desarrollo músculo-esquelético relativo a la talla
 *  - Ectomorfia: linealidad relativa (índice ponderal)
 *
 * Referencia: Carter, J.E.L. (2002). The Heath-Carter Anthropometric Somatotype
 * — Instruction Manual. San Diego State University.
 */

export interface DatosSomatotipo {
  peso: number // kg
  talla: number // metros (como se guarda en Consulta)
  pliegue_tricipital: number // mm
  pliegue_subescapular: number // mm
  pliegue_supraespinal: number // mm
  pliegue_pantorrilla: number // mm (pantorrilla medial)
  brazo_flexionado: number // cm (perímetro, brazo flexionado y contraído)
  pantorrilla_maximo: number // cm (perímetro)
  diametro_humero: number // cm (biepicondíleo)
  diametro_femur: number // cm (biepicondíleo)
}

export interface Somatotipo {
  endomorfia: number
  mesomorfia: number
  ectomorfia: number
}

const CAMPOS_REQUERIDOS: (keyof DatosSomatotipo)[] = [
  'peso',
  'talla',
  'pliegue_tricipital',
  'pliegue_subescapular',
  'pliegue_supraespinal',
  'pliegue_pantorrilla',
  'brazo_flexionado',
  'pantorrilla_maximo',
  'diametro_humero',
  'diametro_femur',
]

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10
}

/**
 * Calcula el somatotipo Heath-Carter. Devuelve null si falta alguna medición
 * (los campos del modelo Consulta son opcionales, por eso acepta null/undefined).
 */
export function calcularSomatotipo(
  datos: Partial<Record<keyof DatosSomatotipo, number | null | undefined>>
): Somatotipo | null {
  for (const campo of CAMPOS_REQUERIDOS) {
    const valor = datos[campo]
    if (valor === null || valor === undefined || valor <= 0) return null
  }
  const d = datos as DatosSomatotipo

  const tallaCm = d.talla * 100

  // --- Endomorfia: suma de 3 pliegues corregida por talla ---
  const sumaPliegues =
    (d.pliegue_tricipital + d.pliegue_subescapular + d.pliegue_supraespinal) * (170.18 / tallaCm)
  const endomorfia =
    -0.7182 +
    0.1451 * sumaPliegues -
    0.00068 * sumaPliegues ** 2 +
    0.0000014 * sumaPliegues ** 3

  // --- Mesomorfia: diámetros óseos + perímetros corregidos por pliegue ---
  const brazoCorregido = d.brazo_flexionado - d.pliegue_tricipital / 10
  const pantorrillaCorregida = d.pantorrilla_maximo - d.pliegue_pantorrilla / 10
  const mesomorfia =
    0.858 * d.diametro_humero +
    0.601 * d.diametro_femur +
    0.188 * brazoCorregido +
    0.161 * pantorrillaCorregida -
    0.131 * tallaCm +
    4.5

  // --- Ectomorfia: índice ponderal ---
  const indicePonderal = tallaCm / Math.cbrt(d.peso)
  let ectomorfia: number
  if (indicePonderal >= 40.75) {
    ectomorfia = 0.732 * indicePonderal - 28.58
  } else if (indicePonderal > 38.25) {
    ectomorfia = 0.463 * indicePonderal - 17.63
  } else {
    ectomorfia = 0.1
  }

  return {
    endomorfia: redondear1(Math.max(0.1, endomorfia)),
    mesomorfia: redondear1(Math.max(0.1, mesomorfia)),
    ectomorfia: redondear1(Math.max(0.1, ectomorfia)),
  }
}

/**
 * Proyecta el somatotipo al plano de la somatocarta.
 * X ∈ [-8, 8] aprox., Y ∈ [-10, 16] aprox.
 */
export function somatotipoACoordenadas(s: Somatotipo): { x: number; y: number } {
  return {
    x: redondear1(s.ectomorfia - s.endomorfia),
    y: redondear1(2 * s.mesomorfia - (s.endomorfia + s.ectomorfia)),
  }
}

/**
 * Clasificación en 13 categorías de Carter según el componente dominante
 * y la diferencia con los demás.
 */
export function clasificarSomatotipo(s: Somatotipo): string {
  const { endomorfia: endo, mesomorfia: meso, ectomorfia: ecto } = s

  // Central: ningún componente difiere del resto por más de 1 unidad
  const max = Math.max(endo, meso, ecto)
  const min = Math.min(endo, meso, ecto)
  if (max - min <= 1) return 'Central'

  const dif = (a: number, b: number) => a - b

  if (meso >= endo && meso >= ecto) {
    // Dominante: mesomorfia
    if (dif(meso, endo) > 0.5 && dif(meso, ecto) > 0.5) {
      if (Math.abs(endo - ecto) <= 0.5) return 'Mesomorfo balanceado'
      return endo > ecto ? 'Mesomorfo-endomorfo' : 'Mesomorfo-ectomorfo'
    }
    return endo >= ecto ? 'Meso-endomorfo' : 'Meso-ectomorfo'
  }

  if (endo >= meso && endo >= ecto) {
    // Dominante: endomorfia
    if (dif(endo, meso) > 0.5 && dif(endo, ecto) > 0.5) {
      if (Math.abs(meso - ecto) <= 0.5) return 'Endomorfo balanceado'
      return meso > ecto ? 'Endomorfo-mesomorfo' : 'Endomorfo-ectomorfo'
    }
    return meso >= ecto ? 'Endo-mesomorfo' : 'Endo-ectomorfo'
  }

  // Dominante: ectomorfia
  if (dif(ecto, endo) > 0.5 && dif(ecto, meso) > 0.5) {
    if (Math.abs(endo - meso) <= 0.5) return 'Ectomorfo balanceado'
    return meso > endo ? 'Ectomorfo-mesomorfo' : 'Ectomorfo-endomorfo'
  }
  return meso >= endo ? 'Ecto-mesomorfo' : 'Ecto-endomorfo'
}

/**
 * Formato corto estándar: "4.2 – 5.9 – 3.2"
 */
export function formatearSomatotipo(s: Somatotipo): string {
  return `${s.endomorfia.toFixed(1)} – ${s.mesomorfia.toFixed(1)} – ${s.ectomorfia.toFixed(1)}`
}

/**
 * SAM — Somatotype Attitudinal Distance: distancia euclidiana entre dos
 * somatotipos en el espacio tridimensional de componentes. Es la métrica
 * estándar en antropometría para cuantificar el cambio de somatotipo entre
 * dos evaluaciones. Por convención, un SAD > 2 unidades indica un cambio real
 * (más allá del error de medición).
 */
export function distanciaSomatotipos(a: Somatotipo, b: Somatotipo): number {
  const de = a.endomorfia - b.endomorfia
  const dm = a.mesomorfia - b.mesomorfia
  const dc = a.ectomorfia - b.ectomorfia
  return Math.round(Math.sqrt(de * de + dm * dm + dc * dc) * 10) / 10
}

export interface CambioComponente {
  delta: number // valor con signo
  // Dirección clínicamente favorable del cambio en seguimiento nutricional:
  // baja endomorfia (menos grasa) → favorable; sube mesomorfia (más músculo) → favorable.
  favorable: boolean | null // null = neutral / ectomorfia (sin juicio directo)
}

export interface AnalisisSomatotipo {
  sam: number // distancia total inicial → actual
  cambioReal: boolean // sam > 2
  endomorfia: CambioComponente
  mesomorfia: CambioComponente
  ectomorfia: CambioComponente
}

/**
 * Compara el somatotipo inicial con el actual y devuelve el cambio por
 * componente + la distancia de migración (SAM), con la lectura clínica.
 */
export function analizarCambio(inicial: Somatotipo, actual: Somatotipo): AnalisisSomatotipo {
  const dEndo = Math.round((actual.endomorfia - inicial.endomorfia) * 10) / 10
  const dMeso = Math.round((actual.mesomorfia - inicial.mesomorfia) * 10) / 10
  const dEcto = Math.round((actual.ectomorfia - inicial.ectomorfia) * 10) / 10
  return {
    sam: distanciaSomatotipos(actual, inicial),
    cambioReal: distanciaSomatotipos(actual, inicial) > 2,
    endomorfia: { delta: dEndo, favorable: dEndo === 0 ? null : dEndo < 0 },
    mesomorfia: { delta: dMeso, favorable: dMeso === 0 ? null : dMeso > 0 },
    ectomorfia: { delta: dEcto, favorable: null },
  }
}

/**
 * Genera una interpretación en lenguaje natural del cambio de somatotipo,
 * pensada para el nutriólogo (adiposidad = endomorfia, músculo = mesomorfia).
 */
export function interpretarCambio(a: AnalisisSomatotipo): string {
  const bajoGrasa = a.endomorfia.delta < -0.3
  const subioGrasa = a.endomorfia.delta > 0.3
  const subioMusculo = a.mesomorfia.delta > 0.3
  const bajoMusculo = a.mesomorfia.delta < -0.3

  if (!a.cambioReal && Math.abs(a.endomorfia.delta) <= 0.3 && Math.abs(a.mesomorfia.delta) <= 0.3) {
    return 'El somatotipo se ha mantenido estable; sin cambios relevantes en composición corporal.'
  }

  const partes: string[] = []
  if (bajoGrasa) partes.push('redujo su adiposidad')
  else if (subioGrasa) partes.push('aumentó su adiposidad')
  if (subioMusculo) partes.push('ganó masa músculo-esquelética')
  else if (bajoMusculo) partes.push('perdió masa músculo-esquelética')

  if (partes.length === 0) {
    return 'Cambio principalmente en la linealidad corporal, sin variación marcada de grasa o músculo.'
  }

  const frase = partes.join(' y ')
  // Valoración: favorable si baja grasa y/o sube músculo sin efectos negativos
  const favorable = (bajoGrasa || subioMusculo) && !subioGrasa && !bajoMusculo
  const cierre = favorable
    ? ' — evolución favorable hacia un físico más magro y atlético.'
    : subioGrasa || bajoMusculo
      ? ' — conviene revisar el plan para reorientar la composición corporal.'
      : '.'
  return `El paciente ${frase}${cierre}`
}

/**
 * Rango de referencia poblacional del somatotipo. Devuelve una etiqueta corta
 * de contexto según el componente dominante y su magnitud.
 */
export function categoriaReferencia(s: Somatotipo): string {
  const { endomorfia: en, mesomorfia: me, ectomorfia: ec } = s
  const dom = Math.max(en, me, ec)
  if (me === dom && me >= 5) {
    return me >= 6 ? 'Físico atlético / deportivo (mesomorfia alta)' : 'Constitución musculada'
  }
  if (en === dom && en >= 5) return 'Predominio de adiposidad (endomorfia alta)'
  if (ec === dom && ec >= 4) return 'Constitución lineal / delgada (ectomorfia alta)'
  const max = Math.max(en, me, ec)
  const min = Math.min(en, me, ec)
  if (max - min <= 1.5) return 'Somatotipo equilibrado (población general)'
  return 'Somatotipo mixto'
}

/**
 * Ritmo de cambio: unidades de SAM por mes entre la primera y última evaluación.
 * meses = diferencia temporal en meses (>0).
 */
export function ritmoCambio(
  sam: number,
  meses: number
): { porMes: number; etiqueta: string } {
  if (meses <= 0) return { porMes: 0, etiqueta: '—' }
  const porMes = Math.round((sam / meses) * 100) / 100
  let etiqueta: string
  if (porMes < 0.15) etiqueta = 'Cambio lento / estable'
  else if (porMes < 0.4) etiqueta = 'Ritmo gradual y sostenible'
  else etiqueta = 'Cambio rápido'
  return { porMes, etiqueta }
}
