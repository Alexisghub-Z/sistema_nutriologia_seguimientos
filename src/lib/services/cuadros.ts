import { z } from 'zod'
import { calcularCuadroDietosintetico, type EntradaCuadro } from '@/lib/utils/dietosintetico'
import {
  GRUPOS_SMAE,
  sumarEquivalentes,
  calcularDiferencia,
  type Equivalentes,
  type GrupoSMAEId,
} from '@/lib/utils/smae'

/**
 * Lógica compartida del cuadro dietosintético.
 * ------------------------------------------------------------
 * La usan tanto POST /api/dietas/cuadros como POST /api/dietas/dietas (que
 * puede crear el cuadro al vuelo al finalizar una dieta). Vive aquí para que
 * haya UNA sola fuente de verdad: si el cálculo se duplicara, las dos copias
 * acabarían dando metas distintas para el mismo paciente.
 */

// IDs válidos de grupos del SMAE, para validar el objeto de equivalentes.
const GRUPO_IDS = GRUPOS_SMAE.map((g) => g.id) as [GrupoSMAEId, ...GrupoSMAEId[]]

export const equivalentesSchema = z.record(z.enum(GRUPO_IDS), z.number().min(0).max(99)).optional()

/** Distribución en tiempos de comida: lista de tiempos + reparto por tiempo. */
export const distribucionTiemposSchema = z
  .object({
    tiempos: z
      .array(z.object({ id: z.string().min(1), nombre: z.string().min(1).max(60) }))
      .max(12),
    reparto: z.record(z.string(), z.record(z.enum(GRUPO_IDS), z.number().min(0).max(99))),
  })
  .optional()

/** Datos de entrada del cuadro (sin los flags de persistencia). */
export const datosCuadroSchema = z.object({
  paciente_id: z.string().min(1, 'Paciente requerido'),
  consulta_id: z.string().optional(),

  peso: z.number().min(2.5).max(500),
  talla_cm: z.number().min(25).max(260),
  edad: z.number().int().min(1).max(120),
  sexo: z.enum(['MASCULINO', 'FEMENINO']),
  nivel_actividad: z.enum(['SEDENTARIO', 'LIGERO', 'MODERADO', 'ACTIVO', 'MUY_ACTIVO']),
  objetivo: z.enum(['BAJAR_PESO', 'MANTENER', 'SUBIR_PESO']),

  // Fórmula para el gasto en reposo. KATCH/CUNNINGHAM requieren mlg_kg.
  formula: z.enum(['MIFFLIN', 'HARRIS', 'KATCH', 'CUNNINGHAM']).default('MIFFLIN'),
  mlg_kg: z.number().min(5).max(200).optional(),

  pct_proteina: z.number().min(5).max(60).default(25),
  pct_grasa: z.number().min(10).max(60).default(25),
  pct_carbohidrato: z.number().min(10).max(70).default(50),
  ajuste_kcal_custom: z.number().int().min(-1500).max(1500).nullable().optional(),
  // Kcal meta manual (sobrescribe la calculada). Si se omite, se usa la calculada.
  kcal_meta_manual: z.number().min(800).max(6000).optional(),

  notas: z.string().max(2000).optional(),

  equivalentes: equivalentesSchema,
  distribucion_tiempos: distribucionTiemposSchema,
})

export type DatosCuadro = z.infer<typeof datosCuadroSchema>

/** Error de cálculo con datos imposibles (se traduce a un 400). */
export class ErrorCalculoCuadro extends Error {}

/**
 * Corre los cálculos del cuadro y prepara los campos listos para persistir.
 *
 * @throws ErrorCalculoCuadro si los datos no permiten calcular (ej. KATCH sin MLG)
 */
export function calcularCuadro(data: DatosCuadro) {
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
      formula: data.formula,
      mlgKg: data.mlg_kg,
    }
    resultado = calcularCuadroDietosintetico(entrada)
  } catch (e) {
    throw new ErrorCalculoCuadro(e instanceof Error ? e.message : 'Error al calcular el cuadro')
  }

  // Meta efectiva: la manual si el nutriólogo la sobrescribió, si no la calculada.
  const kcalMetaEfectiva = data.kcal_meta_manual ?? resultado.kcalMeta
  // Gramos de meta según los % y la kcal efectiva (Atwater: HCO/Pro 4, Líp 9).
  const metaHcoG = Math.round(((kcalMetaEfectiva * data.pct_carbohidrato) / 100 / 4) * 10) / 10
  const metaLipG = Math.round(((kcalMetaEfectiva * data.pct_grasa) / 100 / 9) * 10) / 10
  const metaProG = Math.round(((kcalMetaEfectiva * data.pct_proteina) / 100 / 4) * 10) / 10

  // Distribución por equivalentes SMAE: sumamos aportes y comparamos con la meta.
  const equivalentes = (data.equivalentes ?? {}) as Equivalentes
  const totalesSmae = sumarEquivalentes(equivalentes)
  const diferenciaSmae = calcularDiferencia(totalesSmae, {
    kcalMeta: kcalMetaEfectiva,
    hco_g: metaHcoG,
    proteina_g: metaProG,
    lipidos_g: metaLipG,
  })

  return {
    resultado,
    smae: { totales: totalesSmae, diferencia: diferenciaSmae },
    kcalMetaEfectiva,
    metaHcoG,
    metaLipG,
    metaProG,
    equivalentes,
  }
}

/**
 * Construye el objeto `data` para crear el cuadro en Prisma, a partir de los
 * datos de entrada y el resultado de `calcularCuadro`.
 */
export function datosParaGuardar(data: DatosCuadro, calc: ReturnType<typeof calcularCuadro>) {
  return {
    paciente_id: data.paciente_id,
    consulta_id: data.consulta_id ?? null,
    peso: data.peso,
    talla_cm: data.talla_cm,
    edad: data.edad,
    sexo: data.sexo,
    nivel_actividad: data.nivel_actividad,
    objetivo: data.objetivo,
    formula: data.formula,
    mlg_kg: data.mlg_kg ?? null,
    pct_proteina: data.pct_proteina,
    pct_grasa: data.pct_grasa,
    pct_carbohidrato: data.pct_carbohidrato,
    ajuste_kcal_custom: data.ajuste_kcal_custom ?? null,
    geb: calc.resultado.geb,
    get: calc.resultado.get,
    kcal_meta: calc.kcalMetaEfectiva,
    imc: calc.resultado.imc,
    peso_ideal: calc.resultado.pesoIdeal,
    proteina_g: calc.metaProG,
    grasa_g: calc.metaLipG,
    carbohidrato_g: calc.metaHcoG,
    equivalentes: Object.keys(calc.equivalentes).length ? calc.equivalentes : undefined,
    distribucion_tiempos: data.distribucion_tiempos ?? undefined,
    notas: data.notas ?? null,
  }
}
