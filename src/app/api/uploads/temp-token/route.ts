import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { setCache } from '@/lib/redis'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filePath = searchParams.get('path')

  if (!filePath) {
    return NextResponse.json({ error: 'Falta el parámetro path' }, { status: 400 })
  }

  // Solo permitir archivos bajo consultas/
  if (!filePath.startsWith('consultas/')) {
    return NextResponse.json({ error: 'Ruta no permitida' }, { status: 403 })
  }

  const token = crypto.randomUUID()
  await setCache(`office-token:${token}`, filePath, 300) // TTL 5 minutos

  return NextResponse.json({ token })
}
