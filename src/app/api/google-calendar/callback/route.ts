import { NextRequest, NextResponse } from 'next/server'
import { getTokensFromCode, saveGoogleTokens } from '@/lib/services/google-calendar'

/**
 * GET /api/google-calendar/callback
 * Callback de OAuth de Google Calendar
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('Error de OAuth:', error)
      return NextResponse.redirect(
        new URL('/configuracion/google-calendar?error=oauth_error', request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/configuracion/google-calendar?error=no_code', request.url)
      )
    }

    // Intercambiar código por tokens
    const tokens = await getTokensFromCode(code)

    // Guardar tokens en la base de datos
    await saveGoogleTokens(tokens)

    // Redirigir a configuración con mensaje de éxito
    return NextResponse.redirect(
      new URL('/configuracion/google-calendar?success=google_calendar_connected', request.url)
    )
  } catch (error) {
    console.error('Error en callback de Google Calendar:', error)
    return NextResponse.redirect(
      new URL('/configuracion?error=token_exchange_failed', request.url)
    )
  }
}
