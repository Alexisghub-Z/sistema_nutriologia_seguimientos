import OpenAI from 'openai'
import { GRUPOS_SMAE, type Equivalentes, type GrupoSMAEId } from '@/lib/utils/smae'
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
    'REGLAS DE SALIDA:',
    '- Cada alimento propuesto pertenece a un grupo y consume un número de equivalentes de ese grupo.',
    '- La suma de equivalentes por grupo en un tiempo DEBE coincidir con la meta indicada para ese tiempo.',
    '- Usa porciones caseras y claras (piezas, tazas, cucharadas) apropiadas para el paciente.',
    '- Responde ÚNICAMENTE en JSON válido con la forma especificada por el usuario.'
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
  const client = getCliente()
  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  const temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')

  const promptSistema = construirPromptSistema(entrada.perfil, entrada.ejemplos)
  const promptUsuario = construirPromptUsuario(entrada)

  logDebug('Generando dieta con IA', {
    model,
    tiempos: entrada.tiempos.length,
    kcalMeta: entrada.kcalMeta,
    tieneEjemplos: (entrada.ejemplos?.length ?? 0) > 0,
  })

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

    // Normaliza: asegura arrays y campos mínimos.
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
