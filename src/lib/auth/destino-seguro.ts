/**
 * A dónde devolver al usuario después de identificarse.
 * ------------------------------------------------------------
 * Vive aquí y no en `login/page.tsx` porque un archivo de página de Next solo
 * puede exportar lo que el framework espera (`default`, `metadata`, …): al
 * añadirle un export propio, el build falla con TS2344.
 *
 * Estar suelto tiene además la ventaja de poder probarse sin montar la página.
 */

/** A dónde ir si no se pidió nada concreto. */
export const DESTINO_POR_DEFECTO = '/dashboard'

/**
 * Valida la ruta de retorno.
 *
 * El middleware añade `?callbackUrl=` con la página que se intentó abrir sin
 * sesión, y ese valor viaja en la URL: lo controla quien mande el enlace. Si se
 * usara tal cual, bastaría `?callbackUrl=https://sitio-falso/` para que nuestro
 * propio login mandara al nutriólogo a una copia de esta pantalla y le robara
 * la contraseña.
 *
 * Por eso solo se acepta una ruta interna: una sola barra al principio. Se
 * rechaza `//otro-dominio`, que el navegador interpreta como enlace externo, y
 * `/\otro-dominio`, que algunos normalizan a lo mismo.
 */
export function destinoSeguro(callbackUrl: string | null | undefined): string {
  if (!callbackUrl) return DESTINO_POR_DEFECTO
  if (!callbackUrl.startsWith('/')) return DESTINO_POR_DEFECTO
  if (callbackUrl.startsWith('//')) return DESTINO_POR_DEFECTO
  if (callbackUrl.startsWith('/\\')) return DESTINO_POR_DEFECTO
  // Volver al propio login dejaría al usuario dando vueltas.
  if (callbackUrl === '/login' || callbackUrl.startsWith('/login?')) return DESTINO_POR_DEFECTO
  return callbackUrl
}
