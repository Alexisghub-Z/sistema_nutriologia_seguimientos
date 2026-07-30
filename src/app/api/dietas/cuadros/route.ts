import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import {
  datosCuadroSchema,
  calcularCuadro,
  datosParaGuardar,
  ErrorCalculoCuadro,
} from '@/lib/services/cuadros'

/**
 * Cuadro dietosintético
 * ------------------------------------------------------------
 * POST  /api/dietas/cuadros           Calcula un cuadro; si guardar=true, lo persiste.
 * GET   /api/dietas/cuadros?paciente_id=...   Lista los cuadros de un paciente.
 *
 * La dieta/recetario NO se guarda por aquí: vive en el modelo DietaGenerada y
 * se persiste con POST /api/dietas/dietas.
 */

const cuadroSchema = datosCuadroSchema.extend({
  // Si es true, guarda el cuadro en la BD. Si false (default), solo calcula.
  guardar: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = cuadroSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const data = parsed.data

  // Verificar que el paciente existe
  const paciente = await prisma.paciente.findUnique({
    where: { id: data.paciente_id },
    select: { id: true },
  })
  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  // Correr los cálculos (el helper valida y puede lanzar sobre datos imposibles)
  let calc
  try {
    calc = calcularCuadro(data)
  } catch (e) {
    if (e instanceof ErrorCalculoCuadro) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    throw e
  }
  const { resultado, smae } = calc

  // Si no se pide guardar, devolvemos solo el cálculo (para la vista previa)
  if (!data.guardar) {
    return NextResponse.json({ resultado, smae }, { status: 200 })
  }

  // Guardar el cuadro (inputs + resultados calculados)
  const cuadro = await prisma.cuadroDietosintetico.create({
    data: datosParaGuardar(data, calc),
  })

  return NextResponse.json({ cuadro, resultado, smae }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const pacienteId = params.get('paciente_id')
  if (!pacienteId) {
    return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 })
  }

  // Paginación: el historial de un paciente crece con los años, así que no
  // devolvemos todo de golpe.
  const pagina = Math.max(1, Number(params.get('pagina') ?? 1) || 1)
  const porPagina = Math.min(48, Math.max(1, Number(params.get('por_pagina') ?? 12) || 12))

  const where = { paciente_id: pacienteId }
  const [total, cuadros] = await Promise.all([
    prisma.cuadroDietosintetico.count({ where }),
    // Solo los campos para el listado del historial (no todo el cuadro).
    prisma.cuadroDietosintetico.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagina - 1) * porPagina,
      take: porPagina,
      select: {
        id: true,
        createdAt: true,
        kcal_meta: true,
        objetivo: true,
        geb: true,
        imc: true,
        peso: true,
        consulta_id: true,
        etiqueta: true,
        // Estado de las dietas del cuadro, para marcarlas en el historial.
        dietas: {
          select: { id: true, modo: true, estado: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    }),
  ])

  return NextResponse.json(
    { cuadros, total, pagina, porPagina, totalPaginas: Math.ceil(total / porPagina) },
    { status: 200 }
  )
}
