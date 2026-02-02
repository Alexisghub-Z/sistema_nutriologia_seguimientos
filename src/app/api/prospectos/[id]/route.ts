import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

// GET /api/prospectos/[id] - Obtener un prospecto específico
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const prospecto = await prisma.prospecto.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            mensajes: true,
          },
        },
      },
    })

    if (!prospecto) {
      return NextResponse.json({ error: 'Prospecto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(prospecto)
  } catch (error) {
    console.error('Error al obtener prospecto:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener prospecto', details: errorMessage },
      { status: 500 }
    )
  }
}
