import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación
const plantillaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.enum(['AUTOMATICO_CONFIRMACION', 'AUTOMATICO_RECORDATORIO', 'AUTOMATICO_SEGUIMIENTO', 'MANUAL']),
  contenido: z.string().min(1, 'El contenido es requerido'),
  activa: z.boolean().default(true),
})

// GET /api/plantillas - Listar todas las plantillas
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')
    const activa = searchParams.get('activa')

    const where: any = {}
    if (tipo) where.tipo = tipo
    if (activa !== null) where.activa = activa === 'true'

    const plantillas = await prisma.plantillaMensaje.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ plantillas })
  } catch (error) {
    console.error('Error al obtener plantillas:', error)
    return NextResponse.json(
      { error: 'Error al obtener plantillas' },
      { status: 500 }
    )
  }
}

// POST /api/plantillas - Crear plantilla
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = plantillaSchema.parse(body)

    const plantilla = await prisma.plantillaMensaje.create({
      data: validatedData,
    })

    return NextResponse.json(plantilla, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear plantilla:', error)
    return NextResponse.json(
      { error: 'Error al crear plantilla' },
      { status: 500 }
    )
  }
}
