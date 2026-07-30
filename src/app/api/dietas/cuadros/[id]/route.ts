import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'

/**
 * Un cuadro dietosintético completo (para recuperarlo y repoblar la pantalla).
 * GET    /api/dietas/cuadros/[id]
 * PATCH  /api/dietas/cuadros/[id]   Renombra la etiqueta del cuadro.
 * DELETE /api/dietas/cuadros/[id]
 */

const patchSchema = z.object({
  // Cadena vacía = quitar la etiqueta.
  etiqueta: z.string().max(60),
})

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const cuadro = await prisma.cuadroDietosintetico.findUnique({
    where: { id },
    include: {
      paciente: { select: { id: true, nombre: true, email: true } },
      // Las dietas/recetarios del cuadro, para restaurarlos en la pestaña IA.
      dietas: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!cuadro) {
    return NextResponse.json({ error: 'Cuadro no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ cuadro }, { status: 200 })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existe = await prisma.cuadroDietosintetico.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existe) {
    return NextResponse.json({ error: 'Cuadro no encontrado' }, { status: 404 })
  }

  const etiqueta = parsed.data.etiqueta.trim()
  const cuadro = await prisma.cuadroDietosintetico.update({
    where: { id },
    data: { etiqueta: etiqueta || null },
    select: { id: true, etiqueta: true },
  })

  return NextResponse.json({ cuadro }, { status: 200 })
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const existe = await prisma.cuadroDietosintetico.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existe) {
    return NextResponse.json({ error: 'Cuadro no encontrado' }, { status: 404 })
  }

  // Las dietas se borran en cascada con el cuadro, así que no permitimos
  // eliminar uno que tenga versiones definitivas: se perderían sin aviso.
  const finalizadas = await prisma.dietaGenerada.count({
    where: { cuadro_id: id, estado: 'FINALIZADA' },
  })
  if (finalizadas > 0) {
    return NextResponse.json(
      { error: 'Este cuadro tiene una dieta finalizada y no se puede eliminar.' },
      { status: 409 }
    )
  }

  await prisma.cuadroDietosintetico.delete({ where: { id } })
  return NextResponse.json({ ok: true }, { status: 200 })
}
