import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Contar total de mensajes entrantes no leídos
    const total = await prisma.mensajeWhatsApp.count({
      where: {
        direccion: 'ENTRANTE',
        leido: false,
      },
    })

    return NextResponse.json({ total })
  } catch (error) {
    console.error('Error al obtener mensajes no leídos:', error)
    return NextResponse.json({ error: 'Error al obtener mensajes no leídos' }, { status: 500 })
  }
}
