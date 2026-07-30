import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

/**
 * Datos para prellenar un cuadro dietosintético nuevo.
 * GET /api/dietas/cuadros/prellenado?paciente_id=...
 *
 * Toma peso y talla de la última consulta del paciente y calcula la edad
 * desde su fecha de nacimiento. Todo editable en el formulario.
 */

/**
 * Calcula la edad en años a partir de la fecha de nacimiento.
 * Mismo criterio que src/components/forms/ConsultaForm.tsx.
 */
function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date()
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
  const cumpleEsteAno = new Date(
    hoy.getFullYear(),
    fechaNacimiento.getMonth(),
    fechaNacimiento.getDate()
  )
  if (hoy < cumpleEsteAno) edad--
  return edad
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const pacienteId = request.nextUrl.searchParams.get('paciente_id')
  if (!pacienteId) {
    return NextResponse.json({ error: 'paciente_id requerido' }, { status: 400 })
  }

  // Opcional: prellenar desde una consulta específica (dieta ligada a consulta).
  const consultaId = request.nextUrl.searchParams.get('consulta_id')

  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    select: { id: true, nombre: true, fecha_nacimiento: true },
  })
  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  // Consulta base: la indicada por consulta_id, o la última si no se pide una.
  const consultaBase = consultaId
    ? await prisma.consulta.findFirst({
        where: { id: consultaId, paciente_id: pacienteId },
        select: {
          peso: true,
          talla: true,
          grasa_corporal: true,
          fecha: true,
        },
      })
    : await prisma.consulta.findFirst({
        where: { paciente_id: pacienteId },
        orderBy: { fecha: 'desc' },
        select: {
          peso: true,
          talla: true,
          grasa_corporal: true,
          fecha: true,
        },
      })

  // Masa libre de grasa (para Katch-McArdle / Cunningham). Se calcula SOLO desde
  // el % de grasa corporal: MLG = peso × (1 − %grasa/100). No se usa la masa
  // muscular como MLG porque no es lo mismo — la MLG incluye músculo, hueso,
  // órganos y agua (la masa muscular es solo ~50-55% de la MLG), y sustituirla
  // subestima la MLG y hace que Katch/Cunningham devuelvan calorías demasiado
  // bajas. Si no hay % de grasa, el campo queda vacío y el nutriólogo lo escribe.
  let mlgKg: number | null = null
  if (consultaBase?.peso && consultaBase.grasa_corporal != null) {
    mlgKg = Math.round(consultaBase.peso * (1 - consultaBase.grasa_corporal / 100) * 10) / 10
  }

  // Lista de consultas del paciente para el selector "basar dieta en consulta".
  const consultas = await prisma.consulta.findMany({
    where: { paciente_id: pacienteId },
    orderBy: { fecha: 'desc' },
    select: { id: true, fecha: true, peso: true, motivo: true },
  })

  return NextResponse.json({
    nombre: paciente.nombre,
    edad: calcularEdad(paciente.fecha_nacimiento),
    // Consulta.talla está en METROS; el cuadro trabaja en cm.
    peso: consultaBase?.peso ?? null,
    talla_cm: consultaBase?.talla ? Math.round(consultaBase.talla * 100) : null,
    mlg_kg: mlgKg,
    fecha_consulta_base: consultaBase?.fecha ?? null,
    consultas,
  })
}
