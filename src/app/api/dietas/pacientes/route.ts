import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'

/**
 * Pacientes para elegir a quién hacerle una dieta.
 * GET /api/dietas/pacientes?q=texto
 *
 * Va aparte de `/api/pacientes/buscar` —que devuelve solo nombre y email y lo
 * usan otras pantallas— porque aquí hace falta contexto para DECIDIR: cuándo
 * fue su última consulta, si tiene cita próxima y si ya tiene dieta. Sin eso,
 * el nutriólogo tenía que recordar el nombre y escribirlo a ciegas.
 *
 * Sin `q` devuelve la lista completa (ordenada por actividad reciente), que es
 * justo lo que faltaba: al entrar, la pantalla estaba vacía.
 */

const consultaSchema = z.object({
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(60),
})

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const parsed = consultaSchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  }
  const { q, limit } = parsed.data
  const texto = q?.trim()

  const ahora = new Date()

  const pacientes = await prisma.paciente.findMany({
    where: texto
      ? {
          OR: [
            { nombre: { contains: texto, mode: 'insensitive' } },
            { email: { contains: texto, mode: 'insensitive' } },
          ],
        }
      : undefined,
    // Por actividad reciente: quien acaba de pasar por consulta es a quien más
    // probablemente haya que hacerle la dieta ahora mismo.
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      nombre: true,
      email: true,
      consultas: {
        take: 1,
        orderBy: { fecha: 'desc' },
        select: { fecha: true, peso: true },
      },
      citas: {
        where: { estado: 'PENDIENTE', fecha_hora: { gte: ahora } },
        take: 1,
        orderBy: { fecha_hora: 'asc' },
        select: { fecha_hora: true },
      },
      dietas_generadas: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, estado: true },
      },
    },
  })

  // Se aplana aquí para que la pantalla reciba justo lo que pinta y no tenga
  // que saber cómo están anidadas las relaciones.
  return NextResponse.json({
    pacientes: pacientes.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      ultima_consulta: p.consultas[0]?.fecha ?? null,
      ultimo_peso: p.consultas[0]?.peso ?? null,
      proxima_cita: p.citas[0]?.fecha_hora ?? null,
      ultima_dieta: p.dietas_generadas[0]?.createdAt ?? null,
      dieta_finalizada: p.dietas_generadas[0]?.estado === 'FINALIZADA',
    })),
  })
}
