import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { deleteCache, deleteCachePattern, CacheKeys } from '@/lib/redis'
import { cancelarJobsCita } from '@/lib/queue/messages'

// GET /api/citas/codigo/[codigo] - Buscar cita por código
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ codigo: string }> }
) {
  try {
    // Await params (Next.js 15)
    const { codigo } = await context.params

    const cita = await prisma.cita.findUnique({
      where: { codigo_cita: codigo },
      include: {
        paciente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
    })

    if (!cita) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(cita)
  } catch (error) {
    console.error('Error al buscar cita:', error)
    return NextResponse.json(
      { error: 'Error al buscar cita' },
      { status: 500 }
    )
  }
}

// PUT /api/citas/codigo/[codigo] - Confirmar o cancelar cita
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ codigo: string }> }
) {
  try {
    // Await params (Next.js 15)
    const { codigo } = await context.params

    const body = await request.json()
    const { accion } = body

    if (!['cancelar', 'confirmar'].includes(accion)) {
      return NextResponse.json(
        { error: 'Acción no válida. Use "cancelar" o "confirmar"' },
        { status: 400 }
      )
    }

    // Obtener la cita primero para verificar que existe
    const citaExistente = await prisma.cita.findUnique({
      where: { codigo_cita: codigo },
      include: {
        paciente: {
          select: { id: true }
        }
      }
    })

    if (!citaExistente) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que no esté ya cancelada
    if (citaExistente.estado === 'CANCELADA') {
      return NextResponse.json(
        { error: 'Esta cita ya fue cancelada' },
        { status: 400 }
      )
    }

    // Verificar que no sea una cita pasada para cancelación
    if (accion === 'cancelar' && new Date(citaExistente.fecha_hora) < new Date()) {
      return NextResponse.json(
        { error: 'No se puede cancelar una cita pasada' },
        { status: 400 }
      )
    }

    // Procesar según la acción
    let cita

    if (accion === 'confirmar') {
      // Verificar que esté pendiente
      if (citaExistente.estado !== 'PENDIENTE') {
        return NextResponse.json(
          { error: 'Solo se pueden confirmar citas pendientes' },
          { status: 400 }
        )
      }

      // Verificar que no esté ya confirmada
      if (citaExistente.confirmada_por_paciente) {
        return NextResponse.json(
          { error: 'Esta cita ya fue confirmada' },
          { status: 400 }
        )
      }

      // Confirmar la cita
      cita = await prisma.cita.update({
        where: { codigo_cita: codigo },
        data: {
          confirmada_por_paciente: true,
          estado_confirmacion: 'CONFIRMADA',
          fecha_confirmacion: new Date(),
        },
        include: {
          paciente: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
            },
          },
        },
      })

      console.log(`✅ Cita confirmada por paciente: ${cita.id}`)
    } else {
      // Cancelar la cita
      cita = await prisma.cita.update({
        where: { codigo_cita: codigo },
        data: {
          estado: 'CANCELADA',
          estado_confirmacion: 'CANCELADA_PACIENTE',
        },
        include: {
          paciente: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
            },
          },
        },
      })

      // Cancelar todos los jobs pendientes de mensajes automáticos
      try {
        await cancelarJobsCita(cita.id)
        console.log(`✅ Jobs cancelados para cita: ${cita.id}`)
      } catch (jobError) {
        console.error('Error al cancelar jobs:', jobError)
        // No fallar la operación si no se pueden cancelar los jobs
      }
    }

    // Invalidar caché del paciente
    await deleteCache(CacheKeys.patientDetail(citaExistente.paciente.id))
    await deleteCachePattern('patients:list:*')
    console.log(`🗑️  Cache invalidado para paciente: ${citaExistente.paciente.id}`)

    return NextResponse.json(cita)
  } catch (error) {
    console.error('Error al actualizar cita:', error)
    return NextResponse.json(
      { error: 'Error al actualizar cita' },
      { status: 500 }
    )
  }
}
