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
import { alFinalizarDieta } from '@/lib/dietas/finalizacion'

/**
 * Dietas y recetarios generados.
 * ------------------------------------------------------------
 * POST /api/dietas/dietas   Guarda una dieta y, con finalizar=true, la cierra
 *                           como versión definitiva.
 *
 * Puede recibir un `cuadro_id` existente o los datos del cuadro para crearlo al
 * vuelo: así el nutriólogo finaliza en UN solo paso desde la pestaña de IA, sin
 * tener que ir antes a otra pestaña a guardar.
 */

const guardarDietaSchema = z.object({
  // Si el cuadro ya está guardado, su id. Si no, hay que mandar `cuadro`.
  cuadro_id: z.string().min(1).optional(),
  cuadro: datosCuadroSchema.optional(),
  // Dieta concreta que se está editando. Con esto se actualiza ESA y no se
  // adivina cuál por (cuadro, modo), que podría acertar con otra distinta.
  dieta_id: z.string().min(1).optional(),

  modo: z.enum(['DIETA', 'RECETARIO']),
  // Estructura libre: la forma de los tiempos la define el generador de IA.
  contenido: z.object({ tiempos: z.array(z.any()).min(1, 'La dieta no tiene tiempos') }),
  indicaciones_inicio: z.string().max(4000).optional(),

  // true = cerrar como versión definitiva en el mismo acto.
  finalizar: z.boolean().default(false),
  // Si esta dieta nace como versión nueva de otra finalizada.
  version_de_id: z.string().min(1).optional(),
})

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = guardarDietaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const data = parsed.data

  if (!data.cuadro_id && !data.cuadro) {
    return NextResponse.json(
      { error: 'Falta el cuadro: manda cuadro_id o los datos para crearlo.' },
      { status: 400 }
    )
  }

  // Cuadro existente: comprobamos que esté y que no tenga ya una versión
  // definitiva de este mismo modo (esa no se re-edita, se duplica).
  if (data.cuadro_id) {
    const cuadro = await prisma.cuadroDietosintetico.findUnique({
      where: { id: data.cuadro_id },
      select: { id: true, paciente_id: true },
    })
    if (!cuadro) {
      return NextResponse.json({ error: 'Cuadro no encontrado' }, { status: 404 })
    }

    const yaFinalizada = await prisma.dietaGenerada.findFirst({
      where: { cuadro_id: cuadro.id, modo: data.modo, estado: 'FINALIZADA' },
      select: { id: true },
    })
    if (yaFinalizada) {
      return NextResponse.json(
        {
          error:
            'Este cuadro ya tiene una dieta finalizada de ese tipo. Crea una versión nueva para modificarla.',
        },
        { status: 409 }
      )
    }

    const dieta = await guardarDieta(cuadro.id, cuadro.paciente_id, data)
    if (dieta.estado === 'FINALIZADA') await alFinalizarDieta(dieta.id)
    return NextResponse.json({ cuadro_id: cuadro.id, dieta }, { status: 201 })
  }

  // Sin cuadro previo: lo creamos junto con la dieta, en una transacción.
  const datosCuadro = data.cuadro!
  const paciente = await prisma.paciente.findUnique({
    where: { id: datosCuadro.paciente_id },
    select: { id: true },
  })
  if (!paciente) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
  }

  let calc
  try {
    calc = calcularCuadro(datosCuadro)
  } catch (e) {
    if (e instanceof ErrorCalculoCuadro) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    throw e
  }

  const finalizar = data.finalizar
  const { cuadro, dieta } = await prisma.$transaction(async (tx) => {
    const cuadroNuevo = await tx.cuadroDietosintetico.create({
      data: datosParaGuardar(datosCuadro, calc),
    })
    const dietaNueva = await tx.dietaGenerada.create({
      data: {
        cuadro_id: cuadroNuevo.id,
        paciente_id: cuadroNuevo.paciente_id,
        modo: data.modo,
        contenido: data.contenido,
        indicaciones_inicio: data.indicaciones_inicio ?? null,
        estado: finalizar ? 'FINALIZADA' : 'BORRADOR',
        finalizada_at: finalizar ? new Date() : null,
        version_de_id: data.version_de_id ?? null,
      },
    })
    return { cuadro: cuadroNuevo, dieta: dietaNueva }
  })

  // Fuera de la transacción a propósito (ver alFinalizarDieta).
  if (dieta.estado === 'FINALIZADA') await alFinalizarDieta(dieta.id)

  return NextResponse.json(
    { cuadro_id: cuadro.id, dieta, resultado: calc.resultado, smae: calc.smae },
    { status: 201 }
  )
}

/**
 * Crea o actualiza la dieta de un cuadro ya existente. Reutiliza el borrador del
 * mismo modo si lo hay, para que guardar varias veces no acumule basura.
 */
async function guardarDieta(
  cuadroId: string,
  pacienteId: string,
  data: z.infer<typeof guardarDietaSchema>
) {
  // Si sabemos qué dieta se está editando, se actualiza esa. Si no (dieta recién
  // generada), se busca un borrador del mismo cuadro y modo para no acumular
  // registros al guardar varias veces seguidas.
  const borrador = data.dieta_id
    ? await prisma.dietaGenerada.findFirst({
        where: { id: data.dieta_id, cuadro_id: cuadroId },
        select: { id: true },
      })
    : await prisma.dietaGenerada.findFirst({
        where: { cuadro_id: cuadroId, modo: data.modo, estado: 'BORRADOR' },
        select: { id: true },
      })

  const comunes = {
    contenido: data.contenido,
    indicaciones_inicio: data.indicaciones_inicio ?? null,
    estado: data.finalizar ? ('FINALIZADA' as const) : ('BORRADOR' as const),
    finalizada_at: data.finalizar ? new Date() : null,
  }

  if (borrador) {
    return prisma.dietaGenerada.update({ where: { id: borrador.id }, data: comunes })
  }
  return prisma.dietaGenerada.create({
    data: {
      cuadro_id: cuadroId,
      paciente_id: pacienteId,
      modo: data.modo,
      version_de_id: data.version_de_id ?? null,
      ...comunes,
    },
  })
}
