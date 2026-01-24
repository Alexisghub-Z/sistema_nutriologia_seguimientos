import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { isGoogleCalendarConfigured, getConnectedAccountInfo } from '@/lib/services/google-calendar'

/**
 * GET /api/google-calendar/status
 * Verifica si Google Calendar está configurado y devuelve información de la cuenta
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const configured = await isGoogleCalendarConfigured()

    let accountInfo = null
    if (configured) {
      accountInfo = await getConnectedAccountInfo()
    }

    return NextResponse.json(
      {
        configured,
        account: accountInfo,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error al verificar estado de Google Calendar:', error)
    return NextResponse.json({ error: 'Error al verificar estado' }, { status: 500 })
  }
}
