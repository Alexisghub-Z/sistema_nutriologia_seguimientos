/**
 * Un mensaje de error que dice la verdad sobre qué ha fallado.
 * ------------------------------------------------------------
 * Por el proyecto había 26 `catch` que ponían "Error de conexión" pasara lo que
 * pasara. El problema es que un `catch` alrededor de un `fetch` no solo atrapa
 * fallos de red: también un JSON mal formado, un `TypeError` del propio código
 * o un error lanzado a mano. Decirle "Error de conexión" al nutriólogo cuando
 * su internet funciona perfectamente lo manda a revisar su wifi mientras el
 * fallo real —nuestro— queda escondido.
 *
 * Aquí se separan tres situaciones que al usuario le piden cosas distintas:
 *
 *   1. No hay internet         → que revise su conexión; su trabajo se reanuda.
 *   2. El servidor no responde → que espere y reintente; no es culpa suya.
 *   3. Cualquier otra cosa     → algo va mal en la aplicación; que avise.
 *
 * La barra de AvisoSinConexion ya cubre el caso 1 de forma global; esto da el
 * detalle en el sitio concreto donde la acción ha fallado.
 */

/**
 * ¿Es este error un fallo de red de verdad?
 *
 * `fetch` rechaza con un `TypeError` cuando no logra siquiera hablar con el
 * servidor. El texto del mensaje cambia según el navegador ("Failed to fetch"
 * en Chrome, "NetworkError..." en Firefox, "Load failed" en Safari), así que se
 * comprueban los tres además del tipo.
 */
export function esFalloDeRed(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  // Petición cancelada a propósito (AbortController): no es un fallo de red.
  if (error.name === 'AbortError') return false

  const texto = error.message.toLowerCase()
  return (
    error.name === 'TypeError' &&
    (texto.includes('fetch') ||
      texto.includes('network') ||
      texto.includes('load failed') ||
      texto.includes('conexión'))
  )
}

/** ¿Está el dispositivo sin internet ahora mismo? */
function sinInternet(): boolean {
  // `navigator` no existe al renderizar en el servidor.
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/**
 * El mensaje que se le enseña al usuario.
 *
 * `accion` describe lo que se estaba intentando, en infinitivo y sin artículo
 * ("guardar la dieta", "cargar el cuadro"). Se incluye para que el aviso diga
 * qué se ha perdido: "no se pudo guardar la dieta" es accionable, "error" no.
 */
export function mensajeDeError(error: unknown, accion?: string): string {
  const queHacia = accion ? ` al ${accion}` : ''

  if (sinInternet()) {
    return `Sin conexión a internet${queHacia}. Revisa tu conexión; nada se ha perdido.`
  }

  if (esFalloDeRed(error)) {
    // Hay internet pero no se alcanzó el servidor: el usuario no puede hacer
    // nada salvo reintentar, y conviene que sepa que no es culpa suya.
    return `No se pudo conectar con el servidor${queHacia}. Inténtalo de nuevo en un momento.`
  }

  // Ni red ni servidor: es un fallo nuestro. No se enseña el mensaje técnico
  // —no le dice nada al nutriólogo— pero se pide que lo reporte, porque es la
  // única señal de que algo está roto.
  return `Ocurrió un error inesperado${queHacia}. Si vuelve a pasar, avísanos.`
}
