import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import {
  syncCitaWithGoogleCalendar,
  unsyncCitaFromGoogleCalendar,
} from '@/lib/services/google-calendar'
import { z } from 'zod'

const syncSchema = z.object({
  citaId: z.string(),
  action: z.enum(['sync', 'unsync']),
})

/**
 * POST /api/google-calendar/sync
 * Sincroniza o desincroniza una cita con Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = syncSchema.parse(body)

    if (validatedData.action === 'sync') {
      const event = await syncCitaWithGoogleCalendar(validatedData.citaId)
      return NextResponse.json(
        { message: 'Cita sincronizada exitosamente', event },
        { status: 200 }
      )
    } else {
      await unsyncCitaFromGoogleCalendar(validatedData.citaId)
      return NextResponse.json({ message: 'Cita desincronizada exitosamente' }, { status: 200 })
    }
  } catch (error) {
    console.error('Error al sincronizar cita:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al sincronizar cita' }, { status: 500 })
  }
}
