import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'

/**
 * Perfil de estilo del nutriólogo para la IA de dietas.
 * GET  /api/dietas/perfil-estilo   Devuelve el perfil (lo crea vacío si no existe).
 * PUT  /api/dietas/perfil-estilo   Actualiza el perfil.
 *
 * Registro único (singleton), igual patrón que ConfiguracionGeneral.
 */

const perfilSchema = z.object({
  region: z.string().max(500).optional().nullable(),
  alimentos_tipicos: z.string().max(4000).optional().nullable(),
  alimentos_evitar: z.string().max(2000).optional().nullable(),
  estructura_notas: z.string().max(2000).optional().nullable(),
  reglas_propias: z.string().max(2000).optional().nullable(),
  tono: z.string().max(1000).optional().nullable(),
  instrucciones_libres: z.string().max(4000).optional().nullable(),
})

/** Obtiene el perfil único, creándolo vacío la primera vez. */
async function obtenerOCrearPerfil() {
  let perfil = await prisma.perfilEstiloDietas.findFirst()
  if (!perfil) {
    perfil = await prisma.perfilEstiloDietas.create({ data: {} })
  }
  return perfil
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const perfil = await obtenerOCrearPerfil()
  return NextResponse.json(perfil, { status: 200 })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = perfilSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const perfil = await obtenerOCrearPerfil()
  const actualizado = await prisma.perfilEstiloDietas.update({
    where: { id: perfil.id },
    data: parsed.data,
  })

  return NextResponse.json(actualizado, { status: 200 })
}
