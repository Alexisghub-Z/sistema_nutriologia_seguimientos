import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

/**
 * DELETE /api/dietas/plantillas/[id]
 *
 * Se marca como inactiva en vez de borrarla: una plantilla se usa muchas veces
 * y recuperarla tras un clic accidental no debería costar rehacerla entera.
 */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const plantilla = await prisma.plantillaDieta.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!plantilla) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }

  await prisma.plantillaDieta.update({ where: { id }, data: { activa: false } })
  return NextResponse.json({ ok: true }, { status: 200 })
}
