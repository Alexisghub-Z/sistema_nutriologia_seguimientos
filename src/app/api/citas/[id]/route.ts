import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { deleteCache, CacheKeys } from '@/lib/redis'
import {
  syncCitaWithGoogleCalendar,
  unsyncCitaFromGoogleCalendar,
  isGoogleCalendarConfigured,
  markEventAsCompleted,
} from '@/lib/services/google-calendar'
import { cancelarJobsCita } from '@/lib/queue/messages'

// GET /api/citas/[id] - Obtener una cita específica
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const cita = await prisma.cita.findUnique({
      where: { id },
      include: {
        paciente: true,
        consulta: true,
      },
    })

    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 })
    }

    return NextResponse.json(cita)
  } catch (error) {
    console.error('Error al obtener cita:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener cita', details: errorMessage },
      { status: 500 }
    )
  }
}

// PATCH /api/citas/[id] - Actualizar estado de cita
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    // Leer body con manejo de errores
    let body
    try {
      const text = await request.text()
      body = text ? JSON.parse(text) : {}
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Body JSON inválido o vacío' },
        { status: 400 }
      )
    }

    if (!body.estado) {
      return NextResponse.json(
        { error: 'El campo "estado" es requerido' },
        { status: 400 }
      )
    }

    const cita = await prisma.cita.update({
      where: { id },
      data: {
        estado: body.estado,
      },
      include: {
        paciente: {
          select: {
            id: true,
          },
        },
      },
    })

    // Invalidar caché del paciente
    await deleteCache(CacheKeys.patientDetail(cita.paciente_id))
    console.log('🗑️  Cache invalidated: patient detail after appointment updated', cita.paciente_id)

    // Sincronizar con Google Calendar si está configurado
    try {
      const isConfigured = await isGoogleCalendarConfigured()
      if (isConfigured) {
        if (body.estado === 'CANCELADA') {
          // Si la cita se canceló, eliminar del calendario
          await unsyncCitaFromGoogleCalendar(id)
          console.log('📅 Cita eliminada de Google Calendar:', id)
        } else if (body.estado === 'COMPLETADA' && cita.google_event_id) {
          // Si la cita se completó, cambiar color a verde en Google Calendar
          await markEventAsCompleted(cita.google_event_id)
          console.log('✅ Cita marcada como completada en Google Calendar (color verde):', id)
        } else {
          // De lo contrario, sincronizar normalmente
          await syncCitaWithGoogleCalendar(id)
          console.log('📅 Cita sincronizada con Google Calendar:', id)
        }
      }
    } catch (calendarError) {
      console.error('Error al sincronizar con Google Calendar:', calendarError)
      // No fallar la actualización de la cita si hay error en la sincronización
    }

    // Cancelar jobs de mensajes programados si la cita ya no está PENDIENTE
    // Esto incluye: CANCELADA, COMPLETADA, NO_ASISTIO
    if (body.estado !== 'PENDIENTE') {
      try {
        await cancelarJobsCita(id)
        console.log('🚫 Jobs de mensajería cancelados para cita:', id, `(Estado: ${body.estado})`)
      } catch (queueError) {
        console.error('Error al cancelar jobs de mensajería:', queueError)
        // No fallar la actualización de la cita si hay error en la cola
      }
    }

    return NextResponse.json(cita)
  } catch (error) {
    console.error('Error al actualizar cita:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al actualizar cita', details: errorMessage },
      { status: 500 }
    )
  }
}
