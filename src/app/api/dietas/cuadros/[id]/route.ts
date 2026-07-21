import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

/**
 * Un cuadro dietosintético completo (para recuperarlo y repoblar la pantalla).
 * GET    /api/dietas/cuadros/[id]
 * DELETE /api/dietas/cuadros/[id]
 */

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const cuadro = await prisma.cuadroDietosintetico.findUnique({
    where: { id },
    include: { paciente: { select: { id: true, nombre: true, email: true } } },
  })

  if (!cuadro) {
    return NextResponse.json({ error: 'Cuadro no encontrado' }, { status: 404 })
  }

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

  await prisma.cuadroDietosintetico.delete({ where: { id } })
  return NextResponse.json({ ok: true }, { status: 200 })
}
