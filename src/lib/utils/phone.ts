/**
 * Utilidades para manejo de números telefónicos mexicanos
 * Formato E.164: +521 [10 dígitos]
 */

/**
 * Normaliza un número de teléfono mexicano al formato E.164
 *
 * @param telefono - Número de teléfono en cualquier formato
 * @returns Número normalizado en formato +5219515886761
 * @throws Error si el número no tiene 10 dígitos
 *
 * @example
 * normalizarTelefonoMexico("9515886761")        // "+5219515886761"
 * normalizarTelefonoMexico("951 588 6761")      // "+5219515886761"
 * normalizarTelefonoMexico("951-588-6761")      // "+5219515886761"
 * normalizarTelefonoMexico("+5219515886761")    // "+5219515886761"
 */
export function normalizarTelefonoMexico(telefono: string): string {
  // Limpiar el número: remover espacios, guiones, paréntesis
  let cleaned = telefono.replace(/[\s\-()]/g, '')

  // Remover el símbolo + si existe
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }

  // Remover prefijos de país si ya los tiene
  if (cleaned.startsWith('521') && cleaned.length === 13) {
    // Ya tiene +521 y 10 dígitos
    return '+' + cleaned
  }

  if (cleaned.startsWith('52') && cleaned.length === 12) {
    // Tiene +52 sin el 1
    cleaned = cleaned.substring(2)
  } else if (cleaned.startsWith('521') && cleaned.length > 13) {
    // Tiene +521 con dígitos extras
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('52') && cleaned.length > 12) {
    // Tiene +52 con dígitos extras
    cleaned = cleaned.substring(2)
  }

  // Validar que tenga exactamente 10 dígitos
  if (!/^\d{10}$/.test(cleaned)) {
    throw new Error(
      `El teléfono debe tener exactamente 10 dígitos. Se recibió: ${cleaned} (${cleaned.length} dígitos)`
    )
  }

  // Agregar +521 (código México + 1 para celular)
  return `+521${cleaned}`
}

/**
 * Formatea un teléfono para mostrar en la UI de forma amigable
 *
 * @param telefono - Número en formato E.164 (+5219515886761)
 * @returns Número formateado para lectura (951 588 6761)
 *
 * @example
 * formatearTelefonoMexico("+5219515886761")  // "951 588 6761"
 * formatearTelefonoMexico("9515886761")      // "951 588 6761"
 */
export function formatearTelefonoMexico(telefono: string): string {
  // Limpiar el número: solo dígitos
  let cleaned = telefono.replace(/\D/g, '')

  // Si empieza con 521 y tiene 13 dígitos, quitar el prefijo
  if (cleaned.startsWith('521') && cleaned.length === 13) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('52') && cleaned.length === 12) {
    cleaned = cleaned.substring(2)
  }

  // Formatear: XXX XXX XXXX
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`
  }

  // Si no es formato esperado, devolver tal cual
  return telefono
}

/**
 * Valida que un string sea un número de teléfono válido de 10 dígitos
 *
 * @param telefono - String a validar
 * @returns true si es válido, false si no
 *
 * @example
 * validarTelefonoMexico("9515886761")     // true
 * validarTelefonoMexico("951588676")      // false (9 dígitos)
 * validarTelefonoMexico("951588676123")   // false (12 dígitos)
 * validarTelefonoMexico("abc1234567")     // false (no numérico)
 */
export function validarTelefonoMexico(telefono: string): boolean {
  // Limpiar el número
  const cleaned = telefono.replace(/[\s\-()]/g, '')

  // Debe tener exactamente 10 dígitos
  return /^\d{10}$/.test(cleaned)
}

/**
 * Extrae solo los 10 dígitos del teléfono (sin código de país)
 *
 * @param telefono - Número en cualquier formato
 * @returns Los 10 dígitos del número
 *
 * @example
 * extraerDigitosTelefono("+5219515886761")  // "9515886761"
 * extraerDigitosTelefono("951 588 6761")    // "9515886761"
 */
export function extraerDigitosTelefono(telefono: string): string {
  // Limpiar
  let cleaned = telefono.replace(/\D/g, '')

  // Remover prefijos
  if (cleaned.startsWith('521') && cleaned.length === 13) {
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('52') && cleaned.length === 12) {
    cleaned = cleaned.substring(2)
  }

  return cleaned.substring(0, 10)
}
