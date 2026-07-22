import OpenAI from 'openai'
import {
  GRUPOS_SMAE,
  PORCIONES_REFERENCIA,
  type Equivalentes,
  type GrupoSMAEId,
} from '@/lib/utils/smae'
import { logSuccess, logDebug } from '@/lib/logger'
import { captureError } from '@/lib/sentry-utils'

/**
 * Motor de generación de dietas con IA (Fase B).
 * ------------------------------------------------------------
 * A partir del cuadro dietosintético del paciente (equivalentes por tiempo),
 * el perfil de estilo del nutriólogo y ejemplos de sus dietas pasadas, pide a
 * gpt-4o que proponga los ALIMENTOS CONCRETOS de cada tiempo de comida.
 *
 * Clave: la IA está ANCLADA a los equivalentes. Le decimos exactamente cuántos
 * equivalentes de cada grupo lleva cada tiempo y ella solo elige QUÉ alimentos
 * los cumplen, en el estilo del nutriólogo (región, alimentos típicos, reglas).
 */

// Cliente OpenAI (mismo patrón que openai-assistant.ts)
let cliente: OpenAI | null = null
function getCliente(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }
  if (!cliente) {
    cliente = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return cliente
}

export function isGeneradorDisponible(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.AI_ENABLED === 'true'
}

/** Perfil de estilo del nutriólogo (subset relevante para el prompt). */
export interface PerfilEstilo {
  region?: string | null
  alimentos_tipicos?: string | null
  alimentos_evitar?: string | null
  estructura_notas?: string | null
  reglas_propias?: string | null
  tono?: string | null
  instrucciones_libres?: string | null
  indicaciones_inicio?: string | null
}

/** Un tiempo de comida con los equivalentes que debe cumplir. */
export interface TiempoConEquivalentes {
  id: string
  nombre: string
  equivalentes: Equivalentes
}

/** Entrada para generar una dieta. */
export interface EntradaGeneracion {
  kcalMeta: number
  macros: { proteina_g: number; grasa_g: number; carbohidrato_g: number }
  tiempos: TiempoConEquivalentes[]
  perfil: PerfilEstilo
  // Ejemplos de dietas pasadas del nutriólogo (few-shot), como texto ya formateado.
  ejemplos?: string[]
  // Ajustes del nutriólogo desde el chat (ej. "no uses lácteos hoy").
  instruccionesExtra?: string
}

/** Un alimento propuesto dentro de un tiempo. */
export interface AlimentoPropuesto {
  grupo: GrupoSMAEId
  equivalentes: number
  descripcion: string // "2 memelas de frijol", "1 taza de papaya"
  calculo?: string // razonamiento de la porción (para transparencia/auditoría)
}

/** Un tiempo de comida ya con sus alimentos concretos. */
export interface TiempoGenerado {
  id: string
  nombre: string
  alimentos: AlimentoPropuesto[]
  nota?: string // indicación opcional del tiempo ("tomar con agua natural")
}

/** Resultado de la generación. */
export interface DietaGenerada {
  tiempos: TiempoGenerado[]
  mensaje: string // mensaje conversacional de la IA para el nutriólogo
}

// ============================================================
// Recetario de opciones (formato del nutriólogo)
// ============================================================
// En vez de una dieta única, genera VARIAS opciones por tiempo (platillos),
// cada una anclada a los mismos equivalentes. El paciente elige.

/** Una opción/platillo dentro de un tiempo de comida. */
export interface OpcionPlatillo {
  nombre: string // "Entomatadas", "Tostada de aguacate"
  alimentos: AlimentoPropuesto[] // ingredientes anclados a los equivalentes
  preparacion?: string // pasos, cuando aplique (hotcakes, pastel...)
}

/** Un tiempo de comida con varias opciones de platillo. */
export interface TiempoRecetario {
  id: string
  nombre: string
  opciones: OpcionPlatillo[]
}

/** Resultado del recetario. */
export interface RecetarioGenerado {
  indicacionesInicio: string // recomendaciones generales (del perfil)
  tiempos: TiempoRecetario[]
  mensaje: string
}

const NOMBRE_GRUPO: Record<GrupoSMAEId, string> = Object.fromEntries(
  GRUPOS_SMAE.map((g) => [g.id, g.nombre])
) as Record<GrupoSMAEId, string>

/**
 * Construye el prompt del sistema con el perfil del nutriólogo.
 */
function construirPromptSistema(perfil: PerfilEstilo, ejemplos?: string[]): string {
  const partes: string[] = [
    'Eres el asistente de nutrición de un nutriólogo profesional. Tu trabajo es proponer',
    'los ALIMENTOS CONCRETOS de una dieta, respetando EXACTAMENTE el número de equivalentes',
    'del Sistema Mexicano de Alimentos Equivalentes (SMAE) que se te indica para cada tiempo',
    'de comida. NO cambies el número de equivalentes: solo eliges qué alimentos los cumplen.',
    '',
    'Debes imitar el estilo del nutriólogo, descrito a continuación:',
  ]

  if (perfil.region) partes.push(`- Región / contexto: ${perfil.region}`)
  if (perfil.alimentos_tipicos)
    partes.push(`- Alimentos que suele usar (prioridad): ${perfil.alimentos_tipicos}`)
  if (perfil.alimentos_evitar) partes.push(`- Alimentos que evita: ${perfil.alimentos_evitar}`)
  if (perfil.estructura_notas)
    partes.push(`- Cómo estructura sus dietas: ${perfil.estructura_notas}`)
  if (perfil.reglas_propias) partes.push(`- Reglas propias: ${perfil.reglas_propias}`)
  if (perfil.tono) partes.push(`- Tono de las indicaciones: ${perfil.tono}`)
  if (perfil.instrucciones_libres)
    partes.push(`- Instrucciones adicionales: ${perfil.instrucciones_libres}`)
  if (perfil.indicaciones_inicio)
    partes.push(
      '',
      'Indicaciones de inicio del nutriólogo (RESPÉTALAS al elegir alimentos y preparaciones):',
      perfil.indicaciones_inicio
    )

  if (!perfil.region && !perfil.alimentos_tipicos) {
    partes.push(
      '(El nutriólogo no ha definido su estilo aún; usa alimentos comunes en México, saludables y accesibles.)'
    )
  }

  if (ejemplos && ejemplos.length > 0) {
    partes.push('', 'Ejemplos de dietas que este nutriólogo ha hecho antes (imita su estilo):')
    ejemplos.forEach((ej, i) => partes.push(`Ejemplo ${i + 1}:\n${ej}`))
  }

  partes.push(
    '',
    'REGLAS ESTRICTAS (obligatorias, no las rompas):',
    '1. Para CADA tiempo, debes usar EXACTAMENTE los equivalentes de cada grupo que se te indican.',
    '   Si un tiempo pide "2 de Cereales sin grasa, 1 de Frutas, 1 de AOA bajo en grasa", tus alimentos',
    '   de ese tiempo deben sumar EXACTAMENTE 2 de cereal, 1 de fruta y 1 de AOA. Ni más, ni menos.',
    '2. NO agregues grupos que no se pidieron. NO omitas grupos que sí se pidieron.',
    '3. El campo "equivalentes" de cada alimento indica cuántos equivalentes de SU grupo aporta.',
    '   La suma de "equivalentes" por grupo en un tiempo debe ser IGUAL a lo pedido para ese tiempo.',
    '4. Puedes usar varios alimentos para cubrir los equivalentes de un grupo (ej. 3 de cereal = 1 pan + 2 tortillas),',
    '   pero la SUMA por grupo debe cuadrar exactamente.',
    '5. Usa la porción correcta: la descripción debe corresponder al número de equivalentes',
    '   (ej. "2 de Cereales" ≈ 2 tortillas o 1 bolillo, NO "1 tortilla").',
    '',
    'PORCIONES (muy importante para exactitud):',
    '- Prefiere MEDIDAS CASERAS del SMAE (piezas, tazas, cucharadas), NO gramos sueltos, porque',
    '  en cereales y leguminosas el gramo crudo y el cocido se confunden.',
    '- Para arroz, pasta, avena, frijol, lenteja: usa SIEMPRE la medida en taza COCIDO',
    '  (ej. "1/2 taza de frijol cocido", "1/4 de taza de arroz cocido"), nunca gramos crudos.'
  )

  // Tabla de referencia de porciones-equivalente para los grupos problemáticos.
  const refs = Object.entries(PORCIONES_REFERENCIA)
    .map(
      ([id, lista]) =>
        `  ${NOMBRE_GRUPO[id as GrupoSMAEId]} (1 equivalente = una de estas):\n    - ${lista.join('\n    - ')}`
    )
    .join('\n')
  if (refs) {
    partes.push('- Referencia de porciones (1 equivalente por porción indicada):', refs)
  }

  partes.push(
    '',
    'ESTILO Y FORMATO:',
    '- Elige alimentos del estilo del nutriólogo (región y alimentos típicos de arriba).',
    '- Responde ÚNICAMENTE en JSON válido con la forma que indica el usuario. Nada de texto fuera del JSON.'
  )

  return partes.join('\n')
}

/**
 * Construye el mensaje del usuario con la meta y los equivalentes por tiempo.
 */
function construirPromptUsuario(entrada: EntradaGeneracion): string {
  const lineas: string[] = [
    `Meta diaria: ${entrada.kcalMeta} kcal · Proteína ${entrada.macros.proteina_g} g · ` +
      `Grasa ${entrada.macros.grasa_g} g · Carbohidratos ${entrada.macros.carbohidrato_g} g.`,
    '',
    'Tiempos de comida y equivalentes que DEBES cumplir en cada uno:',
  ]

  for (const t of entrada.tiempos) {
    const grupos = Object.entries(t.equivalentes)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, n]) => `${n} de ${NOMBRE_GRUPO[id as GrupoSMAEId]}`)
      .join(', ')
    lineas.push(`- ${t.nombre} (id="${t.id}"): ${grupos || 'sin equivalentes'}`)
  }

  if (entrada.instruccionesExtra) {
    lineas.push('', `Instrucciones adicionales del nutriólogo: ${entrada.instruccionesExtra}`)
  }

  lineas.push(
    '',
    'RAZONA CADA PORCIÓN (obligatorio para exactitud):',
    'Antes de escribir la descripción de un alimento, calcula la porción a partir de su',
    'composición. El aporte por 1 equivalente de cada grupo es fijo (te lo damos abajo).',
    'Método: toma el macronutriente que DEFINE al grupo (proteína para AOA y leche; hidratos',
    'de carbono para cereales, frutas, verduras, leguminosas y azúcares; lípidos para aceites),',
    'mira cuánto aporta el alimento por 100 g, y calcula los gramos que dan los equivalentes',
    'pedidos. Ejemplo: pollo ≈ 31 g de proteína/100 g; 1 equivalente de AOA = 7 g de proteína;',
    'entonces 1 equivalente ≈ 7 ÷ 31 × 100 ≈ 23 g de pollo. Pon ese cálculo en el campo "calculo".',
    'Para cereales y leguminosas usa medidas caseras COCIDAS (tazas), no gramos crudos.',
    '',
    'Aporte por 1 equivalente de cada grupo (g): ' +
      GRUPOS_SMAE.map(
        (g) => `${g.nombre}=[HCO ${g.hco}, Prot ${g.proteina}, Líp ${g.lipidos}]`
      ).join('; '),
    '',
    'Devuelve un JSON con esta forma exacta:',
    '{',
    '  "mensaje": "breve comentario para el nutriólogo",',
    '  "tiempos": [',
    '    {',
    '      "id": "<el id del tiempo>",',
    '      "nombre": "<nombre del tiempo>",',
    '      "alimentos": [',
    '        {',
    '          "grupo": "<ID de grupo SMAE>",',
    '          "equivalentes": <número>,',
    '          "calculo": "<cómo obtuviste la porción, ej: pollo 31g prot/100g → 1 equiv (7g) ≈ 23g>",',
    '          "descripcion": "<porción concreta con su cantidad, ej: 23 g de pollo>"',
    '        }',
    '      ],',
    '      "nota": "<indicación opcional>"',
    '    }',
    '  ]',
    '}',
    '',
    `IDs de grupo válidos: ${GRUPOS_SMAE.map((g) => g.id).join(', ')}.`
  )

  return lineas.join('\n')
}

/**
 * Genera una dieta con IA a partir del cuadro, el perfil y ejemplos.
 *
 * @throws Error si OpenAI no está configurado o la respuesta no es válida.
 */
export async function generarDietaConIA(entrada: EntradaGeneracion): Promise<DietaGenerada> {
  // Sin equivalentes definidos no hay nada que anclar; evitamos que la IA improvise.
  const tieneEquivalentes = entrada.tiempos.some((t) =>
    Object.values(t.equivalentes).some((n) => (n ?? 0) > 0)
  )
  if (!tieneEquivalentes) {
    throw new Error(
      'No hay equivalentes repartidos en los tiempos de comida. Reparte los equivalentes en la ' +
        'pestaña "Distribución en tiempos" antes de generar la dieta con IA.'
    )
  }

  const promptSistema = construirPromptSistema(entrada.perfil, entrada.ejemplos)
  const promptUsuario = construirPromptUsuario(entrada)

  // Primera generación.
  let dieta = await llamarIA(promptSistema, promptUsuario)
  let discrepancias = validarDietaGenerada(entrada, dieta)

  // Si la IA se desvió de los equivalentes, reintenta UNA vez con el detalle exacto.
  if (discrepancias.length > 0) {
    logDebug('La IA se desvió; reintentando con corrección', {
      discrepancias: discrepancias.length,
    })
    const correccion =
      'La propuesta anterior NO respetó los equivalentes exactos. Corrige estos grupos para que ' +
      'la suma por grupo y tiempo cuadre EXACTAMENTE:\n' +
      discrepancias
        .map(
          (d) =>
            `- En "${d.tiempo}", grupo ${NOMBRE_GRUPO[d.grupo]}: se pidieron ${d.pedido} equivalentes, ` +
            `tú propusiste ${d.propuesto}. Ajústalo a ${d.pedido}.`
        )
        .join('\n') +
      '\n\nVuelve a generar TODA la dieta respetando exactamente los equivalentes de cada tiempo.'
    dieta = await llamarIA(promptSistema, `${promptUsuario}\n\n${correccion}`)
    discrepancias = validarDietaGenerada(entrada, dieta)
    if (discrepancias.length > 0) {
      logDebug('La IA sigue con discrepancias tras el reintento', {
        discrepancias: discrepancias.length,
      })
    }
  }

  // Auto-revisión de porciones: la IA revisa sus propios gramajes y corrige los
  // que no correspondan a los equivalentes (sin cambiar el número de equivalentes).
  dieta = await revisarPorciones(promptSistema, dieta)

  return dieta
}

/**
 * Genera un RECETARIO de opciones (formato del nutriólogo): por cada tiempo,
 * varias opciones de platillo, cada una anclada a los mismos equivalentes.
 *
 * @param entrada     mismo cuadro/equivalentes que la dieta precisa
 * @param opcionesPorTiempo cuántas opciones generar por tiempo (por defecto 4)
 */
export async function generarRecetario(
  entrada: EntradaGeneracion,
  opcionesPorTiempo = 4
): Promise<RecetarioGenerado> {
  const tieneEquivalentes = entrada.tiempos.some((t) =>
    Object.values(t.equivalentes).some((n) => (n ?? 0) > 0)
  )
  if (!tieneEquivalentes) {
    throw new Error(
      'No hay equivalentes repartidos en los tiempos de comida. Reparte los equivalentes en la ' +
        'pestaña "Distribución en tiempos" antes de generar el recetario.'
    )
  }

  const promptSistema = construirPromptSistemaRecetario(entrada.perfil, entrada.ejemplos)
  const promptUsuario = construirPromptUsuarioRecetario(entrada, opcionesPorTiempo)

  const client = getCliente()
  const model = process.env.OPENAI_MODEL || 'gpt-4o'

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: promptSistema },
        { role: 'user', content: promptUsuario },
      ],
      temperature: 0.5, // algo de variedad entre opciones, pero sin desviarse
      response_format: { type: 'json_object' },
    })

    const contenido = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(contenido) as RecetarioGenerado

    const recetario: RecetarioGenerado = {
      indicacionesInicio: entrada.perfil.indicaciones_inicio ?? '',
      mensaje: typeof parsed.mensaje === 'string' ? parsed.mensaje : '',
      tiempos: Array.isArray(parsed.tiempos)
        ? parsed.tiempos.map((t) => ({
            id: String(t.id ?? ''),
            nombre: String(t.nombre ?? ''),
            opciones: Array.isArray(t.opciones)
              ? t.opciones.map((o) => ({
                  nombre: String(o.nombre ?? ''),
                  preparacion: o.preparacion ? String(o.preparacion) : undefined,
                  alimentos: Array.isArray(o.alimentos)
                    ? o.alimentos.map((a) => ({
                        grupo: a.grupo,
                        equivalentes: Number(a.equivalentes) || 0,
                        descripcion: String(a.descripcion ?? ''),
                        calculo: a.calculo ? String(a.calculo) : undefined,
                      }))
                    : [],
                }))
              : [],
          }))
        : [],
    }

    logSuccess('Recetario generado con IA', {
      tiempos: recetario.tiempos.length,
      tokens: completion.usage?.total_tokens ?? 0,
    })

    return recetario
  } catch (error) {
    captureError(error as Error, { module: 'generarRecetario' })
    throw new Error(
      error instanceof Error
        ? `Error al generar el recetario: ${error.message}`
        : 'Error al generar el recetario'
    )
  }
}

/** Prompt de sistema para el recetario (reusa el estilo, pide varias opciones). */
function construirPromptSistemaRecetario(perfil: PerfilEstilo, ejemplos?: string[]): string {
  // Reusamos todo el prompt de estilo/reglas de la dieta precisa, y añadimos la
  // instrucción de formato "varias opciones por tiempo".
  const base = construirPromptSistema(perfil, ejemplos)
  return (
    base +
    '\n\n' +
    'FORMATO RECETARIO (muy importante):\n' +
    '- En vez de UNA dieta, genera VARIAS OPCIONES de platillo por cada tiempo de comida.\n' +
    '- CADA opción debe cumplir EXACTAMENTE los mismos equivalentes del tiempo (son intercambiables).\n' +
    '- Dale a cada opción un nombre de platillo atractivo (ej. "Entomatadas", "Tostada de aguacate").\n' +
    '- Cuando el platillo lo requiera (licuados, hot cakes, pasteles), incluye la preparación en "preparacion".\n' +
    '- Usa alimentos y preparaciones del estilo del nutriólogo y respeta sus indicaciones de inicio.'
  )
}

/** Prompt de usuario para el recetario. */
function construirPromptUsuarioRecetario(
  entrada: EntradaGeneracion,
  opcionesPorTiempo: number
): string {
  const lineas: string[] = [
    `Meta diaria: ${entrada.kcalMeta} kcal · Proteína ${entrada.macros.proteina_g} g · ` +
      `Grasa ${entrada.macros.grasa_g} g · Carbohidratos ${entrada.macros.carbohidrato_g} g.`,
    '',
    `Genera ${opcionesPorTiempo} opciones de platillo por cada tiempo. Cada opción debe cumplir ` +
      'EXACTAMENTE estos equivalentes:',
  ]

  for (const t of entrada.tiempos) {
    const grupos = Object.entries(t.equivalentes)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([id, n]) => `${n} de ${NOMBRE_GRUPO[id as GrupoSMAEId]}`)
      .join(', ')
    lineas.push(`- ${t.nombre} (id="${t.id}"): ${grupos || 'sin equivalentes'}`)
  }

  if (entrada.instruccionesExtra) {
    lineas.push('', `Instrucciones adicionales del nutriólogo: ${entrada.instruccionesExtra}`)
  }

  lineas.push(
    '',
    'Aporte por 1 equivalente de cada grupo (g): ' +
      GRUPOS_SMAE.map(
        (g) => `${g.nombre}=[HCO ${g.hco}, Prot ${g.proteina}, Líp ${g.lipidos}]`
      ).join('; '),
    '',
    'Devuelve un JSON con esta forma exacta:',
    '{',
    '  "mensaje": "breve comentario para el nutriólogo",',
    '  "tiempos": [',
    '    {',
    '      "id": "<id del tiempo>",',
    '      "nombre": "<nombre del tiempo>",',
    '      "opciones": [',
    '        {',
    '          "nombre": "<nombre del platillo>",',
    '          "alimentos": [',
    '            { "grupo": "<ID grupo SMAE>", "equivalentes": <número>, "calculo": "<cómo obtuviste la porción>", "descripcion": "<porción concreta>" }',
    '          ],',
    '          "preparacion": "<pasos, solo si aplica>"',
    '        }',
    '      ]',
    '    }',
    '  ]',
    '}',
    '',
    `IDs de grupo válidos: ${GRUPOS_SMAE.map((g) => g.id).join(', ')}.`
  )

  return lineas.join('\n')
}

/**
 * Segundo paso: la IA revisa sus propios gramajes y corrige los que no
 * correspondan a los equivalentes, SIN cambiar el número de equivalentes ni los
 * grupos. Es la parte de "auto-revisión" que reduce el sesgo en las porciones.
 */
async function revisarPorciones(
  promptSistema: string,
  dieta: DietaGenerada
): Promise<DietaGenerada> {
  const revision =
    'Esta es la dieta que propusiste (JSON abajo). REVÍSALA con cuidado, alimento por alimento:\n' +
    '1. Para cada alimento, verifica que la PORCIÓN de la descripción realmente corresponda al ' +
    'número de "equivalentes" indicado, usando la composición del alimento (por 100 g) y el ' +
    'aporte por equivalente del grupo. Rehaz el cálculo en el campo "calculo".\n' +
    '2. Si una porción está mal (ej. gramos crudos en cereal/leguminosa, o un gramaje que no ' +
    'cuadra con los nutrientes del alimento), CORRÍGELA. Para cereales y leguminosas usa medidas ' +
    'caseras cocidas (tazas), no gramos crudos.\n' +
    '3. NO cambies el "grupo" ni el número de "equivalentes" de ningún alimento. Solo ajusta la ' +
    'descripción/porción si estaba mal.\n' +
    'Devuelve la dieta corregida en EXACTAMENTE el mismo formato JSON.\n\n' +
    'Dieta a revisar:\n' +
    JSON.stringify(dieta)

  try {
    return await llamarIA(promptSistema, revision)
  } catch {
    // Si la revisión falla por lo que sea, devolvemos la dieta original (mejor que nada).
    return dieta
  }
}

/**
 * Hace una llamada a la IA y normaliza la respuesta a DietaGenerada.
 */
async function llamarIA(promptSistema: string, promptUsuario: string): Promise<DietaGenerada> {
  const client = getCliente()
  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  // Temperatura baja: queremos precisión (respetar equivalentes), no creatividad.
  const temperature = 0.3

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: promptSistema },
        { role: 'user', content: promptUsuario },
      ],
      temperature,
      response_format: { type: 'json_object' },
    })

    const contenido = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(contenido) as DietaGenerada

    const dieta: DietaGenerada = {
      mensaje: typeof parsed.mensaje === 'string' ? parsed.mensaje : '',
      tiempos: Array.isArray(parsed.tiempos)
        ? parsed.tiempos.map((t) => ({
            id: String(t.id ?? ''),
            nombre: String(t.nombre ?? ''),
            nota: t.nota ? String(t.nota) : undefined,
            alimentos: Array.isArray(t.alimentos)
              ? t.alimentos.map((a) => ({
                  grupo: a.grupo,
                  equivalentes: Number(a.equivalentes) || 0,
                  descripcion: String(a.descripcion ?? ''),
                  calculo: a.calculo ? String(a.calculo) : undefined,
                }))
              : [],
          }))
        : [],
    }

    logSuccess('Dieta generada con IA', {
      tiempos: dieta.tiempos.length,
      tokens: completion.usage?.total_tokens ?? 0,
    })

    return dieta
  } catch (error) {
    captureError(error as Error, { module: 'generarDietaConIA' })
    throw new Error(
      error instanceof Error
        ? `Error al generar la dieta: ${error.message}`
        : 'Error al generar la dieta'
    )
  }
}

/**
 * Valida que los alimentos propuestos por la IA respeten los equivalentes pedidos
 * en cada tiempo. Devuelve las discrepancias (vacío = todo cuadra).
 */
export function validarDietaGenerada(
  entrada: EntradaGeneracion,
  dieta: DietaGenerada
): Array<{ tiempo: string; grupo: GrupoSMAEId; pedido: number; propuesto: number }> {
  const discrepancias: Array<{
    tiempo: string
    grupo: GrupoSMAEId
    pedido: number
    propuesto: number
  }> = []

  for (const t of entrada.tiempos) {
    const generado = dieta.tiempos.find((g) => g.id === t.id)
    for (const grupo of GRUPOS_SMAE) {
      const pedido = t.equivalentes[grupo.id] ?? 0
      const propuesto = (generado?.alimentos ?? [])
        .filter((a) => a.grupo === grupo.id)
        .reduce((s, a) => s + (a.equivalentes || 0), 0)
      if (Math.abs(pedido - propuesto) > 0.001) {
        discrepancias.push({ tiempo: t.nombre, grupo: grupo.id, pedido, propuesto })
      }
    }
  }

  return discrepancias
}
