import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { disconnectGoogleCalendar } from '@/lib/services/google-calendar'

/**
 * POST /api/google-calendar/disconnect
 * Desconecta Google Calendar eliminando los tokens
 */
export async function POST() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    await disconnectGoogleCalendar()

    return NextResponse.json(
      { message: 'Google Calendar desconectado exitosamente' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error al desconectar Google Calendar:', error)
    return NextResponse.json({ error: 'Error al desconectar Google Calendar' }, { status: 500 })
  }
}
