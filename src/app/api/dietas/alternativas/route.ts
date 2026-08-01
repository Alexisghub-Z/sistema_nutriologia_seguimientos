import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { GRUPOS_SMAE, type GrupoSMAEId } from '@/lib/utils/smae'
import { sugerirAlternativas, isGeneradorDisponible } from '@/lib/services/generador-dietas'

/**
 * Alternativas para un alimento concreto de la dieta.
 * POST /api/dietas/alternativas
 *
 * Sustituye el caso más frecuente de la consulta ("cámbiame el pollo") sin pasar
 * por el chat, que reescribiría toda la dieta. Las propuestas mantienen grupo y
 * equivalentes, así que el cuadro sigue cuadrando.
 */

// Una llamada corta a la IA; margen de sobra.
export const maxDuration = 60

const GRUPO_IDS = GRUPOS_SMAE.map((g) => g.id) as [GrupoSMAEId, ...GrupoSMAEId[]]

const schema = z.object({
  grupo: z.enum(GRUPO_IDS),
  equivalentes: z.number().min(0.5).max(20),
  descripcion: z.string().min(1).max(300),
  // Tiempo u opción donde vive, para que la alternativa encaje con el platillo.
  contexto: z.string().max(200).optional(),
  // Para respetar sus alergias y preferencias.
  paciente_id: z.string().min(1).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!isGeneradorDisponible()) {
    return NextResponse.json({ error: 'La IA no está disponible' }, { status: 503 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const data = parsed.data

  const [perfil, restricciones] = await Promise.all([
    prisma.perfilEstiloDietas.findFirst(),
    data.paciente_id
      ? prisma.paciente.findUnique({
          where: { id: data.paciente_id },
          select: { alergias: true, intolerancias: true, preferencias: true, disgustos: true },
        })
      : Promise.resolve(null),
  ])

  const alternativas = await sugerirAlternativas({
    grupo: data.grupo,
    equivalentes: data.equivalentes,
    descripcionActual: data.descripcion,
    contexto: data.contexto,
    perfil: perfil ?? {},
    restricciones: restricciones ?? undefined,
  })

  return NextResponse.json({ alternativas }, { status: 200 })
}
