import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'

// Tamaño máximo: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Tipos de archivo permitidos
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const consultaId = formData.get('consultaId') as string

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    if (!consultaId) {
      return NextResponse.json({ error: 'ID de consulta requerido' }, { status: 400 })
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Tipo de archivo no permitido. Solo: imágenes, PDF y Word`,
        },
        { status: 400 }
      )
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo de 10MB' },
        { status: 400 }
      )
    }

    // Generar nombre único para el archivo
    const extension = path.extname(file.name)
    const randomName = randomBytes(16).toString('hex')
    const fileName = `${randomName}${extension}`

    // Crear carpeta si no existe
    const uploadDir = path.join(process.cwd(), 'uploads', 'consultas', consultaId)

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Guardar archivo
    const filePath = path.join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Retornar información del archivo
    return NextResponse.json({
      success: true,
      archivo: {
        nombre_original: file.name,
        nombre_archivo: fileName,
        ruta_archivo: `/uploads/consultas/${consultaId}/${fileName}`,
        tipo_mime: file.type,
        tamanio_bytes: file.size,
      },
    })
  } catch (error) {
    console.error('Error al subir archivo:', error)
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
  }
}
