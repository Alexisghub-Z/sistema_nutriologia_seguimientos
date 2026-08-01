/**
 * Cola de toasts: qué se ve y qué se descarta.
 * ------------------------------------------------------------
 * Vive fuera del componente para poder probarlo sin montar React. Es la única
 * parte con reglas propias; el resto del toast es presentación.
 */

/** Cuántos toasts caben a la vez en pantalla. */
export const MAX_VISIBLES = 3

/**
 * Añade un elemento respetando el tope.
 *
 * Cuando se llena, se van los MÁS VIEJOS: el aviso recién llegado suele
 * corresponder a lo que el usuario acaba de hacer, así que es el más relevante.
 *
 * Devuelve también los descartados para que quien llame pueda cancelar sus
 * temporizadores y no dejarlos corriendo.
 */
export function encolar<T>(
  actuales: T[],
  nuevo: T,
  max: number = MAX_VISIBLES
): { visibles: T[]; descartados: T[] } {
  const todos = [...actuales, nuevo]
  if (todos.length <= max) {
    return { visibles: todos, descartados: [] }
  }
  const corte = todos.length - max
  return { visibles: todos.slice(corte), descartados: todos.slice(0, corte) }
}
