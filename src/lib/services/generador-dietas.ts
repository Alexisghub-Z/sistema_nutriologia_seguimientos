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
    'Devuelve un JSON con esta forma exacta:',
    '{',
    '  "mensaje": "breve comentario para el nutriólogo",',
    '  "tiempos": [',
    '    {',
    '      "id": "<el id del tiempo>",',
    '      "nombre": "<nombre del tiempo>",',
    '      "alimentos": [',
    '        { "grupo": "<ID de grupo SMAE>", "equivalentes": <número>, "descripcion": "<porción concreta>" }',
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

  return dieta
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
