/**
 * Construye el DateTime de `proxima_cita` a partir de una fecha (YYYY-MM-DD)
 * y una hora opcional (HH:mm).
 *
 * - Si se proporciona hora: combina fecha + hora usando la misma convención que
 *   el sistema de citas (`new Date(y, m-1, d, h, min)`), es decir, en la zona
 *   horaria del servidor, para que sea consistente con cómo se crean y leen las
 *   citas reales (ver `/api/citas/publica`).
 * - Si NO se proporciona hora: se guarda como mediodía UTC (`T12:00:00.000Z`)
 *   para evitar desplazamiento de día por zona horaria, igual que antes.
 *
 * @returns Date construido, o null si no hay fecha.
 */
export function construirProximaCita(
  fecha: string | null | undefined,
  hora?: string | null
): Date | null {
  if (!fecha) return null

  if (hora) {
    const [year, month, day] = fecha.split('-').map(Number)
    const [hour, minute] = hora.split(':').map(Number)
    return new Date(year!, month! - 1, day!, hour!, minute!)
  }

  return new Date(`${fecha}T12:00:00.000Z`)
}

/**
 * Indica si un `proxima_cita` tiene hora específica (no es el mediodía-UTC por defecto).
 * Útil para decidir si mostrar/usar la hora en recordatorios.
 *
 * El valor "sin hora" se guarda SIEMPRE como `T12:00:00.000Z` (mediodía UTC),
 * por eso la detección compara contra UTC. Cuando SÍ hay hora, se guardó con
 * `new Date(y, m-1, d, h, min)` (hora local del servidor) — ese caso casi nunca
 * cae exactamente en 12:00:00.000Z, así que la comparación funciona.
 */
export function proximaCitaTieneHora(fecha: Date): boolean {
  return !(
    fecha.getUTCHours() === 12 &&
    fecha.getUTCMinutes() === 0 &&
    fecha.getUTCSeconds() === 0 &&
    fecha.getUTCMilliseconds() === 0
  )
}

/**
 * Extrae la hora de un `proxima_cita` en formato "HH:mm", usando la MISMA
 * convención con la que se guardó en `construirProximaCita` (hora local del
 * servidor vía `new Date(y, m-1, d, h, min)`).
 *
 * Por eso se leen `getHours()/getMinutes()` (hora local), NO los `getUTC*`.
 * Devuelve '' si la cita no tiene hora específica.
 */
export function extraerHoraProximaCita(fecha: Date): string {
  if (!proximaCitaTieneHora(fecha)) return ''
  const hh = String(fecha.getHours()).padStart(2, '0')
  const mm = String(fecha.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
