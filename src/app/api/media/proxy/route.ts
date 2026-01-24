import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy para servir archivos multimedia de Twilio
 * Las URLs de Twilio requieren autenticación, este endpoint las sirve al navegador
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mediaUrl = searchParams.get('url')

    if (!mediaUrl) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 })
    }

    // Verificar que sea una URL de Twilio
    if (!mediaUrl.startsWith('https://api.twilio.com/')) {
      return NextResponse.json({ error: 'URL no válida' }, { status: 400 })
    }

    // Obtener credenciales de Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!accountSid || !authToken) {
      return NextResponse.json({ error: 'Credenciales de Twilio no configuradas' }, { status: 500 })
    }

    // Hacer la petición a Twilio con autenticación básica
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    if (!response.ok) {
      console.error('Error fetching media from Twilio:', response.statusText)
      return NextResponse.json({ error: 'Error al obtener archivo' }, { status: response.status })
    }

    // Obtener el contenido y tipo de archivo
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await response.arrayBuffer()

    // Retornar el archivo con el tipo correcto
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache por 24 horas
      },
    })
  } catch (error) {
    console.error('Error in media proxy:', error)
    return NextResponse.json({ error: 'Error al procesar archivo' }, { status: 500 })
  }
}
