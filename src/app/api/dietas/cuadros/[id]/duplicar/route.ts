import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

/**
 * Duplica un cuadro como punto de partida de uno nuevo.
 * POST /api/dietas/cuadros/[id]/duplicar
 *
 * Copia los cálculos y el reparto de equivalentes, pero NO las dietas: la idea
 * es reaprovechar el planteamiento en una consulta de seguimiento (mismo
 * paciente, normalmente solo cambia el peso) y generar una dieta nueva.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const original = await prisma.cuadroDietosintetico.findUnique({ where: { id } })
  if (!original) {
    return NextResponse.json({ error: 'Cuadro no encontrado' }, { status: 404 })
  }

  const copia = await prisma.cuadroDietosintetico.create({
    data: {
      paciente_id: original.paciente_id,
      // La copia no hereda la consulta: pertenecerá a la que toque ahora.
      consulta_id: null,
      peso: original.peso,
      talla_cm: original.talla_cm,
      edad: original.edad,
      sexo: original.sexo,
      nivel_actividad: original.nivel_actividad,
      objetivo: original.objetivo,
      formula: original.formula,
      mlg_kg: original.mlg_kg,
      pct_proteina: original.pct_proteina,
      pct_grasa: original.pct_grasa,
      pct_carbohidrato: original.pct_carbohidrato,
      ajuste_kcal_custom: original.ajuste_kcal_custom,
      geb: original.geb,
      get: original.get,
      kcal_meta: original.kcal_meta,
      imc: original.imc,
      peso_ideal: original.peso_ideal,
      proteina_g: original.proteina_g,
      grasa_g: original.grasa_g,
      carbohidrato_g: original.carbohidrato_g,
      equivalentes: original.equivalentes ?? undefined,
      distribucion_tiempos: original.distribucion_tiempos ?? undefined,
      etiqueta: original.etiqueta ? `${original.etiqueta} (copia)` : null,
      notas: original.notas,
    },
  })

  return NextResponse.json({ cuadro: copia }, { status: 201 })
}
