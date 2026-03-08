import { NextRequest, NextResponse } from 'next/server'
import { getCache, deleteCache } from '@/lib/redis'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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

  const absolutePath = path.join(process.cwd(), 'uploads', filePath)

  if (!existsSync(absolutePath)) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }

  const fileBuffer = await readFile(absolutePath)

  const ext = path.extname(absolutePath).toLowerCase()
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

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${path.basename(absolutePath)}"`,
    },
  })
}
