import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import path from 'path'
import { leerArchivo } from '@/lib/storage'

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    // Verificar autenticación
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const params = await context.params

    // Rechazar cualquier intento de path traversal
    if (params.path.some((seg) => seg.includes('..'))) {
      return NextResponse.json({ error: 'Ruta no permitida' }, { status: 403 })
    }

    // Key lógica (ej: consultas/<id>/<archivo>)
    const key = params.path.join('/')

    // Leer del object storage (S3) o disco local
    const fileBuffer = await leerArchivo(key)
    if (!fileBuffer) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    // Detectar tipo MIME basado en extensión
    const ext = path.extname(key).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }

    const mimeType = mimeTypes[ext] || 'application/octet-stream'

    // Retornar el archivo
    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${path.basename(key)}"`,
      },
    })
  } catch (error) {
    console.error('Error al descargar archivo:', error)
    return NextResponse.json({ error: 'Error al descargar archivo' }, { status: 500 })
  }
}
