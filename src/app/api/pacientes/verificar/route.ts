import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { normalizarTelefonoMexico } from '@/lib/utils/phone'

// Schema de validación: acepta email O telefono
const verificarSchema = z
  .object({
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().optional(),
  })
  .refine((data) => data.email || data.telefono, {
    message: 'Se requiere email o teléfono',
  })

/**
 * POST /api/pacientes/verificar
 * Verificar si un paciente existe por su email o teléfono
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verificarSchema.parse(body)

    let paciente = null

    if (validatedData.telefono) {
      // Buscar por teléfono (normalizar a E.164)
      const telefonoNormalizado = normalizarTelefonoMexico(validatedData.telefono)
      paciente = await prisma.paciente.findUnique({
        where: { telefono: telefonoNormalizado },
        select: {
          nombre: true,
          email: true,
          telefono: true,
          fecha_nacimiento: true,
        },
      })
    } else if (validatedData.email) {
      // Buscar por email
      paciente = await prisma.paciente.findUnique({
        where: { email: validatedData.email },
        select: {
          nombre: true,
          email: true,
          telefono: true,
          fecha_nacimiento: true,
        },
      })
    }

    if (!paciente) {
      return NextResponse.json({ existe: false }, { status: 200 })
    }

    console.log(`✅ Paciente encontrado: ${paciente.email}`)

    return NextResponse.json(
      {
        existe: true,
        paciente: {
          nombre: paciente.nombre,
          email: paciente.email,
          telefono: paciente.telefono,
          fecha_nacimiento: paciente.fecha_nacimiento,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error al verificar paciente:', error)
    return NextResponse.json({ error: 'Error al verificar paciente' }, { status: 500 })
  }
}
