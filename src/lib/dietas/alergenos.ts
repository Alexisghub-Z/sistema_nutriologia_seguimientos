/**
 * Comprobación de alérgenos en una dieta ya generada.
 * ------------------------------------------------------------
 * Es una RED DE SEGURIDAD, no una garantía: al prompt ya se le dice que respete
 * las alergias, pero los modelos fallan. Esto revisa el resultado y avisa si
 * aparece un alérgeno declarado.
 *
 * Límite conocido y deliberado: solo detecta lo que está ESCRITO en la dieta. Un
 * alérgeno oculto en un platillo que no lo nombra (mayonesa que lleva huevo) no
 * se detecta. Por eso el aviso invita a revisar, no certifica que sea seguro.
 */

/** Normaliza para comparar: minúsculas, sin acentos y sin plurales simples. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/**
 * Derivados frecuentes de los alérgenos más comunes en México. Sirve para que
 * "leche" también atrape "queso" o "yogur", que es donde más falla una búsqueda
 * literal. No pretende ser exhaustivo.
 */
const LACTEOS = [
  'leche',
  'queso',
  'yogur',
  'yoghurt',
  'crema',
  'mantequilla',
  'lacteo',
  'requeson',
  'quesillo',
  'panela',
]

const DERIVADOS: Record<string, string[]> = {
  // El nutriólogo puede escribirlo de varias formas: todas apuntan a lo mismo.
  leche: LACTEOS,
  lacteos: LACTEOS,
  lacteo: LACTEOS,
  lactosa: LACTEOS,
  huevo: ['huevo', 'omelette', 'omelet', 'clara', 'yema', 'empanizado', 'capeado'],
  trigo: ['pan', 'harina', 'pasta', 'galleta', 'tortilla de harina', 'hot cake', 'hotcake'],
  gluten: ['pan', 'harina', 'pasta', 'trigo', 'galleta', 'cebada', 'centeno', 'avena'],
  mariscos: ['camaron', 'langosta', 'cangrejo', 'jaiba', 'pulpo', 'almeja', 'ostion', 'calamar'],
  camaron: ['camaron'],
  pescado: ['pescado', 'atun', 'salmon', 'mojarra', 'tilapia', 'sardina', 'bacalao'],
  cacahuate: ['cacahuate', 'mani', 'crema de cacahuate'],
  nuez: ['nuez', 'nueces', 'almendra', 'pistache', 'avellana', 'marañon'],
  soya: ['soya', 'soja', 'tofu', 'edamame'],
  cerdo: ['cerdo', 'puerco', 'jamon', 'tocino', 'chorizo', 'salchicha', 'manteca'],
  res: ['res', 'bistec', 'carne molida', 'arrachera'],
  pollo: ['pollo', 'pechuga'],
  fresa: ['fresa'],
  chocolate: ['chocolate', 'cacao'],
}

/** Un alérgeno encontrado en la dieta. */
export interface HallazgoAlergeno {
  /** Lo que el nutriólogo declaró (ej. "mariscos"). */
  declarado: string
  /** El término concreto que apareció (ej. "camarón"). */
  encontradoEn: string
  /** Texto del alimento donde apareció. */
  texto: string
  /** Ubicación legible, para señalarlo en la interfaz. */
  ubicacion: string
}

/** Separa una lista escrita a mano ("mariscos, cacahuate") en términos. */
function terminos(declaracion: string): string[] {
  return declaracion
    .split(/[,;/\n]+/)
    .map((t) => normalizar(t))
    .filter((t) => t.length >= 3) // evita ruido tipo "y", "de"
}

/**
 * Busca los alérgenos declarados en los textos de una dieta.
 *
 * @param alergias  lo que el nutriólogo escribió en el expediente
 * @param textos    alimentos de la dieta, con su ubicación para poder señalarlos
 */
export function buscarAlergenos(
  alergias: string | null | undefined,
  textos: { texto: string; ubicacion: string }[]
): HallazgoAlergeno[] {
  if (!alergias?.trim()) return []

  const hallazgos: HallazgoAlergeno[] = []
  const vistos = new Set<string>()

  for (const declarado of terminos(alergias)) {
    // El propio término más sus derivados conocidos.
    const aBuscar = [declarado, ...(DERIVADOS[declarado] ?? [])]

    for (const { texto, ubicacion } of textos) {
      const normalizado = normalizar(texto)
      const encontrado = aBuscar.find((t) => normalizado.includes(t))
      if (!encontrado) continue

      // Un mismo alérgeno en el mismo sitio se reporta una sola vez.
      const clave = `${declarado}|${ubicacion}`
      if (vistos.has(clave)) continue
      vistos.add(clave)

      hallazgos.push({ declarado, encontradoEn: encontrado, texto, ubicacion })
    }
  }

  return hallazgos
}
