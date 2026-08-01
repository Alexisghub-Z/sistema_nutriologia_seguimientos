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

/**
 * Modelo para el sistema de DIETAS. Tiene su propia variable
 * (OPENAI_MODEL_DIETAS) independiente del chatbot de respuestas a pacientes,
 * que sigue usando OPENAI_MODEL. Así podemos usar un modelo más barato para las
 * dietas sin afectar al asistente de consultas. Si no se define la variable
 * específica, cae en el modelo general y, por último, en gpt-4o.
 */
function modeloConfigurado(): string {
  return process.env.OPENAI_MODEL_DIETAS || process.env.OPENAI_MODEL || 'gpt-4o'
}

/**
 * Los modelos gpt-5 y la familia de razonamiento (o1/o3/o4) NO aceptan valores
 * de `temperature` distintos del default (1); enviar otro valor da error 400.
 * Esta función detecta esos modelos para omitir la temperatura.
 */
function modeloIgnoraTemperature(model: string): boolean {
  return /^(gpt-5|o1|o3|o4)/i.test(model)
}

/** true si el modelo es de la familia gpt-5 (acepta reasoning_effort). */
function esModeloGpt5(model: string): boolean {
  return /^gpt-5/i.test(model)
}

/**
 * Construye los parámetros de la llamada de forma compatible con el modelo:
 * - gpt-4o / gpt-4.1: incluye `temperature` (control de precisión).
 * - gpt-5: OMITE temperature (la rechaza) y fuerza `reasoning_effort: "minimal"`.
 *   Sin esto, gpt-5 "razona" miles de tokens y tarda ~90s por llamada (con dos
 *   llamadas encadenadas se cuelga). Con "minimal" responde en ~20s y es más
 *   barato (0 tokens de razonamiento), manteniendo buena calidad para dietas.
 * - o-series: omite temperature (no soporta reasoning_effort vía este campo).
 */
function paramsModelo(
  model: string,
  temperature: number
): { temperature?: number; reasoning_effort?: 'minimal' | 'low' | 'medium' | 'high' } {
  if (esModeloGpt5(model)) return { reasoning_effort: 'minimal' }
  if (modeloIgnoraTemperature(model)) return {}
  return { temperature }
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

/**
 * Restricciones alimentarias del paciente. Se pasan aparte del perfil del
 * nutriólogo porque son del paciente y tienen prioridad sobre cualquier
 * preferencia de estilo.
 */
export interface RestriccionesPaciente {
  alergias?: string | null
  intolerancias?: string | null
  preferencias?: string | null
  disgustos?: string | null
}

/** Entrada para generar una dieta. */
export interface EntradaGeneracion {
  kcalMeta: number
  macros: { proteina_g: number; grasa_g: number; carbohidrato_g: number }
  tiempos: TiempoConEquivalentes[]
  perfil: PerfilEstilo
  // Alergias y demás restricciones del paciente: mandan sobre todo lo demás.
  restricciones?: RestriccionesPaciente
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
  // Bloqueado por el nutriólogo: la IA debe devolverlo intacto.
  fijado?: boolean
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

// ============================================================
// Chat conversacional (copiloto)
// ============================================================

/** Un mensaje del historial de conversación. */
export interface MensajeChatIA {
  rol: 'user' | 'assistant'
  contenido: string
}

/** Marcador que separa el texto conversacional de la dieta actualizada (JSON). */
export const MARCADOR_DIETA = '<<<DIETA_ACTUALIZADA>>>'

const NOMBRE_GRUPO: Record<GrupoSMAEId, string> = Object.fromEntries(
  GRUPOS_SMAE.map((g) => [g.id, g.nombre])
) as Record<GrupoSMAEId, string>

/**
 * Construye el prompt del sistema con el perfil del nutriólogo.
 */
function construirPromptSistema(
  perfil: PerfilEstilo,
  ejemplos?: string[],
  restricciones?: RestriccionesPaciente
): string {
  const partes: string[] = [
    'Eres el asistente de nutrición de un nutriólogo profesional. Tu trabajo es proponer',
    'los ALIMENTOS CONCRETOS de una dieta, respetando EXACTAMENTE el número de equivalentes',
    'del Sistema Mexicano de Alimentos Equivalentes (SMAE) que se te indica para cada tiempo',
    'de comida. NO cambies el número de equivalentes: solo eliges qué alimentos los cumplen.',
  ]

  // Las restricciones del paciente van ANTES que nada: mandan sobre el estilo
  // del nutriólogo y sobre cualquier otra consideración.
  const r = restricciones
  if (r?.alergias || r?.intolerancias || r?.preferencias || r?.disgustos) {
    partes.push('', '=== RESTRICCIONES DEL PACIENTE (prioridad máxima) ===')

    if (r.alergias) {
      partes.push(
        `ALERGIAS: ${r.alergias}`,
        'PROHIBIDO ABSOLUTO. Es un riesgo para su salud. No propongas esos alimentos',
        'ni NINGÚN platillo o preparación que los contenga como ingrediente, por poco que',
        'sea (ej. si es alérgico al huevo, tampoco pan, empanizados ni salsas que lleven',
        'huevo). Ante la duda sobre si algo lo contiene, NO lo uses. Esta regla no admite',
        'excepciones aunque el nutriólogo pida lo contrario.'
      )
    }
    if (r.intolerancias) {
      partes.push(
        `INTOLERANCIAS: ${r.intolerancias}`,
        'Evítalos también en preparaciones. Si existe una versión tolerada (deslactosada,',
        'sin gluten), úsala y acláralo en la descripción.'
      )
    }
    if (r.preferencias) {
      partes.push(`PREFERENCIAS: ${r.preferencias}`, 'Respétalas al elegir los alimentos.')
    }
    if (r.disgustos) {
      partes.push(
        `NO LE GUSTAN: ${r.disgustos}`,
        'Evítalos salvo que no exista alternativa razonable en ese grupo.'
      )
    }
    partes.push('=== FIN DE LAS RESTRICCIONES ===')
  }

  partes.push('', 'Debes imitar el estilo del nutriólogo, descrito a continuación:')

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
    'COHERENCIA GASTRONÓMICA (regla de oro, NO negociable):',
    '- Cada tiempo debe ser un PLATILLO REAL Y APETITOSO que una persona comería de verdad;',
    '  sus ingredientes tienen que combinar entre sí. NUNCA metas un alimento solo para "cumplir',
    '  el equivalente" si no pega con el resto.',
    '- Dentro de cada grupo, elige el alimento CONCRETO que combine. "Verduras" NO es solo lechuga:',
    '  incluye jitomate, calabaza, nopal, champiñón, espinaca, zanahoria, chayote, ejote, pimiento…',
    '  En un licuado o bebida las únicas verduras que caben son espinaca o apio; JAMÁS lechuga,',
    '  nopal o calabaza en algo dulce.',
    '- Platillos DULCES (yogur con fruta, licuados, avena, hot cakes, fruta con nueces) llevan fruta,',
    '  lácteo, cereal y oleaginosas; NO verduras saladas. Si el tiempo trae equivalentes de verdura',
    '  y la opción es dulce, cambia el CONCEPTO a uno salado en vez de encajar la verdura a la fuerza.',
    '- Cantidades realistas y comibles: evita cifras absurdas (p. ej. "5 tazas de lechuga" o',
    '  "6 tazas de arroz" en una comida). Si un equivalente obliga a mucho de un solo alimento,',
    '  repártelo entre dos alimentos del mismo grupo que combinen.',
    '',
    'SENCILLEZ (importante): los platillos deben ser SENCILLOS, CASEROS y del día a día,',
    'con POCOS ingredientes y preparación fácil y rápida. NO hagas recetas gourmet, elaboradas',
    'ni de restaurante. Prefiere combinaciones simples y comunes en México (ej. "huevo a la',
    'mexicana con frijoles y tortilla", "quesadilla de nopal", "fruta con yogur y granola"),',
    'no platillos rebuscados con muchos pasos o ingredientes poco accesibles.',
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

  const promptSistema = construirPromptSistema(entrada.perfil, entrada.ejemplos, entrada.restricciones)
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

  const promptSistema = construirPromptSistemaRecetario(entrada.perfil, entrada.ejemplos, entrada.restricciones)
  const promptUsuario = construirPromptUsuarioRecetario(entrada, opcionesPorTiempo)

  const client = getCliente()
  const model = modeloConfigurado()

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: promptSistema },
        { role: 'user', content: promptUsuario },
      ],
      ...paramsModelo(model, 0.5), // algo de variedad entre opciones, pero sin desviarse
      response_format: { type: 'json_object' },
    })

    const contenido = completion.choices[0]?.message?.content || '{}'
    let recetario = parsearRecetario(contenido, entrada.perfil.indicaciones_inicio ?? '')

    logSuccess('Recetario generado con IA', {
      tiempos: recetario.tiempos.length,
      tokens: completion.usage?.total_tokens ?? 0,
    })

    // Auto-revisión de porciones: la IA revisa sus gramajes en TODAS las opciones
    // y corrige los que no correspondan a los equivalentes (mismo nivel que la dieta precisa).
    recetario = await revisarPorcionesRecetario(promptSistema, recetario)

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

/** Normaliza el JSON de la IA a un RecetarioGenerado. */
function parsearRecetario(contenido: string, indicacionesInicio: string): RecetarioGenerado {
  const limpio = contenido.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  const parsed = JSON.parse(limpio) as RecetarioGenerado
  return {
    indicacionesInicio,
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
                      fijado: a.fijado === true ? true : undefined,
                    }))
                  : [],
              }))
            : [],
        }))
      : [],
  }
}

/**
 * Auto-revisión de porciones del recetario: la IA revisa los gramajes de cada
 * alimento en cada opción y corrige los que no cuadren, SIN cambiar grupos ni
 * equivalentes. Misma capa de precisión que la dieta precisa.
 */
async function revisarPorcionesRecetario(
  promptSistema: string,
  recetario: RecetarioGenerado
): Promise<RecetarioGenerado> {
  const revision =
    'Este es el recetario que propusiste (JSON abajo). REVÍSALO opción por opción, alimento por alimento:\n' +
    '1. Verifica que la PORCIÓN de cada alimento corresponda al número de "equivalentes" indicado,\n' +
    'usando la composición del alimento (por 100 g) y el aporte por equivalente del grupo. Rehaz el\n' +
    'cálculo en "calculo".\n' +
    '2. Si una porción está mal (gramos crudos en cereal/leguminosa, o un gramaje que no cuadra),\n' +
    'CORRÍGELA. En cereales y leguminosas usa medidas caseras cocidas (tazas), no gramos crudos.\n' +
    '3. COHERENCIA: revisa que cada alimento TENGA SENTIDO dentro de su platillo. Si un ingrediente\n' +
    'no combina (ej. lechuga u otra verdura salada dentro de un yogur, licuado o platillo dulce),\n' +
    'REEMPLÁZALO por otro alimento DEL MISMO GRUPO y MISMOS equivalentes que sí combine (para verdura\n' +
    'en algo dulce: espinaca en licuado; o si de plano no cabe, cambia el nombre/concepto de la opción\n' +
    'a uno salado donde esa verdura encaje). Corrige también cantidades absurdas (p. ej. "5 tazas de\n' +
    'lechuga" en una comida) repartiéndolas o eligiendo un alimento más denso del grupo.\n' +
    '4. NO cambies el "grupo" ni el número de "equivalentes" de ningún alimento; puedes cambiar el\n' +
    'ALIMENTO concreto (descripción), la porción y el nombre del platillo para que todo sea coherente.\n' +
    'Devuelve el recetario corregido en EXACTAMENTE el mismo formato JSON.\n\n' +
    'Recetario a revisar:\n' +
    JSON.stringify({ tiempos: recetario.tiempos })

  try {
    const client = getCliente()
    const model = modeloConfigurado()
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: promptSistema },
        { role: 'user', content: revision },
      ],
      ...paramsModelo(model, 0.2),
      response_format: { type: 'json_object' },
    })
    const contenido = completion.choices[0]?.message?.content || '{}'
    return parsearRecetario(contenido, recetario.indicacionesInicio)
  } catch {
    return recetario // si la revisión falla, devolvemos el original
  }
}

/** Prompt de sistema para el recetario (reusa el estilo, pide varias opciones). */
function construirPromptSistemaRecetario(
  perfil: PerfilEstilo,
  ejemplos?: string[],
  restricciones?: RestriccionesPaciente
): string {
  // Reusamos todo el prompt de estilo/reglas de la dieta precisa, y añadimos la
  // instrucción de formato "varias opciones por tiempo".
  const base = construirPromptSistema(perfil, ejemplos, restricciones)
  return (
    base +
    '\n\n' +
    'FORMATO RECETARIO (muy importante):\n' +
    '- En vez de UNA dieta, genera VARIAS OPCIONES de platillo por cada tiempo de comida.\n' +
    '- CADA opción debe cumplir EXACTAMENTE los mismos equivalentes del tiempo (son intercambiables).\n' +
    '- Dale a cada opción un nombre de platillo atractivo (ej. "Entomatadas", "Tostada de aguacate").\n' +
    '- Cuando el platillo lo requiera (licuados, hot cakes, pasteles), incluye la preparación en "preparacion".\n' +
    '- Usa alimentos y preparaciones del estilo del nutriólogo y respeta sus indicaciones de inicio.\n' +
    '- COHERENCIA (recuerda la regla de oro): CADA opción es un platillo real y apetitoso. Si un\n' +
    '  tiempo trae equivalentes de verdura y una opción es dulce (yogur, licuado, avena con fruta),\n' +
    '  NO metas lechuga ni verduras saladas dentro: diseña esa opción como un platillo SALADO donde\n' +
    '  la verdura encaje, o elige una verdura que combine (espinaca en licuado). Antes que forzar un\n' +
    '  ingrediente que rompa el platillo, prefiere otra opción distinta donde ese grupo encaje bien.'
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
    'RAZONA CADA PORCIÓN (obligatorio para exactitud, en TODAS las opciones):',
    'Antes de escribir la porción de un alimento, calcúlala a partir de su composición. Toma el',
    'macronutriente que define al grupo (proteína para AOA y leche; HCO para cereales, frutas,',
    'verduras, leguminosas y azúcares; lípidos para aceites), mira cuánto aporta por 100 g y',
    'calcula los gramos que dan los equivalentes pedidos. Ej: pollo ≈ 31 g prot/100 g; 1 equiv de',
    'AOA = 7 g prot; entonces 1 equiv ≈ 7 ÷ 31 × 100 ≈ 23 g. Pon ese cálculo en el campo "calculo".',
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
    '      "id": "<id del tiempo>",',
    '      "nombre": "<nombre del tiempo>",',
    '      "opciones": [',
    '        {',
    '          "nombre": "<nombre del platillo>",',
    '          "alimentos": [',
    '            { "grupo": "<ID grupo SMAE>", "equivalentes": <número>, "calculo": "<cómo obtuviste la porción>", "descripcion": "<porción concreta con su cantidad>" }',
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
  const model = modeloConfigurado()
  // Temperatura baja: queremos precisión (respetar equivalentes), no creatividad.
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: promptSistema },
        { role: 'user', content: promptUsuario },
      ],
      ...paramsModelo(model, 0.3),
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
                  fijado: a.fijado === true ? true : undefined,
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
 * Chat conversacional (copiloto). La IA responde con naturalidad al nutriólogo
 * y, si el mensaje implica cambiar la dieta, la actualiza respetando los
 * equivalentes. Devuelve un stream de texto (SSE-friendly).
 *
 * Formato de respuesta de la IA:
 *   <texto conversacional en vivo>
 *   [si hay cambios] MARCADOR_DIETA seguido del JSON de tiempos actualizado.
 *
 * @returns un AsyncIterable de trozos de texto (el texto conversacional).
 *          La dieta actualizada se obtiene aparte con extraerDietaDeRespuesta.
 */
/** Una alternativa propuesta para sustituir un alimento. */
export interface AlternativaAlimento {
  descripcion: string // "1 filete de pescado (100 g)"
  calculo?: string // cómo se obtuvo la porción
  nota?: string // por qué encaja aquí
}

/**
 * Propone alternativas para UN alimento concreto, sin tocar el resto de la dieta.
 *
 * A diferencia del chat —que reescribe todo— esto resuelve el caso más común en
 * consulta: "cámbiame el pollo por otra cosa". Las alternativas mantienen el
 * mismo grupo y los mismos equivalentes, así que el cuadre no se altera.
 */
export async function sugerirAlternativas(params: {
  grupo: GrupoSMAEId
  equivalentes: number
  descripcionActual: string
  /** Dónde está el alimento, para que la propuesta encaje con el platillo. */
  contexto?: string
  perfil: PerfilEstilo
  restricciones?: RestriccionesPaciente
  cuantas?: number
}): Promise<AlternativaAlimento[]> {
  const { grupo, equivalentes, descripcionActual, contexto, cuantas = 3 } = params
  const info = GRUPOS_SMAE.find((g) => g.id === grupo)
  if (!info) return []

  const referencias = PORCIONES_REFERENCIA[grupo]
  const r = params.restricciones

  const partes: string[] = [
    'Eres el asistente de un nutriólogo mexicano. Propón alternativas para UN alimento',
    'concreto de una dieta, manteniendo su aporte nutricional.',
    '',
    `Alimento actual: "${descripcionActual}"`,
    `Grupo SMAE: ${info.nombre} · ${equivalentes} equivalente(s)`,
    `Aporte por equivalente: HCO ${info.hco} g · Proteína ${info.proteina} g · Lípidos ${info.lipidos} g · ${info.kcal} kcal`,
  ]

  if (contexto) partes.push(`Va en: ${contexto}`)

  if (referencias?.length) {
    partes.push('', 'Porciones de referencia de este grupo (1 equivalente cada una):')
    partes.push(...referencias.map((p) => `- ${p}`))
  }

  // Las restricciones del paciente mandan sobre cualquier otra consideración.
  if (r?.alergias) {
    partes.push(
      '',
      `ALERGIAS (prohibido absoluto): ${r.alergias}.`,
      'No propongas esos alimentos ni nada que los contenga.'
    )
  }
  if (r?.intolerancias) partes.push(`Intolerancias a evitar: ${r.intolerancias}.`)
  if (r?.preferencias) partes.push(`Preferencias: ${r.preferencias}.`)
  if (r?.disgustos) partes.push(`No le gustan: ${r.disgustos}.`)

  if (params.perfil.region) partes.push('', `Región del paciente: ${params.perfil.region}.`)
  if (params.perfil.alimentos_tipicos)
    partes.push(`Alimentos que el nutriólogo suele usar: ${params.perfil.alimentos_tipicos}.`)
  if (params.perfil.alimentos_evitar)
    partes.push(`Alimentos que evita: ${params.perfil.alimentos_evitar}.`)

  partes.push(
    '',
    'REGLAS:',
    `1. Propón ${cuantas} alternativas DISTINTAS entre sí y distintas del alimento actual.`,
    '2. Todas del MISMO grupo SMAE y equivalentes a la misma cantidad.',
    '3. Calcula la porción a partir de la composición del alimento (por 100 g) y del',
    '   aporte por equivalente. Pon ese cálculo en "calculo".',
    '4. En cereales y leguminosas usa medidas caseras COCIDAS (tazas), no gramos crudos.',
    '5. Alimentos comunes y accesibles en México, que combinen con el platillo.',
    '',
    'Devuelve SOLO este JSON:',
    '{"alternativas":[{"descripcion":"<porción concreta>","calculo":"<cómo la obtuviste>","nota":"<por qué encaja, breve>"}]}'
  )

  const client = getCliente()
  const model = modeloConfigurado()

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: partes.join('\n') },
        {
          role: 'user',
          content: `Dame ${cuantas} alternativas para "${descripcionActual}".`,
        },
      ],
      ...paramsModelo(model, 0.6), // algo de variedad entre las opciones
      response_format: { type: 'json_object' },
    })

    const contenido = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(contenido) as { alternativas?: unknown }
    if (!Array.isArray(parsed.alternativas)) return []

    return parsed.alternativas
      .map((a) => {
        const item = a as Record<string, unknown>
        return {
          descripcion: String(item.descripcion ?? '').trim(),
          calculo: item.calculo ? String(item.calculo) : undefined,
          nota: item.nota ? String(item.nota) : undefined,
        }
      })
      .filter((a) => a.descripcion.length > 0)
      .slice(0, cuantas)
  } catch (error) {
    captureError(error as Error, { module: 'sugerirAlternativas' })
    return []
  }
}

export async function* chatDietaStream(params: {
  entrada: EntradaGeneracion
  // Estado actual sobre el que se conversa: una dieta precisa o un recetario.
  modo: 'dieta' | 'recetario'
  estadoActual: DietaGenerada | RecetarioGenerado
  historial: MensajeChatIA[]
  mensaje: string
}): AsyncGenerator<string, void, unknown> {
  const client = getCliente()
  const model = modeloConfigurado()

  const promptSistema = construirPromptSistemaChat(params.entrada, params.modo, params.estadoActual)

  const mensajes: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: promptSistema },
    ...params.historial.map((m) => ({
      role: m.rol as 'user' | 'assistant',
      content: m.contenido,
    })),
    { role: 'user', content: params.mensaje },
  ]

  const stream = await client.chat.completions.create({
    model,
    messages: mensajes,
    ...paramsModelo(model, 0.4),
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) yield delta
  }
}

/**
 * Separa el texto conversacional de la dieta actualizada en la respuesta
 * completa del chat. Devuelve { texto, dieta }.
 */
export function extraerDietaDeRespuesta(respuestaCompleta: string): {
  texto: string
  dieta: DietaGenerada | null
} {
  const idx = respuestaCompleta.indexOf(MARCADOR_DIETA)
  if (idx === -1) {
    return { texto: respuestaCompleta.trim(), dieta: null }
  }
  const texto = respuestaCompleta.slice(0, idx).trim()
  const jsonRaw = respuestaCompleta.slice(idx + MARCADOR_DIETA.length).trim()
  try {
    // El JSON puede venir dentro de ```json ... ``` o suelto.
    const limpio = jsonRaw.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(limpio) as { tiempos?: TiempoGenerado[] }
    if (!Array.isArray(parsed.tiempos)) return { texto, dieta: null }
    const dieta: DietaGenerada = {
      mensaje: texto,
      tiempos: parsed.tiempos.map((t) => ({
        id: String(t.id ?? ''),
        nombre: String(t.nombre ?? ''),
        nota: t.nota ? String(t.nota) : undefined,
        alimentos: Array.isArray(t.alimentos)
          ? t.alimentos.map((a) => ({
              grupo: a.grupo,
              equivalentes: Number(a.equivalentes) || 0,
              descripcion: String(a.descripcion ?? ''),
              calculo: a.calculo ? String(a.calculo) : undefined,
              fijado: a.fijado === true ? true : undefined,
            }))
          : [],
      })),
    }
    return { texto, dieta }
  } catch {
    return { texto, dieta: null }
  }
}

/**
 * Separa el texto conversacional del RECETARIO actualizado en la respuesta.
 */
export function extraerRecetarioDeRespuesta(
  respuestaCompleta: string,
  indicacionesInicio: string
): { texto: string; recetario: RecetarioGenerado | null } {
  const idx = respuestaCompleta.indexOf(MARCADOR_DIETA)
  if (idx === -1) return { texto: respuestaCompleta.trim(), recetario: null }
  const texto = respuestaCompleta.slice(0, idx).trim()
  const jsonRaw = respuestaCompleta.slice(idx + MARCADOR_DIETA.length).trim()
  try {
    const limpio = jsonRaw.replace(/^```json\s*/i, '').replace(/```\s*$/, '')
    const parsed = JSON.parse(limpio) as { tiempos?: TiempoRecetario[] }
    if (!Array.isArray(parsed.tiempos)) return { texto, recetario: null }
    const recetario: RecetarioGenerado = {
      indicacionesInicio,
      mensaje: texto,
      tiempos: parsed.tiempos.map((t) => ({
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
                    fijado: a.fijado === true ? true : undefined,
                  }))
                : [],
            }))
          : [],
      })),
    }
    return { texto, recetario }
  } catch {
    return { texto, recetario: null }
  }
}

/** Prompt de sistema del chat: contexto y reglas, para dieta o recetario. */
function construirPromptSistemaChat(
  entrada: EntradaGeneracion,
  modo: 'dieta' | 'recetario',
  estadoActual: DietaGenerada | RecetarioGenerado
): string {
  const base = construirPromptSistema(entrada.perfil, entrada.ejemplos, entrada.restricciones)

  const equivalentesPorTiempo = entrada.tiempos
    .map((t) => {
      const grupos = Object.entries(t.equivalentes)
        .filter(([, n]) => (n ?? 0) > 0)
        .map(([id, n]) => `${n} de ${NOMBRE_GRUPO[id as GrupoSMAEId]}`)
        .join(', ')
      return `- ${t.nombre} (id="${t.id}"): ${grupos}`
    })
    .join('\n')

  const comun =
    '\n\n' +
    'MODO CONVERSACIÓN (copiloto):\n' +
    `Estás conversando con el nutriólogo sobre el ${modo === 'recetario' ? 'recetario' : 'plan'} que propusiste.\n` +
    'Responde con naturalidad, breve y cercano, como un colega experto. Reglas:\n' +
    '1. Si solo pregunta, comenta o pide una aclaración: responde en texto, NO cambies nada.\n' +
    '2. Si pide un cambio concreto: primero confírmalo en texto y LUEGO incluye la versión actualizada.\n' +
    `3. Al actualizar, escribe el texto PRIMERO, después una línea con exactamente "${MARCADOR_DIETA}" y luego el JSON.\n` +
    '4. Cada tiempo/opción DEBE seguir respetando EXACTAMENTE estos equivalentes por tiempo:\n' +
    equivalentesPorTiempo +
    '\n5. Nunca muestres el JSON ni el marcador si NO cambiaste nada.\n' +
    '6. ALIMENTOS FIJADOS (importante): los alimentos con "fijado": true están\n' +
    '   bloqueados por el nutriólogo. NO cambies su grupo, sus equivalentes ni su\n' +
    '   descripción, y NO los elimines. Devuélvelos EXACTAMENTE como están, con su\n' +
    '   "fijado": true. Si te piden algo que obligaría a tocarlos, cámbialo en los\n' +
    '   demás alimentos, y si no es posible, dilo en el texto en lugar de forzarlo.\n'

  const formato =
    modo === 'recetario'
      ? 'Formato del JSON (recetario): {"tiempos":[{"id":"...","nombre":"...","opciones":[{"nombre":"...","alimentos":[{"grupo":"...","equivalentes":<n>,"calculo":"...","descripcion":"..."}],"preparacion":"..."}]}]}\n'
      : 'Formato del JSON (dieta): {"tiempos":[{"id":"...","nombre":"...","alimentos":[{"grupo":"...","equivalentes":<n>,"calculo":"...","descripcion":"..."}],"nota":"..."}]}\n'

  const estado =
    `\n${modo === 'recetario' ? 'Recetario' : 'Dieta'} actual (para tu referencia):\n` +
    JSON.stringify((estadoActual as { tiempos: unknown }).tiempos)

  return base + comun + formato + estado
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
