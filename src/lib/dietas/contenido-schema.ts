/**
 * Validación del contenido de una dieta o recetario en el servidor.
 * ------------------------------------------------------------
 * Antes el contenido entraba como `z.array(z.any())`: cualquier estructura se
 * persistía tal cual. Por ahí pasó el borrador que en producción estaba
 * marcado como DIETA pero guardaba un recetario dentro; al abrirlo, la pantalla
 * leía `tiempo.alimentos` —que en un recetario no existe— y se caía entera.
 *
 * El cliente ya no comete ese cruce, pero la base de datos no debe depender de
 * que el cliente se porte bien: aquí se comprueba que la forma REAL del
 * contenido corresponda al `modo` declarado, y se ponen topes de tamaño para
 * que un payload desbocado no llegue a Postgres.
 *
 * Los topes son holgados a propósito: no son una regla clínica, sino un freno
 * ante datos absurdos. Una dieta real no pasa de una docena de tiempos.
 */

import { z } from 'zod'
import { GRUPOS_SMAE, type GrupoSMAEId } from '@/lib/utils/smae'

const GRUPO_IDS = GRUPOS_SMAE.map((g) => g.id) as [GrupoSMAEId, ...GrupoSMAEId[]]

/** Topes de tamaño. Holgados: frenan lo absurdo, no el uso normal. */
export const LIMITES = {
  tiempos: 12,
  alimentosPorTiempo: 40,
  opcionesPorTiempo: 12,
  descripcion: 500,
  nombre: 120,
  nota: 1000,
  preparacion: 2000,
} as const

/**
 * Un alimento. `grupo` se valida contra el catálogo SMAE porque alimenta los
 * cálculos de equivalentes: un grupo inventado descuadraría la dieta entera.
 */
const alimentoSchema = z.object({
  grupo: z.enum(GRUPO_IDS),
  equivalentes: z.number().min(0).max(99),
  descripcion: z.string().max(LIMITES.descripcion),
  calculo: z.string().max(LIMITES.descripcion).optional(),
  fijado: z.boolean().optional(),
})

/** Un tiempo de comida en modo DIETA: lista plana de alimentos. */
export const tiempoDietaSchema = z.object({
  id: z.string().min(1).max(LIMITES.nombre),
  nombre: z.string().min(1).max(LIMITES.nombre),
  alimentos: z.array(alimentoSchema).max(LIMITES.alimentosPorTiempo),
  nota: z.string().max(LIMITES.nota).optional(),
})

/** Un tiempo en modo RECETARIO: varias opciones, cada una con sus alimentos. */
export const tiempoRecetarioSchema = z.object({
  id: z.string().min(1).max(LIMITES.nombre),
  nombre: z.string().min(1).max(LIMITES.nombre),
  opciones: z
    .array(
      z.object({
        nombre: z.string().max(LIMITES.nombre),
        alimentos: z.array(alimentoSchema).max(LIMITES.alimentosPorTiempo),
        preparacion: z.string().max(LIMITES.preparacion).optional(),
      })
    )
    .max(LIMITES.opcionesPorTiempo),
})

export const contenidoDietaSchema = z.object({
  tiempos: z.array(tiempoDietaSchema).min(1, 'La dieta no tiene tiempos').max(LIMITES.tiempos),
})

export const contenidoRecetarioSchema = z.object({
  tiempos: z.array(tiempoRecetarioSchema).min(1, 'El recetario no tiene tiempos').max(LIMITES.tiempos),
})

export type ResultadoValidacion =
  | { ok: true }
  | { ok: false; error: string; detalles?: Record<string, string[] | undefined> }

/**
 * Comprueba que el contenido tenga la forma que corresponde a su modo.
 *
 * Se valida contra el esquema del modo declarado —y no se "adivina" el modo a
 * partir del contenido— a propósito: si llegan cruzados, lo correcto es
 * rechazar la petición, no elegir en silencio cuál de los dos manda. Guardar
 * con la etiqueta equivocada es justo lo que rompió la pantalla en producción.
 */
export function validarContenido(modo: 'DIETA' | 'RECETARIO', contenido: unknown): ResultadoValidacion {
  const esquema = modo === 'RECETARIO' ? contenidoRecetarioSchema : contenidoDietaSchema
  const parsed = esquema.safeParse(contenido)
  if (parsed.success) return { ok: true }

  // Mensaje distinto según el fallo sea de forma o de tamaño: al nutriólogo le
  // sirve saber si su dieta es demasiado grande o si el dato llegó cruzado.
  const otro = modo === 'RECETARIO' ? contenidoDietaSchema : contenidoRecetarioSchema
  if (otro.safeParse(contenido).success) {
    return {
      ok: false,
      error:
        modo === 'RECETARIO'
          ? 'El contenido tiene forma de dieta, pero se está guardando como recetario.'
          : 'El contenido tiene forma de recetario, pero se está guardando como dieta.',
    }
  }

  return {
    ok: false,
    error: 'El contenido de la dieta no tiene un formato válido.',
    detalles: parsed.error.flatten().fieldErrors,
  }
}
