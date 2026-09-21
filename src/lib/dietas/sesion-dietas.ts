/**
 * Dónde se quedó el nutriólogo, para devolverlo ahí.
 * ------------------------------------------------------------
 * El trabajo ya se guarda —el cuadro en la base de datos, el paso 1 en el
 * navegador— pero al volver a /dietas la pantalla arrancaba en blanco: había
 * que buscar otra vez al paciente y recorrer los pasos hasta el punto donde se
 * estaba. El dato estaba a salvo; el sitio, no.
 *
 * Esto recuerda el SITIO: qué paciente, qué paso, qué cuadro. No guarda ningún
 * contenido clínico —para eso están la base de datos y el borrador local—,
 * solo los identificadores necesarios para recomponer la pantalla.
 */

/** Los cuatro datos que sitúan al nutriólogo dentro de la sección. */
export interface SesionDietas {
  pacienteId: string
  pacienteNombre: string
  pacienteEmail?: string
  /** Paso del recorrido: 'cuadro' | 'grupos' | 'tiempos' | 'ia'. */
  paso: string
  /** Cuadro en curso, si ya se calculó. */
  cuadroId?: string | null
  /** Consulta a la que se ligó la dieta ('' = dieta suelta). */
  consultaId?: string
}

interface Envoltorio {
  sesion: SesionDietas
  guardadoEn: number
}

const CLAVE = 'dietas.sesion'

/**
 * Caduca en 12 horas.
 *
 * Retomar por la tarde lo de la mañana es útil; que el lunes se abra el
 * paciente del viernes, no: ahí el nutriólogo ya viene a otra cosa y la
 * pantalla debe estar limpia.
 */
const VIGENCIA_MS = 12 * 60 * 60 * 1000

/** Guarda dónde se está. Sin paciente no hay sitio que recordar. */
export function guardarSesion(sesion: SesionDietas): void {
  if (!sesion.pacienteId) return
  try {
    const envoltorio: Envoltorio = { sesion, guardadoEn: Date.now() }
    localStorage.setItem(CLAVE, JSON.stringify(envoltorio))
  } catch {
    // Ventana privada, cuota llena o permisos: es una comodidad, no puede
    // impedir trabajar.
  }
}

/** Devuelve la sesión si sigue vigente; `null` si no hay, caducó o está rota. */
export function leerSesion(): SesionDietas | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    if (!crudo) return null

    const envoltorio = JSON.parse(crudo) as Envoltorio
    const s = envoltorio?.sesion
    if (!s?.pacienteId || !s?.paso || typeof envoltorio.guardadoEn !== 'number') return null

    if (Date.now() - envoltorio.guardadoEn > VIGENCIA_MS) {
      localStorage.removeItem(CLAVE)
      return null
    }

    return s
  } catch {
    return null
  }
}

/**
 * Olvida dónde se estaba.
 *
 * Se llama al soltar al paciente a propósito: si el nutriólogo vuelve al
 * buscador es porque quiere empezar otra cosa, y devolverlo al de antes sería
 * pelearse con él.
 */
export function olvidarSesion(): void {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // Igual que arriba.
  }
}
