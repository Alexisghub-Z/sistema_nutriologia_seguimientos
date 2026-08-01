import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { alFinalizarDieta } from '@/lib/dietas/finalizacion'

/**
 * Una dieta generada.
 * ------------------------------------------------------------
 * PATCH  /api/dietas/dietas/[id]   Finaliza la dieta o actualiza su contenido.
 * DELETE /api/dietas/dietas/[id]   Borra una dieta en borrador.
 */

const patchSchema = z.union([
  // 'reabrir' desbloquea la dieta para editarla sobre sí misma, sin duplicar.
  z.object({ accion: z.enum(['finalizar', 'reabrir']) }),
  z.object({
    contenido: z.object({ tiempos: z.array(z.any()).min(1) }),
    indicaciones_inicio: z.string().max(4000).optional(),
  }),
])

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

  const dieta = await prisma.dietaGenerada.findUnique({
    where: { id },
    select: { id: true, estado: true, finalizada_at: true },
  })
  if (!dieta) {
    return NextResponse.json({ error: 'Dieta no encontrada' }, { status: 404 })
  }

  const data = parsed.data

  if ('accion' in data) {
    // Reabrir: desbloquea la dieta para seguir editándola sobre sí misma. Se
    // actualiza el mismo registro en vez de duplicarlo, que es lo que espera
    // quien pulsa "Editar" en la interfaz.
    if (data.accion === 'reabrir') {
      if (dieta.estado === 'BORRADOR') {
        // Ya estaba editable: idempotente.
        const actual = await prisma.dietaGenerada.findUnique({ where: { id } })
        return NextResponse.json({ dieta: actual, yaEstaba: true }, { status: 200 })
      }
      const reabierta = await prisma.dietaGenerada.update({
        where: { id },
        data: { estado: 'BORRADOR', finalizada_at: null },
      })
      return NextResponse.json({ dieta: reabierta, yaEstaba: false }, { status: 200 })
    }

    // Finalizar es idempotente: si ya estaba cerrada devolvemos lo mismo, sin
    // tocar la fecha ni volver a disparar los efectos posteriores.
    if (dieta.estado === 'FINALIZADA') {
      const actual = await prisma.dietaGenerada.findUnique({ where: { id } })
      return NextResponse.json({ dieta: actual, yaEstaba: true }, { status: 200 })
    }

    const finalizada = await prisma.dietaGenerada.update({
      where: { id },
      data: { estado: 'FINALIZADA', finalizada_at: new Date() },
    })
    await alFinalizarDieta(finalizada.id)
    return NextResponse.json({ dieta: finalizada, yaEstaba: false }, { status: 200 })
  }

  // Edición de contenido: una dieta guardada hay que reabrirla primero.
  if (dieta.estado === 'FINALIZADA') {
    return NextResponse.json(
      { error: 'Esta dieta está guardada. Pulsa Editar para poder modificarla.' },
      { status: 409 }
    )
  }

  const actualizada = await prisma.dietaGenerada.update({
    where: { id },
    data: {
      contenido: data.contenido,
      indicaciones_inicio: data.indicaciones_inicio ?? null,
    },
  })
  return NextResponse.json({ dieta: actualizada }, { status: 200 })
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const dieta = await prisma.dietaGenerada.findUnique({
    where: { id },
    select: { id: true, estado: true },
  })
  if (!dieta) {
    return NextResponse.json({ error: 'Dieta no encontrada' }, { status: 404 })
  }
  if (dieta.estado === 'FINALIZADA') {
    return NextResponse.json(
      { error: 'No se puede eliminar una dieta finalizada.' },
      { status: 409 }
    )
  }

  await prisma.dietaGenerada.delete({ where: { id } })
  return NextResponse.json({ ok: true }, { status: 200 })
}
