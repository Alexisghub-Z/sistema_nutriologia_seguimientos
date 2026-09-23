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

/**
 * El cuadro tiene una dieta ya entregada. Se usa para abortar la transacción
 * de borrado: es la única forma de deshacerla desde dentro, y así la
 * comprobación y el borrado no pueden separarse.
 */
class ErrorTieneFinalizada extends Error {}

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
  //
  // Comprobar y borrar van en una TRANSACCIÓN. Por separado queda una ventana
  // entre las dos consultas: si alguien finaliza una dieta justo ahí —otra
  // pestaña, el propio autoguardado— el recuento diría cero, el borrado
  // seguiría adelante y la cascada se llevaría una dieta ya entregada al
  // paciente. Es improbable, pero irreversible.
  try {
    await prisma.$transaction(async (tx) => {
      const finalizadas = await tx.dietaGenerada.count({
        where: { cuadro_id: id, estado: 'FINALIZADA' },
      })
      if (finalizadas > 0) {
        throw new ErrorTieneFinalizada()
      }
      await tx.cuadroDietosintetico.delete({ where: { id } })
    })
  } catch (e) {
    if (e instanceof ErrorTieneFinalizada) {
      return NextResponse.json(
        { error: 'Este cuadro tiene una dieta finalizada y no se puede eliminar.' },
        { status: 409 }
      )
    }
    throw e
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
