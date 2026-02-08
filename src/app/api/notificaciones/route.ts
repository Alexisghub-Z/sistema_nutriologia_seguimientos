import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notificaciones
 *
 * Retorna:
 * - Citas próximas (en las próximas 2 horas)
 * - Nuevos prospectos (últimos 24 horas)
 */
export async function GET() {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ahora = new Date()
    const enDosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000)

    // 1. Obtener citas próximas (pendientes en las próximas 2 horas)
    const citasProximas = await prisma.cita.findMany({
      where: {
        fecha_hora: {
          gte: ahora,
          lte: enDosHoras,
        },
        estado: 'PENDIENTE',
      },
      include: {
        paciente: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: {
        fecha_hora: 'asc',
      },
      take: 5, // Máximo 5 citas
    })

    // 2. Obtener nuevos prospectos (últimas 24 horas que no han sido atendidos)
    const hace24Horas = new Date(ahora.getTime() - 24 * 60 * 60 * 1000)

    const nuevosProspectos = await prisma.prospecto.findMany({
      where: {
        createdAt: {
          gte: hace24Horas,
        },
        // Solo prospectos que aún no tienen muchos mensajes (nuevos)
        total_mensajes: {
          lte: 3,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Máximo 10 prospectos
    })

    // Formatear notificaciones
    const notificaciones = {
      citasProximas: citasProximas.map((cita) => ({
        id: cita.id,
        tipo: 'cita',
        pacienteId: cita.paciente.id,
        pacienteNombre: cita.paciente.nombre,
        fechaHora: cita.fecha_hora,
        tipoCita: cita.tipo_cita,
        minutosRestantes: Math.round(
          (new Date(cita.fecha_hora).getTime() - ahora.getTime()) / (1000 * 60)
        ),
      })),
      nuevosProspectos: nuevosProspectos.map((prospecto) => ({
        id: prospecto.id,
        tipo: 'prospecto',
        telefono: prospecto.telefono,
        nombre: prospecto.nombre || 'Prospecto sin nombre',
        createdAt: prospecto.createdAt,
        totalMensajes: prospecto.total_mensajes,
      })),
      total:
        citasProximas.length + nuevosProspectos.length,
    }

    return NextResponse.json(notificaciones)
  } catch (error) {
    console.error('Error al obtener notificaciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    )
  }
}
