import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { deleteCache, deleteCachePattern, CacheKeys } from '@/lib/redis'
import { borrarArchivo, rutaArchivoAKey } from '@/lib/storage'

/**
 * DELETE /api/consultas/[id]/archivos/[archivoId]
 * Elimina un archivo adjunto de una consulta
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; archivoId: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: consultaId, archivoId } = await context.params

    // Buscar el archivo
    const archivo = await prisma.archivoAdjunto.findUnique({
      where: { id: archivoId },
      include: {
        consulta: {
          select: {
            id: true,
            paciente_id: true,
          },
        },
      },
    })

    if (!archivo) {
      return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
    }

    // Verificar que el archivo pertenece a la consulta especificada
    if (archivo.consulta_id !== consultaId) {
      return NextResponse.json(
        { error: 'El archivo no pertenece a esta consulta' },
        { status: 400 }
      )
    }

    // Eliminar el archivo del storage (S3 o disco local). No bloquea si falla.
    try {
      await borrarArchivo(rutaArchivoAKey(archivo.ruta_archivo))
    } catch (fileError) {
      console.error('Error al eliminar archivo del storage:', fileError)
      // Continuar con la eliminación del registro aunque falle el archivo físico
    }

    // Eliminar registro de la base de datos
    await prisma.archivoAdjunto.delete({
      where: { id: archivoId },
    })

    // Invalidar caché de consultas del paciente
    await deleteCachePattern(`consultations:${archivo.consulta.paciente_id}:*`)
    await deleteCache(CacheKeys.patientDetail(archivo.consulta.paciente_id))
    console.log(
      '🗑️  Cache invalidated: consultations and patient detail',
      archivo.consulta.paciente_id
    )

    return NextResponse.json({ message: 'Archivo eliminado exitosamente' }, { status: 200 })
  } catch (error) {
    console.error('Error al eliminar archivo:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al eliminar archivo', details: errorMessage },
      { status: 500 }
    )
  }
}
