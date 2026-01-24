import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

/**
 * GET /api/citas/rango?inicio=ISO_DATE&fin=ISO_DATE
 * Obtiene todas las citas en un rango de fechas
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const inicioParam = searchParams.get('inicio')
    const finParam = searchParams.get('fin')
    const pacienteParam = searchParams.get('paciente')

    if (!inicioParam || !finParam) {
      return NextResponse.json({ error: 'Parámetros inicio y fin son requeridos' }, { status: 400 })
    }

    const inicio = new Date(inicioParam)
    const fin = new Date(finParam)

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return NextResponse.json({ error: 'Fechas inválidas' }, { status: 400 })
    }

    // Construir condiciones de filtro
    const whereConditions: any = {
      fecha_hora: {
        gte: inicio,
        lte: fin,
      },
    }

    // Agregar filtro de paciente si existe
    if (pacienteParam) {
      whereConditions.paciente_id = pacienteParam
    }

    const citas = await prisma.cita.findMany({
      where: whereConditions,
      include: {
        paciente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
        consulta: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        fecha_hora: 'asc',
      },
    })

    return NextResponse.json({ citas })
  } catch (error) {
    console.error('Error al obtener citas por rango:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener citas', details: errorMessage },
      { status: 500 }
    )
  }
}
