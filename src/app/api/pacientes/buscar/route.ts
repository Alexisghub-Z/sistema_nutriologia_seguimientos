import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

/**
 * GET /api/pacientes/buscar?q=query&limit=10
 * Busca pacientes por nombre o email con autocompletado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : 10

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ pacientes: [] })
    }

    // Buscar pacientes que coincidan con el nombre o email
    const pacientes = await prisma.paciente.findMany({
      where: {
        OR: [
          {
            nombre: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        nombre: true,
        email: true,
      },
      orderBy: {
        nombre: 'asc',
      },
      take: limit,
    })

    return NextResponse.json({ pacientes })
  } catch (error) {
    console.error('Error al buscar pacientes:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al buscar pacientes', details: errorMessage },
      { status: 500 }
    )
  }
}
