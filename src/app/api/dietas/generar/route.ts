import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { GRUPOS_SMAE, type Equivalentes, type GrupoSMAEId } from '@/lib/utils/smae'
import {
  generarDietaConIA,
  generarRecetario,
  validarDietaGenerada,
  isGeneradorDisponible,
  type EntradaGeneracion,
  type TiempoConEquivalentes,
} from '@/lib/services/generador-dietas'

/**
 * Genera los alimentos concretos de una dieta con IA.
 * POST /api/dietas/generar
 *
 * Recibe la meta, los tiempos con sus equivalentes y (opcional) instrucciones
 * extra del chat. Trae el perfil de estilo y ejemplos de dietas pasadas, y
 * pide a la IA los alimentos por tiempo respetando los equivalentes.
 */

const GRUPO_IDS = GRUPOS_SMAE.map((g) => g.id) as [GrupoSMAEId, ...GrupoSMAEId[]]
const equivalentesSchema = z.record(z.enum(GRUPO_IDS), z.number().min(0).max(99))

const generarSchema = z.object({
  paciente_id: z.string().optional(),
  kcal_meta: z.number().min(500).max(6000),
  proteina_g: z.number().min(0).max(600),
  grasa_g: z.number().min(0).max(400),
  carbohidrato_g: z.number().min(0).max(900),
  tiempos: z
    .array(
      z.object({
        id: z.string().min(1),
        nombre: z.string().min(1).max(60),
        equivalentes: equivalentesSchema,
      })
    )
    .min(1)
    .max(12),
  instrucciones_extra: z.string().max(1000).optional(),
  // 'dieta' = una dieta precisa; 'recetario' = varias opciones por tiempo.
  modo: z.enum(['dieta', 'recetario']).default('dieta'),
})

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!isGeneradorDisponible()) {
    return NextResponse.json(
      { error: 'La IA no está configurada (falta OPENAI_API_KEY o AI_ENABLED).' },
      { status: 503 }
    )
  }

  const body = await request.json()
  const parsed = generarSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const data = parsed.data

  // Perfil de estilo del nutriólogo (singleton).
  const perfil = (await prisma.perfilEstiloDietas.findFirst()) ?? {}

  // Ejemplos: últimas dietas guardadas con distribución en tiempos (few-shot).
  const ejemplos = await construirEjemplos()

  const entrada: EntradaGeneracion = {
    kcalMeta: data.kcal_meta,
    macros: {
      proteina_g: data.proteina_g,
      grasa_g: data.grasa_g,
      carbohidrato_g: data.carbohidrato_g,
    },
    tiempos: data.tiempos as TiempoConEquivalentes[],
    perfil,
    ejemplos,
    instruccionesExtra: data.instrucciones_extra,
  }

  try {
    if (data.modo === 'recetario') {
      const recetario = await generarRecetario(entrada)
      return NextResponse.json({ recetario }, { status: 200 })
    }
    const dieta = await generarDietaConIA(entrada)
    const discrepancias = validarDietaGenerada(entrada, dieta)
    return NextResponse.json({ dieta, discrepancias }, { status: 200 })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al generar la dieta' },
      { status: 502 }
    )
  }
}

/**
 * Construye ejemplos de few-shot con las últimas dietas que ya tienen alimentos
 * o al menos distribución en tiempos. Formato de texto simple para el prompt.
 */
async function construirEjemplos(): Promise<string[]> {
  const cuadros = await prisma.cuadroDietosintetico.findMany({
    where: { distribucion_tiempos: { not: undefined } },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { kcal_meta: true, distribucion_tiempos: true },
  })

  const ejemplos: string[] = []
  for (const c of cuadros) {
    const dt = c.distribucion_tiempos as {
      tiempos?: Array<{ id: string; nombre: string }>
      reparto?: Record<string, Equivalentes>
    } | null
    if (!dt?.tiempos?.length || !dt.reparto) continue

    const nombreGrupo = Object.fromEntries(GRUPOS_SMAE.map((g) => [g.id, g.nombre]))
    const lineas: string[] = [`Dieta de ${Math.round(c.kcal_meta)} kcal:`]
    for (const t of dt.tiempos) {
      const grupos = Object.entries(dt.reparto[t.id] ?? {})
        .filter(([, n]) => (n ?? 0) > 0)
        .map(([id, n]) => `${n} de ${nombreGrupo[id]}`)
        .join(', ')
      if (grupos) lineas.push(`  ${t.nombre}: ${grupos}`)
    }
    if (lineas.length > 1) ejemplos.push(lineas.join('\n'))
  }

  return ejemplos
}
