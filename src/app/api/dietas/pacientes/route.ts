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

  const filtro = texto
    ? {
        OR: [
          { nombre: { contains: texto, mode: 'insensitive' as const } },
          { email: { contains: texto, mode: 'insensitive' as const } },
        ],
      }
    : undefined

  const [total, pacientes] = await Promise.all([
    prisma.paciente.count({ where: filtro }),
    prisma.paciente.findMany({
      where: filtro,
      // Por actividad reciente: quien acaba de pasar por consulta es a quien más
      // probablemente haya que hacerle la dieta ahora mismo.
      //
      // OJO con el corte: la pantalla ordena estos pacientes por urgencia clínica
      // (`recomendar()`), cruzando cita, consulta y dieta. Ese cálculo solo puede
      // hacerse con lo que llegue aquí, así que un paciente que se quede fuera es
      // invisible para el panel aunque tenga cita mañana. Por eso se devuelve
      // también el total: la pantalla puede avisar de que está viendo una parte.
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
    }),
  ])

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
    total,
    // La pantalla ordena por urgencia solo con lo que recibe: si hay más, tiene
    // que poder decirlo en lugar de dar la lista por completa.
    hayMas: total > pacientes.length,
  })
}
