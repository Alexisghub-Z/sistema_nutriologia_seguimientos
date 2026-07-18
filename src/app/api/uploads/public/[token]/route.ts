import { NextRequest, NextResponse } from 'next/server'
import { getCache, deleteCache } from '@/lib/redis'
import path from 'path'
import { leerArchivo } from '@/lib/storage'

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params

  const filePath = await getCache<string>(`office-token:${token}`)

  if (!filePath) {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 404 })
  }

  // Invalidar inmediatamente (un solo uso)
  await deleteCache(`office-token:${token}`)

  // Validar que la ruta solo contenga consultas/ (evitar path traversal)
  if (!filePath.startsWith('consultas/') || filePath.includes('..')) {
    return NextResponse.json({ error: 'Ruta no permitida' }, { status: 403 })
  }

  // Leer del object storage (S3) o disco local. filePath ya es la key (consultas/...)
  const fileBuffer = await leerArchivo(filePath)
  if (!fileBuffer) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }

  const mimeType = mimeTypes[ext] || 'application/octet-stream'

  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
    },
  })
}
