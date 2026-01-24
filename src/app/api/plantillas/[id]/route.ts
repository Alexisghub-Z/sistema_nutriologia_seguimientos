import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const plantillaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  tipo: z
    .enum([
      'AUTOMATICO_CONFIRMACION',
      'AUTOMATICO_RECORDATORIO',
      'AUTOMATICO_SEGUIMIENTO',
      'MANUAL',
    ])
    .optional(),
  contenido: z.string().min(1, 'El contenido es requerido').optional(),
  activa: z.boolean().optional(),
})

// GET /api/plantillas/[id] - Obtener una plantilla
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const plantilla = await prisma.plantillaMensaje.findUnique({
      where: { id },
    })

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    return NextResponse.json(plantilla)
  } catch (error) {
    console.error('Error al obtener plantilla:', error)
    return NextResponse.json({ error: 'Error al obtener plantilla' }, { status: 500 })
  }
}

// PUT /api/plantillas/[id] - Actualizar plantilla
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const validatedData = plantillaSchema.parse(body)

    const plantilla = await prisma.plantillaMensaje.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(plantilla)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error al actualizar plantilla:', error)
    return NextResponse.json({ error: 'Error al actualizar plantilla' }, { status: 500 })
  }
}

// DELETE /api/plantillas/[id] - Eliminar plantilla
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    await prisma.plantillaMensaje.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Plantilla eliminada' })
  } catch (error) {
    console.error('Error al eliminar plantilla:', error)
    return NextResponse.json({ error: 'Error al eliminar plantilla' }, { status: 500 })
  }
}
