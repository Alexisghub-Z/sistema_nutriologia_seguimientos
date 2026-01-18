import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación
const configuracionSchema = z.object({
  recordatorio_24h_activo: z.boolean().optional(),
  recordatorio_1h_activo: z.boolean().optional(),
  seguimiento_activo: z.boolean().optional(),
  seguimiento_dias_despues: z.number().int().min(1).max(30).optional(),
  confirmacion_automatica_activa: z.boolean().optional(),
  url_portal: z.string().url().optional().nullable(),
  nombre_consultorio: z.string().min(1).optional(),
})

// GET /api/configuracion - Obtener configuración general
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar la primera (y única) configuración
    let config = await prisma.configuracionGeneral.findFirst()

    // Si no existe, crearla con defaults
    if (!config) {
      config = await prisma.configuracionGeneral.create({
        data: {
          recordatorio_24h_activo: true,
          recordatorio_1h_activo: true,
          seguimiento_activo: true,
          seguimiento_dias_despues: 2,
          confirmacion_automatica_activa: true,
          url_portal: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          nombre_consultorio: 'Consultorio',
        },
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error al obtener configuración:', error)
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

// PUT /api/configuracion - Actualizar configuración general
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = configuracionSchema.parse(body)

    // Buscar configuración existente
    let config = await prisma.configuracionGeneral.findFirst()

    if (!config) {
      // Si no existe, crear con los datos proporcionados
      config = await prisma.configuracionGeneral.create({
        data: {
          ...validatedData,
          url_portal: validatedData.url_portal || process.env.NEXT_PUBLIC_APP_URL,
          nombre_consultorio: validatedData.nombre_consultorio || 'Consultorio',
        },
      })
    } else {
      // Actualizar configuración existente
      config = await prisma.configuracionGeneral.update({
        where: { id: config.id },
        data: validatedData,
      })
    }

    console.log('✅ Configuración actualizada:', config.id)

    return NextResponse.json(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al actualizar configuración:', error)
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    )
  }
}
