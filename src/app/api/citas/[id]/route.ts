import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { deleteCache, CacheKeys } from '@/lib/redis'

// GET /api/citas/[id] - Obtener una cita específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = params instanceof Promise ? await params : params

    const cita = await prisma.cita.findUnique({
      where: { id },
      include: {
        paciente: true,
        consulta: true,
      },
    })

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    return NextResponse.json(cita)
  } catch (error) {
    console.error('Error al obtener cita:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener cita', details: errorMessage },
      { status: 500 }
    )
  }
}

// PATCH /api/citas/[id] - Actualizar estado de cita
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = params instanceof Promise ? await params : params
    const body = await request.json()

    const cita = await prisma.cita.update({
      where: { id },
      data: {
        estado: body.estado,
      },
      include: {
        paciente: {
          select: {
            id: true,
          },
        },
      },
    })

    // Invalidar caché del paciente
    await deleteCache(CacheKeys.patientDetail(cita.paciente_id))
    console.log('🗑️  Cache invalidated: patient detail after appointment updated', cita.paciente_id)

    return NextResponse.json(cita)
  } catch (error) {
    console.error('Error al actualizar cita:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al actualizar cita', details: errorMessage },
      { status: 500 }
    )
  }
}
