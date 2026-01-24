import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { getAuthUrl } from '@/lib/services/google-calendar'

/**
 * GET /api/google-calendar/auth
 * Genera URL de autenticación de Google Calendar
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const authUrl = getAuthUrl()
    return NextResponse.json({ authUrl }, { status: 200 })
  } catch (error) {
    console.error('Error al generar URL de autenticación:', error)
    return NextResponse.json({ error: 'Error al generar URL de autenticación' }, { status: 500 })
  }
}
