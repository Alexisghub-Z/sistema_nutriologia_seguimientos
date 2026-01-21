import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { programarSeguimiento, cancelarJobsCita } from '@/lib/queue/messages'
import { z } from 'zod'
import { deleteCache, deleteCachePattern, CacheKeys } from '@/lib/redis'

// Schema de validación
const programarSeguimientoSchema = z.object({
  consultaId: z.string().min(1, 'ID de consulta requerido'),
  tipoSeguimiento: z.enum(['SOLO_RECORDATORIO', 'SOLO_SEGUIMIENTO', 'RECORDATORIO_Y_SEGUIMIENTO'])
    .default('SOLO_RECORDATORIO'),
})

// POST /api/seguimiento - Programar seguimiento para una consulta
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { consultaId, tipoSeguimiento } = programarSeguimientoSchema.parse(body)

    // Buscar la consulta
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
      include: {
        paciente: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    })

    if (!consulta) {
      return NextResponse.json(
        { error: 'Consulta no encontrada' },
        { status: 404 }
      )
    }

    if (!consulta.proxima_cita) {
      return NextResponse.json(
        { error: 'La consulta no tiene próxima cita sugerida' },
        { status: 400 }
      )
    }

    // Verificar que la fecha no haya pasado
    const fechaSugerida = new Date(consulta.proxima_cita)
    if (fechaSugerida < new Date()) {
      return NextResponse.json(
        { error: 'La fecha sugerida ya ha pasado' },
        { status: 400 }
      )
    }

    // Verificar si ya tiene un seguimiento programado
    if (consulta.seguimiento_programado) {
      return NextResponse.json(
        { error: 'Ya existe un seguimiento programado para esta consulta' },
        { status: 400 }
      )
    }

    // Cancelar cualquier seguimiento antiguo del paciente antes de programar uno nuevo
    const consultasAntiguasConSeguimiento = await prisma.consulta.findMany({
      where: {
        paciente_id: consulta.paciente_id,
        seguimiento_programado: true,
        id: { not: consultaId }, // Excluir la consulta actual
      },
    })

    if (consultasAntiguasConSeguimiento.length > 0) {
      console.log(`🧹 Cancelando ${consultasAntiguasConSeguimiento.length} seguimiento(s) antiguo(s) antes de programar nuevo`)

      const { mensajesQueue } = await import('@/lib/queue/messages')
      const jobs = await mensajesQueue.getJobs(['waiting', 'delayed'])

      for (const consultaAntigua of consultasAntiguasConSeguimiento) {
        for (const job of jobs) {
          if (job.data.consultaId === consultaAntigua.id) {
            await job.remove()
            console.log(`🗑️  Job cancelado: ${consultaAntigua.id}`)
          }
        }

        await prisma.consulta.update({
          where: { id: consultaAntigua.id },
          data: {
            seguimiento_programado: false,
            tipo_seguimiento: null,
          },
        })
      }
    }

    // Verificar si el paciente ya tiene una cita agendada para esa fecha (±3 días)
    const inicioPeriodo = new Date(fechaSugerida)
    inicioPeriodo.setDate(inicioPeriodo.getDate() - 3)

    const finPeriodo = new Date(fechaSugerida)
    finPeriodo.setDate(finPeriodo.getDate() + 3)

    const citaExistente = await prisma.cita.findFirst({
      where: {
        paciente_id: consulta.paciente_id,
        fecha_hora: {
          gte: inicioPeriodo,
          lte: finPeriodo,
        },
        estado: {
          in: ['PENDIENTE', 'COMPLETADA'],
        },
      },
    })

    if (citaExistente) {
      return NextResponse.json(
        {
          error: 'El paciente ya tiene una cita agendada cercana a la fecha sugerida',
          citaId: citaExistente.id,
          fechaCita: citaExistente.fecha_hora,
        },
        { status: 400 }
      )
    }

    // Programar el seguimiento
    await programarSeguimiento(consultaId, fechaSugerida, tipoSeguimiento)

    // Actualizar el flag en la base de datos
    await prisma.consulta.update({
      where: { id: consultaId },
      data: {
        seguimiento_programado: true,
        tipo_seguimiento: tipoSeguimiento,
      },
    })

    // Invalidar caché del paciente y sus consultas
    await deleteCache(CacheKeys.patientDetail(consulta.paciente_id))
    await deleteCachePattern(`consultations:${consulta.paciente_id}:*`)
    console.log('🗑️  Cache invalidated: patient detail and consultations after programming follow-up', consulta.paciente_id)

    const fechaEnvio = new Date(fechaSugerida.getTime() - 24 * 60 * 60 * 1000)

    return NextResponse.json({
      success: true,
      message: 'Seguimiento programado exitosamente',
      fechaEnvio: fechaEnvio.toISOString(),
      fechaSugerida: fechaSugerida.toISOString(),
      paciente: consulta.paciente.nombre,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al programar seguimiento:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al programar seguimiento', details: errorMessage },
      { status: 500 }
    )
  }
}

// DELETE /api/seguimiento - Cancelar seguimiento programado
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const consultaId = searchParams.get('consultaId')

    if (!consultaId) {
      return NextResponse.json(
        { error: 'ID de consulta requerido' },
        { status: 400 }
      )
    }

    // Buscar la consulta
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
    })

    if (!consulta) {
      return NextResponse.json(
        { error: 'Consulta no encontrada' },
        { status: 404 }
      )
    }

    if (!consulta.seguimiento_programado) {
      return NextResponse.json(
        { error: 'No hay seguimiento programado para esta consulta' },
        { status: 400 }
      )
    }

    // Cancelar jobs pendientes
    // Nota: cancelarJobsCita busca por citaId, pero seguimiento usa consultaId
    // Necesitamos una función que busque por consultaId
    const { mensajesQueue } = await import('@/lib/queue/messages')
    const jobs = await mensajesQueue.getJobs(['waiting', 'delayed'])

    for (const job of jobs) {
      if (job.data.consultaId === consultaId) {
        await job.remove()
        console.log(`[API] Job de seguimiento cancelado para consulta: ${consultaId}`)
      }
    }

    // Actualizar el flag en la base de datos
    await prisma.consulta.update({
      where: { id: consultaId },
      data: {
        seguimiento_programado: false,
        tipo_seguimiento: null,
      },
    })

    // Invalidar caché del paciente y sus consultas
    await deleteCache(CacheKeys.patientDetail(consulta.paciente_id))
    await deleteCachePattern(`consultations:${consulta.paciente_id}:*`)
    console.log('🗑️  Cache invalidated: patient detail and consultations after canceling follow-up', consulta.paciente_id)

    return NextResponse.json({
      success: true,
      message: 'Seguimiento cancelado exitosamente',
    })
  } catch (error) {
    console.error('Error al cancelar seguimiento:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al cancelar seguimiento', details: errorMessage },
      { status: 500 }
    )
  }
}
