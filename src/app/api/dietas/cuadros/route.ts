import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { calcularCuadroDietosintetico, type EntradaCuadro } from '@/lib/utils/dietosintetico'
import {
  GRUPOS_SMAE,
  sumarEquivalentes,
  calcularDiferencia,
  type Equivalentes,
  type GrupoSMAEId,
} from '@/lib/utils/smae'

// IDs válidos de grupos del SMAE, para validar el objeto de equivalentes.
const GRUPO_IDS = GRUPOS_SMAE.map((g) => g.id) as [GrupoSMAEId, ...GrupoSMAEId[]]
const equivalentesSchema = z.record(z.enum(GRUPO_IDS), z.number().min(0).max(99)).optional()

/**
 * Cuadro dietosintético
 * ------------------------------------------------------------
 * POST  /api/dietas/cuadros           Calcula un cuadro; si guardar=true, lo persiste.
 * GET   /api/dietas/cuadros?paciente_id=...   Lista los cuadros de un paciente.
 */

const cuadroSchema = z.object({
  paciente_id: z.string().min(1, 'Paciente requerido'),
  consulta_id: z.string().optional(),

  peso: z.number().min(2.5).max(500),
  talla_cm: z.number().min(25).max(260),
  edad: z.number().int().min(1).max(120),
  sexo: z.enum(['MASCULINO', 'FEMENINO']),
  nivel_actividad: z.enum(['SEDENTARIO', 'LIGERO', 'MODERADO', 'ACTIVO', 'MUY_ACTIVO']),
  objetivo: z.enum(['BAJAR_PESO', 'MANTENER', 'SUBIR_PESO']),

  pct_proteina: z.number().min(5).max(60).default(25),
  pct_grasa: z.number().min(10).max(60).default(25),
  pct_carbohidrato: z.number().min(10).max(70).default(50),
  ajuste_kcal_custom: z.number().int().min(-1500).max(1500).nullable().optional(),
  // Kcal meta manual (sobrescribe la calculada). Si se omite, se usa la calculada.
  kcal_meta_manual: z.number().min(800).max(6000).optional(),

  notas: z.string().max(2000).optional(),

  // Distribución por grupos del SMAE (nº de equivalentes por grupo).
  equivalentes: equivalentesSchema,

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

  // Correr los cálculos (el módulo valida y puede lanzar sobre datos imposibles)
  let resultado
  try {
    const entrada: EntradaCuadro = {
      peso: data.peso,
      tallaCm: data.talla_cm,
      edad: data.edad,
      sexo: data.sexo,
      nivelActividad: data.nivel_actividad,
      objetivo: data.objetivo,
      distribucionMacros: {
        proteina: data.pct_proteina,
        grasa: data.pct_grasa,
        carbohidrato: data.pct_carbohidrato,
      },
      ajusteObjetivoCustom: data.ajuste_kcal_custom ?? undefined,
    }
    resultado = calcularCuadroDietosintetico(entrada)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al calcular el cuadro' },
      { status: 400 }
    )
  }

  // Meta efectiva: la manual si el nutriólogo la sobrescribió, si no la calculada.
  const kcalMetaEfectiva = data.kcal_meta_manual ?? resultado.kcalMeta
  // Gramos de meta según los % y la kcal efectiva (Atwater: HCO/Pro 4, Líp 9).
  const metaHcoG = Math.round(((kcalMetaEfectiva * data.pct_carbohidrato) / 100 / 4) * 10) / 10
  const metaLipG = Math.round(((kcalMetaEfectiva * data.pct_grasa) / 100 / 9) * 10) / 10
  const metaProG = Math.round(((kcalMetaEfectiva * data.pct_proteina) / 100 / 4) * 10) / 10

  // Distribución por equivalentes SMAE: sumamos aportes y comparamos con la meta efectiva.
  const equivalentes = (data.equivalentes ?? {}) as Equivalentes
  const totalesSmae = sumarEquivalentes(equivalentes)
  const diferenciaSmae = calcularDiferencia(totalesSmae, {
    kcalMeta: kcalMetaEfectiva,
    hco_g: metaHcoG,
    proteina_g: metaProG,
    lipidos_g: metaLipG,
  })
  const smae = { totales: totalesSmae, diferencia: diferenciaSmae }

  // Si no se pide guardar, devolvemos solo el cálculo (para la vista previa)
  if (!data.guardar) {
    return NextResponse.json({ resultado, smae }, { status: 200 })
  }

  // Guardar el cuadro (inputs + resultados calculados)
  const cuadro = await prisma.cuadroDietosintetico.create({
    data: {
      paciente_id: data.paciente_id,
      consulta_id: data.consulta_id ?? null,
      peso: data.peso,
      talla_cm: data.talla_cm,
      edad: data.edad,
      sexo: data.sexo,
      nivel_actividad: data.nivel_actividad,
      objetivo: data.objetivo,
      pct_proteina: data.pct_proteina,
      pct_grasa: data.pct_grasa,
      pct_carbohidrato: data.pct_carbohidrato,
      ajuste_kcal_custom: data.ajuste_kcal_custom ?? null,
      geb: resultado.geb,
      get: resultado.get,
      kcal_meta: kcalMetaEfectiva,
      imc: resultado.imc,
      peso_ideal: resultado.pesoIdeal,
      proteina_g: metaProG,
      grasa_g: metaLipG,
      carbohidrato_g: metaHcoG,
      equivalentes: Object.keys(equivalentes).length ? equivalentes : undefined,
      notas: data.notas ?? null,
    },
  })

  return NextResponse.json({ cuadro, resultado, smae }, { status: 201 })
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

  const cuadros = await prisma.cuadroDietosintetico.findMany({
    where: { paciente_id: pacienteId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ cuadros }, { status: 200 })
}
