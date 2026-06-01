/**
 * Zona horaria del consultorio. CDMX es UTC-6 fijo (México abolió el horario
 * de verano en 2022), por eso el offset constante es seguro.
 */
export const TZ_MX = 'America/Mexico_City'
const OFFSET_MX_HORAS = 6 // UTC-6

/**
 * Construye un Date que representa una fecha+hora EN HORA DE MÉXICO,
 * independientemente de la zona horaria del servidor (prod corre en Berlin).
 *
 * Ej: ('2026-06-10', '16:00') → 16:00 México = 22:00 UTC → Date(2026-06-10T22:00:00Z).
 */
export function construirFechaHoraMexico(fecha: string, hora: string): Date {
  const [year, month, day] = fecha.split('-').map(Number)
  const [hour, minute] = hora.split(':').map(Number)
  return new Date(Date.UTC(year!, month! - 1, day!, hour! + OFFSET_MX_HORAS, minute!, 0))
}

/**
 * Construye el DateTime de `proxima_cita` a partir de una fecha (YYYY-MM-DD)
 * y una hora opcional (HH:mm).
 *
 * - Si se proporciona hora: combina fecha + hora interpretadas SIEMPRE como
 *   hora de México (no depende del TZ del servidor), vía `construirFechaHoraMexico`.
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
    return construirFechaHoraMexico(fecha, hora)
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
 * Extrae la hora "HH:mm" (24h) de cualquier Date, SIEMPRE en hora de México,
 * sin importar la zona horaria del servidor. Usa Intl.DateTimeFormat.
 */
export function horaEnMexico(fecha: Date): string {
  const p = new Intl.DateTimeFormat('es-MX', {
    timeZone: TZ_MX,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(fecha)
  const hh = p.find((x) => x.type === 'hour')?.value ?? '00'
  const mm = p.find((x) => x.type === 'minute')?.value ?? '00'
  // Intl puede devolver "24" para medianoche en algunos entornos; normalizar.
  return `${hh === '24' ? '00' : hh}:${mm}`
}

/**
 * Extrae la hora de un `proxima_cita` en formato "HH:mm" (hora de México).
 * Devuelve '' si la cita no tiene hora específica.
 */
export function extraerHoraProximaCita(fecha: Date): string {
  if (!proximaCitaTieneHora(fecha)) return ''
  return horaEnMexico(fecha)
}
