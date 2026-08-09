import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { validarContenido } from '@/lib/dietas/contenido-schema'

/**
 * Crea una versión nueva a partir de una dieta finalizada.
 * POST /api/dietas/dietas/[id]/duplicar
 *
 * La copia nace en BORRADOR y cuelga del MISMO cuadro (los cálculos no cambian:
 * lo que se quiere variar son los platillos). Si el nutriólogo cambia peso o
 * kcal, eso es un cuadro nuevo y lo cubre el flujo normal de guardado.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const original = await prisma.dietaGenerada.findUnique({ where: { id } })
  if (!original) {
    return NextResponse.json({ error: 'Dieta no encontrada' }, { status: 404 })
  }

  // No se duplica un contenido que no se podrá abrir: copiarlo solo repartiría
  // el dato dañado por más registros. Mejor avisar y que se regenere.
  const contenidoOk = validarContenido(original.modo, original.contenido)
  if (!contenidoOk.ok) {
    return NextResponse.json(
      { error: `No se puede duplicar: ${contenidoOk.error}` },
      { status: 409 }
    )
  }

  const copia = await prisma.dietaGenerada.create({
    data: {
      cuadro_id: original.cuadro_id,
      paciente_id: original.paciente_id,
      modo: original.modo,
      contenido: original.contenido ?? {},
      indicaciones_inicio: original.indicaciones_inicio,
      estado: 'BORRADOR',
      finalizada_at: null,
      // Trazabilidad: de qué versión definitiva salió esta.
      version_de_id: original.estado === 'FINALIZADA' ? original.id : original.version_de_id,
    },
  })

  return NextResponse.json({ dieta: copia }, { status: 201 })
}
