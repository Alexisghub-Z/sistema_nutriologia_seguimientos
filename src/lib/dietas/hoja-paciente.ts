/**
 * Qué lleva la hoja del paciente, y qué se puede elegir mostrar.
 * ------------------------------------------------------------
 * Vive aparte del PDF y del Word a propósito. Antes estos tipos estaban dentro
 * de `documento-dieta.tsx`, junto al componente de @react-pdf: cualquiera que
 * quisiera solo la forma de los datos —el generador de Word, una prueba— se
 * arrastraba todo el JSX y el motor de PDF con ellos.
 *
 * Aquí no hay JSX ni dependencias de render: solo la definición de la hoja.
 * Los dos formatos la importan y así no pueden separarse con el tiempo; si
 * mañana se añade una opción, ambos la ven.
 */

/** Un alimento tal y como se imprime: ya viene descrito, sin cálculos. */
export interface AlimentoImpreso {
  descripcion: string
}

/**
 * Una opción de platillo en un recetario: el paciente elige UNA de ellas.
 * Lleva sus propios ingredientes y su preparación, que es lo que la convierte
 * en algo cocinable y no en una lista de compra.
 */
export interface OpcionImpresa {
  nombre: string
  alimentos: AlimentoImpreso[]
  preparacion?: string
}

export interface TiempoImpreso {
  nombre: string
  /** Dieta precisa: los alimentos de ese tiempo, sin alternativas. */
  alimentos?: AlimentoImpreso[]
  /** Recetario: varias opciones entre las que elegir. */
  opciones?: OpcionImpresa[]
  nota?: string
  /** Aporte del tiempo; solo se pinta si se pidió mostrarlo. */
  kcal?: number
}

/**
 * Qué se incluye en la hoja. Cada opción es una decisión clínica, no un
 * adorno: un paciente que empieza necesita saber qué comer y poco más,
 * mientras que uno que ya maneja el sistema aprovecha las cifras.
 */
export interface OpcionesDocumento {
  indicaciones: boolean
  datosConsulta: boolean
  metaCalorica: boolean
  macros: boolean
  kcalPorTiempo: boolean
  restricciones: boolean
  notasTiempo: boolean
  preparacion: boolean
  espacioNotas: boolean
}

export const OPCIONES_POR_DEFECTO: OpcionesDocumento = {
  // Qué comer, cómo empezar, y de dónde sale el plan: el peso y la fecha de
  // la consulta anclan la hoja a un momento concreto del tratamiento, que es
  // lo que permite comparar cuando el paciente vuelve.
  indicaciones: true,
  datosConsulta: true,
  metaCalorica: true,
  macros: false,
  kcalPorTiempo: false,
  restricciones: false,
  notasTiempo: true,
  // La preparación viene con el platillo: sin ella el recetario es una lista
  // de ingredientes que nadie sabe cocinar.
  preparacion: true,
  espacioNotas: false,
}

export interface DatosDocumento {
  paciente: string
  fecha: string
  tiempos: TiempoImpreso[]
  indicacionesInicio?: string
  /** Meta diaria, si se decide mostrarla. */
  kcalMeta?: number
  macros?: { proteina: number; grasa: number; carbohidrato: number }
  /** Alergias e intolerancias, para que queden por escrito. */
  restricciones?: string[]
  /** Medidas de la consulta en que se hizo el plan. */
  consulta?: {
    peso?: number
    talla?: number
    imc?: number
    clasificacionImc?: string
    pesoIdeal?: number
    objetivo?: string
  }
}

/**
 * Nombre del archivo que se descarga.
 *
 * Lleva paciente, fecha Y HORA. La fecha sola no bastaba: al corregir algo y
 * volver a descargar el mismo día, los dos archivos se llamaban igual y el
 * navegador guardaba el segundo como "plan-ana (1).pdf". Con la hora, cada
 * descarga tiene nombre propio y quedan ordenadas cronológicamente en la
 * carpeta.
 *
 * Se usa la hora LOCAL y no `toISOString()`, que da UTC: el servidor de
 * producción corre en Europa, y un plan descargado a las 14:30 en México se
 * habría guardado como "2230". El nombre lo lee una persona, no una máquina.
 *
 * Compartido entre PDF y Word para que ambos nombren igual.
 */
export function nombreDeArchivo(paciente: string, extension: 'pdf' | 'docx', fecha = new Date()): string {
  const limpio = paciente
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const dosDigitos = (n: number) => String(n).padStart(2, '0')
  const marca = [
    fecha.getFullYear(),
    dosDigitos(fecha.getMonth() + 1),
    dosDigitos(fecha.getDate()),
  ].join('-')
  const hora = `${dosDigitos(fecha.getHours())}${dosDigitos(fecha.getMinutes())}`

  return `plan-${limpio || 'paciente'}-${marca}-${hora}.${extension}`
}
