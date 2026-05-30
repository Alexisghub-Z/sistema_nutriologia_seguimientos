import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { crearCitaParaPaciente } from '@/lib/services/citas'

// Schema de validación para crear cita
const citaSchema = z.object({
  paciente_id: z.string().min(1, 'ID de paciente requerido'),
  fecha_hora: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime())
  }, 'Fecha y hora inválidas'),
  duracion_minutos: z.number().positive().default(60),
  motivo_consulta: z.string().min(3, 'El motivo debe tener al menos 3 caracteres'),
  tipo_cita: z.enum(['PRESENCIAL', 'EN_LINEA']).optional().default('PRESENCIAL'),
  confirmada_por_admin: z.boolean().optional().default(false),
})

// GET /api/citas?paciente_id=xxx - Obtener citas de un paciente
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paciente_id = searchParams.get('paciente_id')

    if (!paciente_id) {
      return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 })
    }

    const citas = await prisma.cita.findMany({
      where: { paciente_id },
      orderBy: { fecha_hora: 'desc' },
      include: {
        consulta: {
          select: {
            id: true,
            peso: true,
            imc: true,
          },
        },
      },
    })

    return NextResponse.json({ citas })
  } catch (error) {
    console.error('Error al obtener citas:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener citas', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/citas - Crear nueva cita
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = citaSchema.parse(body)

    const resultado = await crearCitaParaPaciente({
      pacienteId: validatedData.paciente_id,
      fechaHora: new Date(validatedData.fecha_hora),
      duracionMinutos: validatedData.duracion_minutos,
      motivoConsulta: validatedData.motivo_consulta,
      tipoCita: validatedData.tipo_cita,
      confirmadaPorAdmin: validatedData.confirmada_por_admin,
    })

    if (!resultado.ok) {
      if (resultado.motivo === 'ya_tiene_cita') {
        return NextResponse.json(
          {
            error: 'El paciente ya tiene una cita pendiente',
            mensaje:
              'Solo se permite una cita activa por paciente. Cancela o completa la cita actual antes de crear una nueva.',
            cita_existente: resultado.citaExistente,
          },
          { status: 409 }
        )
      }
      if (resultado.motivo === 'ocupado') {
        return NextResponse.json({ error: resultado.mensaje }, { status: 409 })
      }
      if (resultado.motivo === 'pasada') {
        return NextResponse.json({ error: resultado.mensaje }, { status: 400 })
      }
      return NextResponse.json({ error: 'Error al crear cita', details: resultado.mensaje }, { status: 500 })
    }

    return NextResponse.json(resultado.cita, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error al crear cita:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al crear cita', details: errorMessage },
      { status: 500 }
    )
  }
}
