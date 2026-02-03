import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { deleteCachePattern } from '@/lib/redis'

// PATCH /api/mensajes/[id] - Marcar mensaje como leído
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const nuevoLeido = body.leido ?? true

    // Buscar primero en MensajeWhatsApp (pacientes)
    const mensajePaciente = await prisma.mensajeWhatsApp.findUnique({
      where: { id },
    })

    if (mensajePaciente) {
      const mensajeActualizado = await prisma.mensajeWhatsApp.update({
        where: { id },
        data: { leido: nuevoLeido },
        include: {
          paciente: {
            select: { id: true, nombre: true, email: true, telefono: true },
          },
        },
      })

      await deleteCachePattern(`messages:*`)
      console.log('🗑️  Cache invalidated: messages after mark as read', mensajePaciente.paciente_id)
      return NextResponse.json(mensajeActualizado)
    }

    // Si no se encontró en pacientes, buscar en MensajeProspecto
    const mensajeProspecto = await prisma.mensajeProspecto.findUnique({
      where: { id },
    })

    if (mensajeProspecto) {
      const mensajeActualizado = await prisma.mensajeProspecto.update({
        where: { id },
        data: { leido: nuevoLeido },
        include: {
          prospecto: {
            select: { id: true, nombre: true, telefono: true },
          },
        },
      })

      await deleteCachePattern(`messages:*`)
      console.log('🗑️  Cache invalidated: messages after mark prospecto as read', mensajeProspecto.prospecto_id)
      return NextResponse.json(mensajeActualizado)
    }

    return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 })
  } catch (error) {
    console.error('Error al actualizar mensaje:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al actualizar mensaje', details: errorMessage },
      { status: 500 }
    )
  }
}
