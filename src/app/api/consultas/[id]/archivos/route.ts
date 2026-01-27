import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { deleteCachePattern, deleteCache, CacheKeys } from '@/lib/redis'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// POST /api/consultas/[id]/archivos - Subir archivo a una consulta
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: consultaId } = await context.params

    // Verificar que la consulta existe
    const consulta = await prisma.consulta.findUnique({
      where: { id: consultaId },
    })

    if (!consulta) {
      return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const categoria = (formData.get('categoria') as string) || 'OTRO'
    const descripcion = (formData.get('descripcion') as string) || null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    // Validaciones
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo de 10MB' },
        { status: 400 }
      )
    }

    // Generar nombre único
    const extension = path.extname(file.name)
    const randomName = randomBytes(16).toString('hex')
    const fileName = `${randomName}${extension}`

    // Crear carpeta
    const uploadDir = path.join(process.cwd(), 'uploads', 'consultas', consultaId)

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Guardar archivo físico
    const filePath = path.join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Guardar registro en base de datos
    const archivo = await prisma.archivoAdjunto.create({
      data: {
        consulta_id: consultaId,
        categoria: categoria as any,
        nombre_original: file.name,
        nombre_archivo: fileName,
        ruta_archivo: `/uploads/consultas/${consultaId}/${fileName}`,
        tipo_mime: file.type,
        tamanio_bytes: file.size,
        descripcion,
      },
    })

    // Invalidar caché de consultas del paciente para que se muestren los archivos adjuntos
    await deleteCachePattern(`consultations:${consulta.paciente_id}:*`)
    await deleteCache(CacheKeys.patientDetail(consulta.paciente_id))
    console.log(
      '🗑️  Cache invalidated after file upload: consultations and patient detail',
      consulta.paciente_id
    )

    return NextResponse.json(archivo, { status: 201 })
  } catch (error) {
    console.error('Error al subir archivo:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al subir archivo', details: errorMessage },
      { status: 500 }
    )
  }
}

// GET /api/consultas/[id]/archivos - Obtener archivos de una consulta
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: consultaId } = await context.params

    const archivos = await prisma.archivoAdjunto.findMany({
      where: { consulta_id: consultaId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ archivos })
  } catch (error) {
    console.error('Error al obtener archivos:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener archivos', details: errorMessage },
      { status: 500 }
    )
  }
}
