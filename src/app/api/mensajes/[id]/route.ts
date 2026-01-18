import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { deleteCachePattern } from '@/lib/redis'

// PATCH /api/mensajes/[id] - Marcar mensaje como leído
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    // Verificar que el mensaje existe
    const mensaje = await prisma.mensajeWhatsApp.findUnique({
      where: { id },
    })

    if (!mensaje) {
      return NextResponse.json(
        { error: 'Mensaje no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar mensaje
    const mensajeActualizado = await prisma.mensajeWhatsApp.update({
      where: { id },
      data: {
        leido: body.leido ?? true,
      },
      include: {
        paciente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
    })

    // Invalidar caché de mensajes
    await deleteCachePattern(`messages:*`)
    console.log('🗑️  Cache invalidated: messages after mark as read', mensaje.paciente_id)

    return NextResponse.json(mensajeActualizado)
  } catch (error) {
    console.error('Error al actualizar mensaje:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al actualizar mensaje', details: errorMessage },
      { status: 500 }
    )
  }
}
