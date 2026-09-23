/**
 * El paso 1 del cuadro, a salvo en el navegador.
 * ------------------------------------------------------------
 * El cuadro se persiste en la base de datos al pulsar "Calcular", y a partir
 * de ahí el autoguardado se encarga. Pero antes de ese momento no existe nada
 * que actualizar: quien escribía peso, talla y edad y salía de la pantalla lo
 * perdía sin remedio.
 *
 * Guardarlo en el servidor obligaría a crear cuadros a medias —sin cálculos,
 * sin validar— que ensuciarían el historial del paciente con tanteos que el
 * nutriólogo nunca quiso conservar. El navegador es el sitio correcto para un
 * dato que todavía no es un cuadro.
 *
 * Limitación asumida: vive en ese equipo y ese navegador. Para unos campos a
 * medio escribir es suficiente; en cuanto se calcula, manda la base de datos.
 */

/** Los campos del paso 1 que merece la pena conservar. */
export interface BorradorCuadro {
  peso?: string
  talla_cm?: string
  edad?: string
  sexo?: string
  nivel_actividad?: string
  objetivo?: string
  formula?: string
  mlg_kg?: string
  notas?: string
}

/** Guardado en el momento, para poder descartar lo viejo. */
interface Envoltorio {
  datos: BorradorCuadro
  guardadoEn: number
}

/**
 * Los borradores caducan a los 7 días.
 *
 * Sin caducidad, abrir un paciente medio año después resucitaría un peso viejo
 * sobre el formulario vacío, y eso es peor que no guardar nada: un dato
 * clínico desactualizado que parece actual.
 */
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000

/** Una clave por paciente: los datos de uno no deben salir en el otro. */
function clave(pacienteId: string): string {
  return `dietas.borradorCuadro.${pacienteId}`
}

/** ¿Hay algo escrito de verdad? Un campo con espacios no cuenta. */
export function tieneAlgo(datos: BorradorCuadro): boolean {
  return Object.values(datos).some((v) => typeof v === 'string' && v.trim().length > 0)
}

/**
 * Guarda el borrador. Si no hay nada escrito, lo borra en lugar de dejar un
 * objeto vacío ocupando sitio.
 */
export function guardarBorrador(pacienteId: string, datos: BorradorCuadro): void {
  if (!pacienteId) return
  try {
    if (!tieneAlgo(datos)) {
      localStorage.removeItem(clave(pacienteId))
      return
    }
    const envoltorio: Envoltorio = { datos, guardadoEn: Date.now() }
    localStorage.setItem(clave(pacienteId), JSON.stringify(envoltorio))
  } catch {
    // localStorage puede fallar (ventana privada, cuota llena, permisos).
    // Se ignora: es una comodidad, no puede tumbar la pantalla.
  }
}

/**
 * Recupera el borrador si sigue vigente. Devuelve `null` si no hay, si caducó
 * o si lo guardado no se puede leer.
 */
export function leerBorrador(pacienteId: string): BorradorCuadro | null {
  if (!pacienteId) return null
  try {
    const crudo = localStorage.getItem(clave(pacienteId))
    if (!crudo) return null

    const envoltorio = JSON.parse(crudo) as Envoltorio
    if (!envoltorio?.datos || typeof envoltorio.guardadoEn !== 'number') return null

    if (Date.now() - envoltorio.guardadoEn > VIGENCIA_MS) {
      localStorage.removeItem(clave(pacienteId))
      return null
    }

    return envoltorio.datos
  } catch {
    return null
  }
}

/**
 * Borra el borrador de un paciente.
 *
 * Se llama al calcular: desde ese momento el cuadro está en la base de datos y
 * mantener una copia en el navegador solo puede llevar a mostrar datos viejos.
 */
export function olvidarBorrador(pacienteId: string): void {
  if (!pacienteId) return
  try {
    localStorage.removeItem(clave(pacienteId))
  } catch {
    // Igual que arriba: si falla, no pasa nada grave.
  }
}
