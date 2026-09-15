import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { normalizarTelefonoMexico } from '@/lib/utils/phone'
import { checkRateLimit, consultaPacienteLimiter, getClientIp } from '@/lib/rate-limit'

// Schema de validación: acepta email O telefono
const schema = z
  .object({
    email: z.string().email('Email inválido').optional(),
    telefono: z.string().optional(),
  })
  .refine((data) => data.email || data.telefono, {
    message: 'Se requiere email o teléfono',
  })

/**
 * POST /api/pacientes/cita-activa
 * Buscar cita activa (PENDIENTE y futura) de un paciente por email o teléfono
 */
export async function POST(request: NextRequest) {
  // Esta consulta es pública y acepta teléfono, que a diferencia de un email se
  // puede recorrer a lo bruto: un móvil mexicano son 10 dígitos. Sin freno,
  // cualquiera podría barrer rangos de números para averiguar quién es paciente
  // y, peor, quedarse con su `codigo_cita`, que es la llave de /cita/[codigo].
  const ip = getClientIp(request)
  const limite = await checkRateLimit(consultaPacienteLimiter, `cita-activa:${ip}`)
  if (!limite.success) {
    return NextResponse.json(
      { error: 'Demasiadas consultas. Intenta más tarde.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const validatedData = schema.parse(body)

    // Buscar paciente por email o teléfono
    let paciente = null

    if (validatedData.telefono) {
      const telefonoNormalizado = normalizarTelefonoMexico(validatedData.telefono)
      paciente = await prisma.paciente.findUnique({
        where: { telefono: telefonoNormalizado },
      })
    } else if (validatedData.email) {
      paciente = await prisma.paciente.findUnique({
        where: { email: validatedData.email },
      })
    }

    if (!paciente) {
      return NextResponse.json(
        { existe: false, mensaje: 'No se encontró ningún paciente' },
        { status: 200 }
      )
    }

    // Buscar cita activa del paciente
    const citaActiva = await prisma.cita.findFirst({
      where: {
        paciente_id: paciente.id,
        estado: 'PENDIENTE',
        fecha_hora: {
          gte: new Date(),
        },
      },
      select: {
        codigo_cita: true,
        fecha_hora: true,
      },
      orderBy: {
        fecha_hora: 'asc',
      },
    })

    if (!citaActiva) {
      return NextResponse.json(
        {
          existe: false,
          mensaje: 'No tienes citas pendientes',
        },
        { status: 200 }
      )
    }

    // Sin el email del paciente: este endpoint es público, y dejar correos en
    // los registros del servidor es filtrar datos personales por otra puerta.
    console.log(`✅ Cita activa encontrada: ${citaActiva.codigo_cita}`)

    return NextResponse.json(
      {
        existe: true,
        cita: {
          codigo_cita: citaActiva.codigo_cita,
          fecha_hora: citaActiva.fecha_hora,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error al buscar cita activa:', error)
    return NextResponse.json({ error: 'Error al buscar cita activa' }, { status: 500 })
  }
}
