import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Schema de validación para verificar email
const verificarEmailSchema = z.object({
  email: z.string().email('Email inválido'),
})

/**
 * POST /api/pacientes/verificar
 * Verificar si un paciente existe por su email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verificarEmailSchema.parse(body)

    // Buscar paciente por email
    const paciente = await prisma.paciente.findUnique({
      where: { email: validatedData.email },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        fecha_nacimiento: true,
        _count: {
          select: {
            citas: true,
          },
        },
      },
    })

    if (!paciente) {
      // Paciente no existe
      return NextResponse.json(
        { existe: false },
        { status: 200 }
      )
    }

    // Paciente existe - retornar sus datos
    console.log(`✅ Paciente encontrado: ${paciente.id} (${paciente.email})`)

    return NextResponse.json(
      {
        existe: true,
        paciente: {
          id: paciente.id,
          nombre: paciente.nombre,
          email: paciente.email,
          telefono: paciente.telefono,
          fecha_nacimiento: paciente.fecha_nacimiento,
          total_citas: paciente._count.citas,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Email inválido', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al verificar paciente:', error)
    return NextResponse.json(
      { error: 'Error al verificar paciente' },
      { status: 500 }
    )
  }
}
