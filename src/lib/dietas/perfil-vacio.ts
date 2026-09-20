/**
 * ¿Sabe la IA cómo hace sus dietas este nutriólogo?
 * ------------------------------------------------------------
 * El perfil de estilo (Configuración → Estilo de mis dietas) alimenta el prompt
 * de la IA: región, alimentos que usa, reglas propias, tono… Cuando está vacío
 * el generador no falla, pero cae en un modo genérico —alimentos básicos, sin
 * cocina nacional concreta— para no suponer un país que no sabe.
 *
 * El problema es que ese modo es INVISIBLE: la dieta sale, parece correcta, y
 * nada indica que se hizo sin conocer el estilo del nutriólogo. Quien no sepa
 * que el formulario existe puede pasarse meses corrigiendo a mano dietas que
 * habrían salido a su gusto rellenándolo una sola vez.
 *
 * Esto detecta ese caso para poder avisarlo antes de generar.
 */

/** Los campos del perfil que la IA usa para imitar el estilo del nutriólogo. */
export interface PerfilParaAviso {
  region?: string | null
  alimentos_tipicos?: string | null
  alimentos_evitar?: string | null
  estructura_notas?: string | null
  reglas_propias?: string | null
  tono?: string | null
  instrucciones_libres?: string | null
  indicaciones_inicio?: string | null
}

/**
 * Los campos, en el orden en que más le aportan a la IA.
 *
 * `region` y `alimentos_tipicos` van primero porque son los que deciden si la
 * dieta suena de su tierra o a recetario genérico: son los dos que el propio
 * generador comprueba para entrar en modo neutro.
 */
const CAMPOS: Array<keyof PerfilParaAviso> = [
  'region',
  'alimentos_tipicos',
  'alimentos_evitar',
  'estructura_notas',
  'reglas_propias',
  'tono',
  'instrucciones_libres',
  'indicaciones_inicio',
]

/** ¿Tiene contenido de verdad? Un campo con espacios está vacío. */
function tieneContenido(valor: string | null | undefined): boolean {
  return typeof valor === 'string' && valor.trim().length > 0
}

/**
 * ¿Está el perfil completamente vacío?
 *
 * Se exige que NO haya ni un solo campo con contenido. Basta con que el
 * nutriólogo haya escrito algo —aunque sea solo el tono— para no darle la
 * lata: ya sabe que el formulario existe, y decidir por él que "eso no es
 * suficiente" sería paternalista.
 *
 * Acepta `null` porque el endpoint crea el perfil vacío la primera vez, y
 * `undefined` porque el cliente puede no haberlo cargado todavía; en ambos
 * casos la respuesta honesta es "no hay estilo definido".
 */
export function perfilEstaVacio(perfil: PerfilParaAviso | null | undefined): boolean {
  if (!perfil) return true
  return !CAMPOS.some((campo) => tieneContenido(perfil[campo]))
}

/**
 * Cuántos campos tienen contenido. Para poder decir "3 de 8" en la interfaz
 * sin que cada pantalla recuente por su cuenta.
 */
export function camposRellenos(perfil: PerfilParaAviso | null | undefined): number {
  if (!perfil) return 0
  return CAMPOS.filter((campo) => tieneContenido(perfil[campo])).length
}

/** Total de campos del perfil, para mostrar el denominador. */
export const TOTAL_CAMPOS_PERFIL = CAMPOS.length
