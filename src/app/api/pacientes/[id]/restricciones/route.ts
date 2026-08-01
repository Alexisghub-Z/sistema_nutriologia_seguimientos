import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { deleteCache, deleteCachePattern, CacheKeys } from '@/lib/redis'

/**
 * Restricciones alimentarias del paciente.
 * PATCH /api/pacientes/[id]/restricciones
 *
 * Van en el paciente y no en la consulta porque no cambian entre visitas: se
 * capturan una vez y aplican a todas sus dietas. Endpoint aparte del PUT del
 * paciente, que exige todos los datos y aquí solo tocamos estos cuatro campos.
 */

// Cadena vacía = borrar el dato. El límite evita textos desproporcionados.
const campo = z.string().max(500).optional()

const restriccionesSchema = z.object({
  alergias: campo,
  intolerancias: campo,
  preferencias: campo,
  disgustos: campo,
})

/** Cadena vacía o solo espacios → null, para no guardar basura. */
const limpiar = (v?: string) => {
  const t = v?.trim()
  return t ? t : null
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await context.params
  const body = await request.json()
  const parsed = restriccionesSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const existe = await prisma.paciente.findUnique({ where: { id }, select: { id: true } })
  if (!existe) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  const paciente = await prisma.paciente.update({
    where: { id },
    data: {
      alergias: limpiar(parsed.data.alergias),
      intolerancias: limpiar(parsed.data.intolerancias),
      preferencias: limpiar(parsed.data.preferencias),
      disgustos: limpiar(parsed.data.disgustos),
    },
    select: {
      id: true,
      alergias: true,
      intolerancias: true,
      preferencias: true,
      disgustos: true,
    },
  })

  // El paciente cacheado quedaría con las restricciones viejas (mismo patrón
  // de invalidación que el PUT del paciente).
  try {
    await deleteCache(CacheKeys.patientDetail(id))
    await deleteCachePattern('patients:list:*')
  } catch {
    /* si falla la caché, el dato ya está guardado */
  }

  return NextResponse.json({ paciente }, { status: 200 })
}
