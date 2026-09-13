import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'

/**
 * Plantillas de dieta: las recetas de trabajo del nutriólogo.
 * ------------------------------------------------------------
 * GET  /api/dietas/plantillas   Las plantillas guardadas.
 * POST /api/dietas/plantillas   Guarda un cuadro existente como plantilla.
 *
 * Una plantilla recuerda lo que NO depende del paciente —fórmula, macros,
 * equivalentes y reparto en tiempos—, para no rehacerlo en cada consulta. El
 * peso, la talla y la edad se capturan siempre: son de la persona.
 */

const crearSchema = z.object({
  nombre: z.string().trim().min(1, 'Ponle un nombre').max(60),
  /** Cuadro del que se copia la receta. */
  cuadro_id: z.string().min(1),
})

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const plantillas = await prisma.plantillaDieta.findMany({
    where: { activa: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nombre: true,
      objetivo: true,
      nivel_actividad: true,
      formula: true,
      pct_proteina: true,
      pct_grasa: true,
      pct_carbohidrato: true,
      ajuste_kcal_custom: true,
      equivalentes: true,
      distribucion_tiempos: true,
      kcal_referencia: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ plantillas }, { status: 200 })
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = crearSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' },
      { status: 400 }
    )
  }
  const { nombre, cuadro_id } = parsed.data

  const cuadro = await prisma.cuadroDietosintetico.findUnique({
    where: { id: cuadro_id },
    select: {
      objetivo: true,
      nivel_actividad: true,
      formula: true,
      pct_proteina: true,
      pct_grasa: true,
      pct_carbohidrato: true,
      ajuste_kcal_custom: true,
      equivalentes: true,
      distribucion_tiempos: true,
      kcal_meta: true,
    },
  })
  if (!cuadro) {
    return NextResponse.json({ error: 'Cuadro no encontrado' }, { status: 404 })
  }

  // El nombre es único: se avisa en vez de dejar que reviente la restricción
  // de la base con un error que no dice nada.
  const repetida = await prisma.plantillaDieta.findUnique({
    where: { nombre },
    select: { id: true },
  })
  if (repetida) {
    return NextResponse.json(
      { error: `Ya tienes una plantilla llamada «${nombre}»` },
      { status: 409 }
    )
  }

  const plantilla = await prisma.plantillaDieta.create({
    data: {
      nombre,
      objetivo: cuadro.objetivo,
      nivel_actividad: cuadro.nivel_actividad,
      formula: cuadro.formula,
      pct_proteina: cuadro.pct_proteina,
      pct_grasa: cuadro.pct_grasa,
      pct_carbohidrato: cuadro.pct_carbohidrato,
      ajuste_kcal_custom: cuadro.ajuste_kcal_custom,
      equivalentes: cuadro.equivalentes ?? undefined,
      distribucion_tiempos: cuadro.distribucion_tiempos ?? undefined,
      // Solo para reconocerla en la lista: las kcal reales dependerán del
      // paciente al que se aplique.
      kcal_referencia: cuadro.kcal_meta,
    },
  })

  return NextResponse.json({ plantilla }, { status: 201 })
}
