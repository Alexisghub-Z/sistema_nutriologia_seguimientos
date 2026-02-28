import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { checkRateLimit, citasPublicasLimiter, getClientIp } from '@/lib/rate-limit'

const progresoSchema = z.object({
  email: z.string().email('Email inválido'),
})

/**
 * POST /api/pacientes/progreso
 * Endpoint público para obtener el progreso de un paciente por email.
 * Solo retorna campos necesarios para gráficas, sin datos clínicos sensibles.
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request)
  const rateLimitResult = await checkRateLimit(citasPublicasLimiter, `progreso:${ip}`)
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const result = progresoSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    }

    const { email } = result.data

    // Buscar paciente por email
    const paciente = await prisma.paciente.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
      },
    })

    if (!paciente) {
      return NextResponse.json({ existe: false }, { status: 200 })
    }

    // Obtener consultas del paciente, solo campos públicos
    const consultas = await prisma.consulta.findMany({
      where: { paciente_id: paciente.id },
      orderBy: { fecha: 'asc' },
      select: {
        fecha: true,
        peso: true,
        talla: true,
        imc: true,
        grasa_corporal: true,
        porcentaje_agua: true,
        masa_muscular_kg: true,
        cintura: true,
        cadera_maximo: true,
      },
    })

    return NextResponse.json({
      existe: true,
      paciente: {
        nombre: paciente.nombre,
        email: paciente.email,
      },
      consultas,
    })
  } catch (error) {
    console.error('Error en /api/pacientes/progreso:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
