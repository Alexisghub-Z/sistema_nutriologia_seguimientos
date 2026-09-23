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
  /**
   * Cuadro que hay que ACTUALIZAR en lugar de crear uno nuevo.
   *
   * Lo usa el autoguardado del cuadro: sin esto, cada pocos segundos nacería
   * un cuadro más y el historial del paciente se llenaría de borradores
   * repetidos. Con él, el borrador se reescribe siempre sobre el mismo.
   */
  cuadro_id: z.string().min(1).optional(),
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

  // Actualizar un borrador existente en lugar de crear otro: es lo que permite
  // que el autoguardado del cuadro no llene el historial de duplicados.
  if (data.cuadro_id) {
    const existente = await prisma.cuadroDietosintetico.findUnique({
      where: { id: data.cuadro_id },
      select: {
        id: true,
        paciente_id: true,
        dietas: { where: { estado: 'FINALIZADA' }, select: { id: true }, take: 1 },
      },
    })

    if (!existente) {
      return NextResponse.json({ error: 'Cuadro no encontrado' }, { status: 404 })
    }

    // No se permite mover un cuadro de un paciente a otro: si el nutriólogo
    // cambió de paciente, lo correcto es un cuadro nuevo, no reescribir el del
    // anterior con datos que no son suyos.
    if (existente.paciente_id !== data.paciente_id) {
      return NextResponse.json(
        { error: 'El cuadro pertenece a otro paciente' },
        { status: 409 }
      )
    }

    // Un cuadro con dieta ya entregada es historia clínica: sus números
    // respaldan lo que el paciente tiene en la mano. Reescribirlo dejaría la
    // dieta entregada apoyada en cálculos que ya no son los que se usaron.
    if (existente.dietas.length > 0) {
      return NextResponse.json(
        { error: 'Este cuadro ya tiene una dieta finalizada y no se puede modificar' },
        { status: 409 }
      )
    }

    const actualizado = await prisma.cuadroDietosintetico.update({
      where: { id: data.cuadro_id },
      data: datosParaGuardar(data, calc),
    })

    return NextResponse.json({ cuadro: actualizado, resultado, smae }, { status: 200 })
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
