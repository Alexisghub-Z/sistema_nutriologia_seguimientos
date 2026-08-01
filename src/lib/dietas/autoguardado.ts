/**
 * Autoguardado de la dieta: piezas puras.
 * ------------------------------------------------------------
 * La dieta generada por la IA se persiste sola, sin que el nutriólogo pulse
 * nada: antes se perdía todo el trabajo al salir de la pantalla.
 *
 * Aquí vive lo que se puede razonar sin React —la firma del contenido y el texto
 * del indicador— para poder probarlo de verdad. La orquestación (debounce,
 * cerrojo de concurrencia, peticiones) se queda en el componente.
 */

/** En qué punto del ciclo de autoguardado estamos. */
export type EstadoAutoguardado =
  | 'inactivo' // aún no hay nada que guardar, o el autoguardado no aplica
  | 'pendiente' // hay cambios y el temporizador corre
  | 'guardando' // petición en vuelo
  | 'guardado' // persistido como borrador
  | 'error' // falló; se reintentará al siguiente cambio

/** Contenido mínimo que identifica una versión de la dieta. */
export interface ContenidoAutoguardado {
  modo: 'DIETA' | 'RECETARIO'
  tiempos: unknown[]
  indicacionesInicio?: string
}

/**
 * Huella del contenido, para no repetir un POST idéntico.
 *
 * Sirve sobre todo tras deshacer/rehacer y al cargar un cuadro del historial:
 * en ambos casos el contenido llega "nuevo" a React pero ya está en la base de
 * datos. Comparar firmas evita escribir lo mismo una y otra vez.
 */
export function firmaContenido(contenido: ContenidoAutoguardado): string {
  return JSON.stringify({
    m: contenido.modo,
    t: contenido.tiempos,
    i: contenido.indicacionesInicio ?? '',
  })
}

/** Tono visual del indicador; el componente lo traduce a una clase CSS. */
export type TonoAutoguardado = 'ok' | 'pendiente' | 'trabajando' | 'error' | 'definitiva'

export interface TextoAutoguardado {
  texto: string
  tono: TonoAutoguardado
}

/**
 * Hora corta (14:32). En 24h explícito: `es-MX` daría "02:32 p.m.", más largo y
 * ambiguo de un vistazo para un indicador tan pequeño.
 */
function formatearHora(fecha: Date): string {
  return fecha.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Qué decirle al nutriólogo sobre el estado de su trabajo.
 *
 * Decisión de diseño: cuando está guardado se muestra la HORA. Un "guardado" a
 * secas no se cree; un "guardado a las 14:32" sí, y es lo que permite salir de
 * la pantalla con tranquilidad.
 *
 * `hayContenido` distingue "todavía no hay dieta" (no mostramos nada) de "hay
 * dieta sin guardar", que sí merece aviso.
 */
export function textoAutoguardado(
  estado: EstadoAutoguardado,
  guardadoEn: Date | null,
  soloLectura: boolean,
  hayContenido: boolean
): TextoAutoguardado | null {
  // Una dieta finalizada es la versión definitiva: manda sobre cualquier otro
  // estado de autoguardado.
  if (soloLectura) return { texto: 'Guardada', tono: 'definitiva' }
  if (!hayContenido) return null

  switch (estado) {
    case 'guardando':
      return { texto: 'Guardando…', tono: 'trabajando' }
    case 'guardado':
      return {
        texto: guardadoEn
          ? `Borrador guardado · ${formatearHora(guardadoEn)}`
          : 'Borrador guardado',
        tono: 'ok',
      }
    case 'error':
      return { texto: 'Sin guardar', tono: 'error' }
    case 'pendiente':
      // Si ya hubo un guardado previo, seguimos mostrándolo: el trabajo está a
      // salvo aunque el último retoque esté en camino. Decir "sin guardar" aquí
      // asustaría sin motivo.
      return guardadoEn
        ? { texto: `Borrador guardado · ${formatearHora(guardadoEn)}`, tono: 'ok' }
        : { texto: 'Cambios sin guardar', tono: 'pendiente' }
    case 'inactivo':
      return guardadoEn
        ? { texto: `Borrador guardado · ${formatearHora(guardadoEn)}`, tono: 'ok' }
        : { texto: 'Borrador', tono: 'pendiente' }
  }
}
