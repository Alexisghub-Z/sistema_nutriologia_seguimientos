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

  const paciente = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    select: { id: true, nombre: true, fecha_nacimiento: true },
  })
  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  // Última consulta con peso/talla/composición registrados
  const ultimaConsulta = await prisma.consulta.findFirst({
    where: { paciente_id: pacienteId },
    orderBy: { fecha: 'desc' },
    select: { peso: true, talla: true, grasa_corporal: true, masa_muscular_kg: true, fecha: true },
  })

  // Masa libre de grasa (para Katch-McArdle / Cunningham): preferimos calcularla
  // desde el % de grasa corporal; si no hay, usamos la masa muscular como aproximación.
  let mlgKg: number | null = null
  if (ultimaConsulta?.peso && ultimaConsulta.grasa_corporal != null) {
    mlgKg = Math.round(ultimaConsulta.peso * (1 - ultimaConsulta.grasa_corporal / 100) * 10) / 10
  } else if (ultimaConsulta?.masa_muscular_kg != null) {
    mlgKg = ultimaConsulta.masa_muscular_kg
  }

  return NextResponse.json({
    nombre: paciente.nombre,
    edad: calcularEdad(paciente.fecha_nacimiento),
    // Consulta.talla está en METROS; el cuadro trabaja en cm.
    peso: ultimaConsulta?.peso ?? null,
    talla_cm: ultimaConsulta?.talla ? Math.round(ultimaConsulta.talla * 100) : null,
    mlg_kg: mlgKg,
    fecha_ultima_consulta: ultimaConsulta?.fecha ?? null,
  })
}
