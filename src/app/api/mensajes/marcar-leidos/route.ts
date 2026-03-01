import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { deleteCachePattern } from '@/lib/redis'

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  tipo: z.enum(['PACIENTE', 'PROSPECTO']).default('PACIENTE'),
})

// PATCH /api/mensajes/marcar-leidos — Marcar múltiples mensajes como leídos en un solo request
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const { ids, tipo } = result.data

  if (tipo === 'PROSPECTO') {
    await prisma.mensajeProspecto.updateMany({
      where: { id: { in: ids } },
      data: { leido: true },
    })
  } else {
    await prisma.mensajeWhatsApp.updateMany({
      where: { id: { in: ids } },
      data: { leido: true },
    })
  }

  await deleteCachePattern('messages:*')

  return NextResponse.json({ updated: ids.length })
}
