'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Button from '@/components/ui/Button'
import GenerandoIA from '@/components/dietas/GenerandoIA'
import ResumenDietas from '@/components/dietas/ResumenDietas'
import PanelAlternativas from '@/components/dietas/PanelAlternativas'
import { useToast } from '@/components/ui/Toast'
import { buscarAlergenos } from '@/lib/dietas/alergenos'
import {
  firmaContenido,
  textoAutoguardado,
  type EstadoAutoguardado,
  type ContenidoAutoguardado,
  type TonoAutoguardado,
} from '@/lib/dietas/autoguardado'
import { clasificarIMC } from '@/lib/utils/dietosintetico'
import {
  GRUPOS_SMAE,
  sumarEquivalentes,
  calcularDiferencia,
  cuadroDistribucion,
  resumenTiempo,
  validarDistribucion,
  distribuirEnTiemposAuto,
  calcularEquivalentesAuto,
  nutrientesDeAlimento,
  nivelCercania,
  TIEMPOS_DEFAULT,
  type Equivalentes,
  type GrupoSMAEId,
  type TiempoComida,
  type DistribucionTiempos,
} from '@/lib/utils/smae'
import styles from './dietas.module.css'

// Genera un id único simple para un tiempo de comida nuevo.
let contadorTiempo = 100
const nuevoIdTiempo = () => `t${++contadorTiempo}`

interface PacienteLite {
  id: string
  nombre: string
  email: string
}

/** Estado del ciclo de vida de una dieta (espejo del enum de Prisma). */
type EstadoDieta = 'BORRADOR' | 'FINALIZADA'
type ModoDietaAPI = 'DIETA' | 'RECETARIO'

/** Una dieta guardada tal como la devuelve la API. */
interface DietaGuardada {
  id: string
  modo: ModoDietaAPI
  estado: EstadoDieta
  finalizada_at: string | null
  contenido: { tiempos?: unknown[] } | null
  indicaciones_inicio: string | null
}

interface CuadroHistorial {
  id: string
  createdAt: string
  kcal_meta: number
  objetivo: string
  imc: number
  peso?: number
  etiqueta?: string | null
  // Estado de las dietas del cuadro, para marcar las definitivas.
  dietas?: { id: string; modo: ModoDietaAPI; estado: EstadoDieta }[]
}

/** Etiquetas legibles del objetivo de la dieta. */
const NOMBRE_OBJETIVO: Record<string, string> = {
  BAJAR_PESO: 'Bajar peso',
  MANTENER: 'Mantener',
  SUBIR_PESO: 'Subir peso',
}

/**
 * Icono según el tiempo de comida, deducido de su nombre. Ayuda a ubicarse sin
 * leer: sol para el desayuno, plato para las comidas fuertes, luna para la cena.
 */
function IconoTiempo({ nombre }: { nombre: string }) {
  const n = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

  if (/desayuno|almuerzo temprano/.test(n)) {
    // Sol
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
      </svg>
    )
  }
  if (/cena|noche/.test(n)) {
    // Luna
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
      </svg>
    )
  }
  if (/colacion|snack|refrigerio|merienda|entreno|tentempie/.test(n)) {
    // Manzana
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-3.5-2.5-8 0-8 5s3 8 5.5 8c1 0 1.5-.5 2.5-.5s1.5.5 2.5.5C17 21 20 18 20 13s-4.5-7.5-8-5z" />
        <path strokeLinecap="round" d="M12 8V5a3 3 0 013-3" />
      </svg>
    )
  }
  // Plato con cubiertos (comida y cualquier otro tiempo fuerte)
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M4 3v7a2 2 0 002 2h0a2 2 0 002-2V3M6 12v9M15 3c-1.5 0-2.5 1.5-2.5 3.5S13.5 10 15 10s2.5-1.5 2.5-3.5S16.5 3 15 3zM15 10v11" />
    </svg>
  )
}

/**
 * Color por familia de alimento, para distinguir de un vistazo qué es cada
 * cosa en la dieta. Se agrupa por función nutricional, no un color por grupo:
 * 17 colores serían un caos, 6 familias se leen bien.
 */
const COLOR_FAMILIA: Record<GrupoSMAEId, string> = {
  // Verduras y frutas: los vegetales
  VERDURAS: '#16a34a', // verde
  FRUTAS: '#ea580c', // naranja
  // Cereales y tubérculos: la energía
  CEREALES_SG: '#d97706', // ámbar
  CEREALES_CG: '#d97706',
  // Leguminosas: proteína vegetal
  LEGUMINOSAS: '#7c3aed', // violeta
  // Origen animal: la proteína
  AOA_MBAG: '#dc2626', // rojo
  AOA_BAG: '#dc2626',
  AOA_MAG: '#dc2626',
  AOA_AAG: '#dc2626',
  // Lácteos
  LECHE_DES: '#2563eb', // azul
  LECHE_SEMI: '#2563eb',
  LECHE_ENTERA: '#2563eb',
  LECHE_CA: '#2563eb',
  // Grasas y azúcares
  ACEITES_SP: '#ca8a04', // oro
  ACEITES_CP: '#ca8a04',
  AZUCAR_SG: '#db2777', // rosa
  AZUCAR_CG: '#db2777',
}

interface ConsultaLite {
  id: string
  fecha: string
  peso: number | null
  motivo: string | null
}

interface AlimentoUI {
  grupo: GrupoSMAEId
  equivalentes: number
  descripcion: string
  calculo?: string
  /** Fijado: la IA no debe tocarlo al regenerar ni al aplicar cambios. */
  fijado?: boolean
}

interface TiempoGeneradoUI {
  id: string
  nombre: string
  alimentos: AlimentoUI[]
  nota?: string
}


interface MensajeChat {
  rol: 'nutriologo' | 'ia'
  texto: string
}

interface OpcionUI {
  nombre: string
  alimentos: AlimentoUI[]
  preparacion?: string
}

interface TiempoRecetarioUI {
  id: string
  nombre: string
  opciones: OpcionUI[]
}

interface RecetarioUI {
  indicacionesInicio: string
  tiempos: TiempoRecetarioUI[]
  mensaje: string
}

/** Instantánea de lo editable, para poder deshacer. */
interface EstadoEditable {
  dieta: TiempoGeneradoUI[] | null
  recetario: RecetarioUI | null
}

/** Cuántos pasos atrás se recuerdan. */
const MAX_DESHACER = 20

/**
 * Calma antes de autoguardar. Suficiente para no disparar una petición por
 * tecla, y lo bastante corto para que salir de la pantalla sea seguro.
 */
const RETRASO_AUTOGUARDADO = 3000

/** Clase del indicador de guardado según su tono. */
const TONO_GUARDADO: Record<TonoAutoguardado, string> = {
  definitiva: styles.badgeDefinitiva!,
  ok: styles.badgeOk!,
  trabajando: styles.badgeTrabajando!,
  pendiente: styles.badgePendiente!,
  error: styles.badgeErrorGuardado!,
}

/**
 * Contexto que lee el autoguardado. Se mantiene en una ref para que la función
 * de guardado no dependa del estado y pueda ser estable entre renders.
 */
interface CtxGuardado {
  paciente: PacienteLite | null
  cuadroId: string | null
  dietaId: string | null
  soloLectura: boolean
  recetario: RecetarioUI | null
  dietaIA: TiempoGeneradoUI[] | null
  generando: boolean
  chateando: boolean
  finalizando: boolean
  /** Datos del cuadro para crearlo al vuelo si aún no está guardado. */
  payloadCuadro: Record<string, unknown> | null
}

interface MacroResultado {
  gramos: number
  kcal: number
  porcentaje: number
}

interface ResultadoCuadro {
  geb: number
  get: number
  kcalMeta: number
  imc: number
  clasificacionImc: string
  pesoIdeal: number
  macros: {
    proteina: MacroResultado
    grasa: MacroResultado
    carbohidrato: MacroResultado
    kcalTotal: number
  }
}

const ACTIVIDADES = [
  { valor: 'SEDENTARIO', label: 'Sedentario (poco o nada de ejercicio)' },
  { valor: 'LIGERO', label: 'Ligero (1-3 días/semana)' },
  { valor: 'MODERADO', label: 'Moderado (3-5 días/semana)' },
  { valor: 'ACTIVO', label: 'Activo (6-7 días/semana)' },
  { valor: 'MUY_ACTIVO', label: 'Muy activo (trabajo físico intenso)' },
]

const OBJETIVOS = [
  { valor: 'BAJAR_PESO', label: 'Bajar peso' },
  { valor: 'MANTENER', label: 'Mantener' },
  { valor: 'SUBIR_PESO', label: 'Subir peso' },
]

const FORMULAS = [
  { valor: 'MIFFLIN', label: 'Mifflin-St Jeor (recomendada)' },
  { valor: 'HARRIS', label: 'Harris-Benedict revisada' },
  { valor: 'KATCH', label: 'Katch-McArdle (requiere MLG)' },
  { valor: 'CUNNINGHAM', label: 'Cunningham (requiere MLG)' },
]

// Fórmulas que necesitan la masa libre de grasa (MLG).
const FORMULAS_MLG = ['KATCH', 'CUNNINGHAM']

const FORM_INICIAL = {
  peso: '',
  talla_cm: '',
  edad: '',
  sexo: 'MASCULINO',
  nivel_actividad: 'MODERADO',
  objetivo: 'BAJAR_PESO',
  formula: 'MIFFLIN',
  mlg_kg: '',
  notas: '',
}

// Distribución calórica por defecto (% de HCO / lípidos / proteína).
const PCT_DEFAULT = { hco: 50, lip: 25, pro: 25 }

/** Cuadros por página en el historial. */
const POR_PAGINA = 6

// Mapa id de grupo SMAE → nombre legible (para mostrar en la dieta de IA).
const NOMBRE_GRUPO = Object.fromEntries(GRUPOS_SMAE.map((g) => [g.id, g.nombre])) as Record<
  GrupoSMAEId,
  string
>

export default function DietasPage() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<PacienteLite[]>([])
  const [paciente, setPaciente] = useState<PacienteLite | null>(null)
  const [form, setForm] = useState({ ...FORM_INICIAL })
  const [resultado, setResultado] = useState<ResultadoCuadro | null>(null)
  const [equivalentes, setEquivalentes] = useState<Equivalentes>({})
  // Distribución calórica editable (% de HCO / lípidos / proteína).
  const [pct, setPct] = useState({ ...PCT_DEFAULT })
  // Kcal meta editable: null = usa la calculada; string = valor manual.
  const [kcalOverride, setKcalOverride] = useState<string | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chatRef = useRef<HTMLDivElement | null>(null)

  // Paso entre porciones de los sliders de equivalentes (0.25 / 0.5 / 1).
  const [pasoEquiv, setPasoEquiv] = useState(0.5)
  // Pestaña activa: 'cuadro' (dietosintético) | 'tiempos' (distribución) | 'ia' (generar).
  const [pestana, setPestana] = useState<'cuadro' | 'tiempos' | 'ia'>('cuadro')
  // Tiempos de comida y su reparto de equivalentes.
  const [tiempos, setTiempos] = useState<TiempoComida[]>(() =>
    TIEMPOS_DEFAULT.map((t) => ({ ...t }))
  )
  const [reparto, setReparto] = useState<DistribucionTiempos>({})
  // Semilla de variación: cada clic en "Proponer distribución" la incrementa
  // para obtener una propuesta distinta pero igualmente válida.
  const [variacionDist, setVariacionDist] = useState(0)
  // Semilla de variación para la propuesta de equivalentes por grupo (pestaña
  // cuadro): cada clic ofrece una dieta balanceada distinta.
  const [variacionEquiv, setVariacionEquiv] = useState(0)

  // Historial de cuadros guardados del paciente.
  const [historial, setHistorial] = useState<CuadroHistorial[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  // Consultas del paciente + consulta en la que se basa la dieta (opcional).
  const [consultas, setConsultas] = useState<ConsultaLite[]>([])
  const [consultaId, setConsultaId] = useState<string>('') // '' = dieta suelta

  // Modal de confirmación antes de guardar.
  const [confirmando, setConfirmando] = useState(false)
  const [noVolverAvisar, setNoVolverAvisar] = useState(false)

  // Generación con IA (pestaña 3).
  const [dietaIA, setDietaIA] = useState<TiempoGeneradoUI[] | null>(null)
  const [mensajesIA, setMensajesIA] = useState<MensajeChat[]>([])
  const [generando, setGenerando] = useState(false)
  const [inputChat, setInputChat] = useState('')
  // Modo de generación: 'dieta' (una precisa) | 'recetario' (varias opciones).
  const [modoIA, setModoIA] = useState<'dieta' | 'recetario'>('dieta')
  const [recetario, setRecetario] = useState<RecetarioUI | null>(null)
  // Chat conversacional (copiloto): true mientras la IA escribe su respuesta.
  const [chateando, setChateando] = useState(false)
  // true mientras la IA aplica un cambio a la dieta/recetario (animación).
  const [aplicandoCambio, setAplicandoCambio] = useState(false)
  // Claves de los elementos (alimentos/opciones) que la IA acaba de cambiar,
  // para resaltarlos brevemente. Ej: "t1|0" (tiempo t1, alimento índice 0).
  const [elementosCambiados, setElementosCambiados] = useState<Set<string>>(new Set())

  // --- Persistencia y cierre de la dieta ---
  // Cuadro ya guardado sobre el que estamos trabajando (null = aún sin guardar).
  const [cuadroId, setCuadroId] = useState<string | null>(null)
  // Dieta guardada que se está viendo, y su estado.
  const [dietaId, setDietaId] = useState<string | null>(null)
  const [estadoDieta, setEstadoDieta] = useState<EstadoDieta | null>(null)
  const [finalizando, setFinalizando] = useState(false)
  const [confirmandoFinalizar, setConfirmandoFinalizar] = useState(false)

  // --- Autoguardado ---
  // La dieta se persiste sola: antes, salir de la pantalla sin pulsar "Guardar
  // dieta" perdía todo el trabajo.
  const [estadoAutoguardado, setEstadoAutoguardado] = useState<EstadoAutoguardado>('inactivo')
  const [guardadoEn, setGuardadoEn] = useState<Date | null>(null)
  // Temporizador del retardo, para poder cancelarlo al cambiar de contexto.
  const temporizadorAutoguardado = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Petición en vuelo. Es un ref y no estado porque se lee y escribe de forma
  // síncrona: con useState habría una ventana en la que dos llamadas leen
  // `false` y ambas crean un cuadro.
  const autoguardadoEnCurso = useRef(false)
  // Llegó un cambio mientras guardábamos: al terminar se reintenta.
  const autoguardadoPendiente = useRef(false)
  // Tras un 409 (el cuadro ya tiene versión definitiva) dejamos de insistir.
  const autoguardadoBloqueado = useRef(false)
  // Huella de lo último persistido, para no repetir un POST idéntico.
  const firmaGuardada = useRef<string | null>(null)
  // Ya avisamos de que el guardado falla: no repetirlo en cada reintento.
  const avisadoFalloGuardado = useRef(false)
  // Todo lo que necesita el autoguardado, refrescado en cada render por un
  // efecto más abajo. Con esto `autoguardar` puede tener dependencias vacías: si
  // dependiera del estado se recrearía en cada tecla y reprogramaría el retardo
  // sin parar.
  const ctxGuardado = useRef<CtxGuardado>({
    paciente: null,
    cuadroId: null,
    dietaId: null,
    soloLectura: false,
    recetario: null,
    dietaIA: null,
    generando: false,
    chateando: false,
    finalizando: false,
    payloadCuadro: null,
  })

  // --- Historial de cuadros guardados ---
  const [historialPagina, setHistorialPagina] = useState(1)
  const [historialTotalPaginas, setHistorialTotalPaginas] = useState(1)
  const [historialTotal, setHistorialTotal] = useState(0)
  // Id del cuadro cuyo menú de acciones está abierto.
  const [menuCuadro, setMenuCuadro] = useState<string | null>(null)
  // Id del cuadro pendiente de confirmar borrado.
  const [confirmandoBorrar, setConfirmandoBorrar] = useState<string | null>(null)
  // Id del cuadro que se está renombrando, y el texto en edición.
  const [renombrando, setRenombrando] = useState<string | null>(null)
  const [etiquetaTexto, setEtiquetaTexto] = useState('')
  // Historial colapsado: la preferencia se recuerda entre sesiones.
  const [historialColapsado, setHistorialColapsado] = useState(false)
  // Se incrementa cada vez que se carga un cuadro. Al usarlo como `key`, React
  // remonta el contenido y la animación de entrada vuelve a dispararse.
  const [cargaId, setCargaId] = useState(0)
  // Tiempo en el que se está añadiendo un alimento (null = ninguno), con el
  // grupo y equivalentes elegidos en el formulario.
  const [alimentoNuevo, setAlimentoNuevo] = useState<{
    tiempoId: string
    grupo: GrupoSMAEId
    equivalentes: number
  } | null>(null)
  // Clave "tiempoId|idx" del alimento recién añadido, para animar solo ese.
  const [recienAgregado, setRecienAgregado] = useState<string | null>(null)

  // --- Alternativas para un alimento concreto ---
  // Clave del alimento cuyo panel está abierto ("tiempoId|idx" o
  // "tiempoId|opcion|idx" en el recetario).
  const [alternativasDe, setAlternativasDe] = useState<string | null>(null)
  const [alternativas, setAlternativas] = useState<
    { descripcion: string; calculo?: string; nota?: string }[]
  >([])
  const [cargandoAlternativas, setCargandoAlternativas] = useState(false)
  const [errorAlternativas, setErrorAlternativas] = useState('')
  // Restricciones del paciente elegido: se avisan antes de generar y se
  // comprueban en la dieta resultante.
  const [restricciones, setRestricciones] = useState<{
    alergias: string | null
    intolerancias: string | null
    preferencias: string | null
    disgustos: string | null
  } | null>(null)
  // Formulario de ingrediente nuevo en una opción del recetario.
  const [ingredienteNuevo, setIngredienteNuevo] = useState<{
    tiempoId: string
    idxOpcion: number
    grupo: GrupoSMAEId
    equivalentes: number
  } | null>(null)

  // --- Deshacer / rehacer ---
  // Pila de estados anteriores de la dieta y del recetario. Vive solo en memoria:
  // protege del error al editar, no sustituye al guardado.
  const [pilaDeshacer, setPilaDeshacer] = useState<EstadoEditable[]>([])
  const [pilaRehacer, setPilaRehacer] = useState<EstadoEditable[]>([])
  // Cuando restauramos desde una pila, no queremos que el observador lo apile
  // otra vez como si fuera una edición del usuario.
  const restaurando = useRef(false)
  const [avisoDeshacer, setAvisoDeshacer] = useState<string | null>(null)
  // Última instantánea conocida, para detectar cambios reales.
  const ultimoEstado = useRef<EstadoEditable>({ dieta: null, recetario: null })

  // Una dieta finalizada es una versión definitiva: no se edita, se duplica.
  const soloLectura = estadoDieta === 'FINALIZADA'

  // Qué mostrar en el indicador de guardado de la cabecera.
  const indicadorGuardado = useMemo(
    () =>
      textoAutoguardado(
        estadoAutoguardado,
        guardadoEn,
        soloLectura,
        Boolean(dietaIA || recetario)
      ),
    [estadoAutoguardado, guardadoEn, soloLectura, dietaIA, recetario]
  )

  /**
   * Vacía el historial de edición. Se llama al cambiar de paciente o de cuadro:
   * si no, se podría "deshacer" hacia la dieta de otro paciente.
   */
  const limpiarHistorialEdicion = () => {
    setPilaDeshacer([])
    setPilaRehacer([])
    ultimoEstado.current = { dieta: null, recetario: null }
    // El autoguardado pendiente era del contexto anterior: cancelarlo aquí, que
    // es la función de "cambiamos de contexto", evita olvidarlo en cada sitio
    // que la llama.
    cancelarAutoguardado()
    autoguardadoPendiente.current = false
    autoguardadoBloqueado.current = false
    firmaGuardada.current = null
    avisadoFalloGuardado.current = false
    // Soltar también los ids de la ref: el efecto que la refresca conserva los
    // que capturó el autoguardado, y aquí es justamente cuando dejan de valer
    // (otro cuadro, o ninguno). Si no, escribiríamos sobre la dieta anterior.
    ctxGuardado.current.cuadroId = null
    ctxGuardado.current.dietaId = null
    setEstadoAutoguardado('inactivo')
    setGuardadoEn(null)
  }

  // Kcal calculada por el sistema (Mifflin × actividad ± objetivo).
  const kcalCalculada = resultado?.kcalMeta ?? 0
  // Kcal meta efectiva: la manual si el nutriólogo la sobrescribió, si no la calculada.
  const kcalMeta =
    kcalOverride !== null && kcalOverride !== '' ? Number(kcalOverride) : kcalCalculada
  const kcalEditada =
    kcalOverride !== null && kcalOverride !== '' && Number(kcalOverride) !== kcalCalculada

  const sumaPct = pct.hco + pct.lip + pct.pro
  const pctOk = Math.abs(sumaPct - 100) < 0.5

  // Cuadro de distribución (HCO/Líp/Pro/HCO simples) a partir de la meta y los % editables.
  const distribucion = useMemo(() => {
    if (!resultado) return null
    return cuadroDistribucion(kcalMeta, pct.hco, pct.lip, pct.pro)
  }, [resultado, kcalMeta, pct])

  // Totales y diferencia del SMAE, recalculados en vivo. La META son los gramos
  // que salen de la distribución editable (no del cálculo original).
  const totalesSmae = useMemo(() => sumarEquivalentes(equivalentes), [equivalentes])
  const diferenciaSmae = useMemo(() => {
    if (!distribucion) return null
    const [hco, lip, pro] = distribucion
    return calcularDiferencia(totalesSmae, {
      kcalMeta,
      hco_g: hco!.gramos,
      proteina_g: pro!.gramos,
      lipidos_g: lip!.gramos,
    })
  }, [totalesSmae, distribucion, kcalMeta])

  // Tabla de comprobación de la dieta generada por IA: una fila por alimento con
  // sus nutrientes del SMAE, el total, la meta del cuadro y la diferencia.
  /**
   * Revisa la dieta o el recetario buscando los alérgenos declarados. Es una red
   * de seguridad por si la IA ignora la restricción: solo detecta lo que está
   * escrito, así que avisa para revisar, no certifica que sea seguro.
   */
  const alergenosDetectados = useMemo(() => {
    if (!restricciones?.alergias) return []
    const textos: { texto: string; ubicacion: string }[] = []

    for (const t of dietaIA ?? []) {
      for (const a of t.alimentos) {
        if (a.descripcion) textos.push({ texto: a.descripcion, ubicacion: t.nombre })
      }
    }
    for (const t of recetario?.tiempos ?? []) {
      t.opciones.forEach((o, i) => {
        const donde = `${t.nombre} · opción ${i + 1}`
        if (o.nombre) textos.push({ texto: o.nombre, ubicacion: donde })
        if (o.preparacion) textos.push({ texto: o.preparacion, ubicacion: donde })
        for (const a of o.alimentos) {
          if (a.descripcion) textos.push({ texto: a.descripcion, ubicacion: donde })
        }
      })
    }

    return buscarAlergenos(restricciones.alergias, textos)
  }, [restricciones, dietaIA, recetario])


  /** Cuántos alimentos están fijados (para avisar de lo que la IA no tocará). */
  const totalFijados = useMemo(
    () => (dietaIA ?? []).reduce((n, t) => n + t.alimentos.filter((a) => a.fijado).length, 0),
    [dietaIA]
  )

  /**
   * Cuadre de cada tiempo: compara los equivalentes que tiene la dieta contra
   * los que se repartieron en la pestaña de distribución. Se recalcula en vivo,
   * así que al añadir o quitar un alimento el aviso aparece al instante.
   */
  const cuadrePorTiempo = useMemo(() => {
    if (!dietaIA) return null
    const mapa = new Map<
      string,
      { grupo: GrupoSMAEId; enDieta: number; esperado: number }[]
    >()
    for (const t of dietaIA) {
      const esperado = reparto[t.id] ?? {}
      // Suma por grupo de lo que hay ahora mismo en la dieta.
      const enDieta = new Map<GrupoSMAEId, number>()
      for (const a of t.alimentos) {
        enDieta.set(a.grupo, (enDieta.get(a.grupo) ?? 0) + a.equivalentes)
      }
      // Une los grupos de ambos lados para detectar tanto faltantes como sobrantes.
      const grupos = new Set<GrupoSMAEId>([
        ...(Object.keys(esperado) as GrupoSMAEId[]).filter((g) => (esperado[g] ?? 0) > 0),
        ...enDieta.keys(),
      ])
      const filas = [...grupos]
        .map((g) => ({
          grupo: g,
          enDieta: Math.round((enDieta.get(g) ?? 0) * 2) / 2,
          esperado: Math.round((esperado[g] ?? 0) * 2) / 2,
        }))
        .filter((f) => Math.abs(f.enDieta - f.esperado) > 0.001)
      mapa.set(t.id, filas)
    }
    return mapa
  }, [dietaIA, reparto])

  /**
   * Cuadre de cada opción del recetario. A diferencia de la dieta, aquí CADA
   * opción debe cumplir por sí sola los equivalentes del tiempo (son
   * intercambiables), así que se valida una por una.
   * Clave del mapa: "tiempoId|idxOpcion".
   */
  const cuadrePorOpcion = useMemo(() => {
    if (!recetario) return null
    const mapa = new Map<string, { grupo: GrupoSMAEId; enOpcion: number; esperado: number }[]>()
    for (const t of recetario.tiempos) {
      const esperado = reparto[t.id] ?? {}
      t.opciones.forEach((o, idx) => {
        const suma = new Map<GrupoSMAEId, number>()
        for (const a of o.alimentos) {
          suma.set(a.grupo, (suma.get(a.grupo) ?? 0) + a.equivalentes)
        }
        const grupos = new Set<GrupoSMAEId>([
          ...(Object.keys(esperado) as GrupoSMAEId[]).filter((g) => (esperado[g] ?? 0) > 0),
          ...suma.keys(),
        ])
        const filas = [...grupos]
          .map((g) => ({
            grupo: g,
            enOpcion: Math.round((suma.get(g) ?? 0) * 2) / 2,
            esperado: Math.round((esperado[g] ?? 0) * 2) / 2,
          }))
          .filter((f) => Math.abs(f.enOpcion - f.esperado) > 0.001)
        mapa.set(`${t.id}|${idx}`, filas)
      })
    }
    return mapa
  }, [recetario, reparto])
  /**
   * Revisa la dieta antes de guardarla. Distingue lo que IMPIDE guardar (datos
   * incompletos, que dejarían una dieta rota) de lo que solo merece un aviso
   * (descuadres, que a veces son intencionales).
   */
  const validacionGuardado = useMemo(() => {
    const bloqueos: string[] = []
    const avisos: string[] = []
    const contenido = recetario ? recetario.tiempos : dietaIA

    if (!contenido || contenido.length === 0) {
      bloqueos.push('Todavía no has generado la dieta.')
      return { bloqueos, avisos }
    }

    if (recetario) {
      // Cada tiempo necesita al menos una opción, y cada opción sus datos.
      for (const t of recetario.tiempos) {
        if (t.opciones.length === 0) {
          bloqueos.push(`"${t.nombre}" no tiene ninguna opción.`)
          continue
        }
        t.opciones.forEach((o, i) => {
          const donde = `${t.nombre} · opción ${i + 1}`
          if (!o.nombre.trim()) bloqueos.push(`${donde}: falta el nombre del platillo.`)
          if (o.alimentos.length === 0) bloqueos.push(`${donde}: no tiene ingredientes.`)
          if (o.alimentos.some((a) => !a.descripcion.trim()))
            bloqueos.push(`${donde}: hay un ingrediente sin describir.`)
        })
      }
      // Descuadres: se avisan, no bloquean.
      const conDescuadre = [...(cuadrePorOpcion?.entries() ?? [])].filter(
        ([, filas]) => filas.length > 0
      ).length
      if (conDescuadre > 0) {
        avisos.push(
          `${conDescuadre} ${conDescuadre === 1 ? 'opción no cuadra' : 'opciones no cuadran'} con los equivalentes del tiempo.`
        )
      }
    } else if (dietaIA) {
      for (const t of dietaIA) {
        if (t.alimentos.length === 0) {
          bloqueos.push(`"${t.nombre}" quedó sin alimentos.`)
          continue
        }
        if (t.alimentos.some((a) => !a.descripcion.trim()))
          bloqueos.push(`"${t.nombre}": hay un alimento sin describir.`)
      }
      const conDescuadre = [...(cuadrePorTiempo?.entries() ?? [])].filter(
        ([, filas]) => filas.length > 0
      ).length
      if (conDescuadre > 0) {
        avisos.push(
          `${conDescuadre} ${conDescuadre === 1 ? 'tiempo no cuadra' : 'tiempos no cuadran'} con lo repartido.`
        )
      }
    }

    // Un alérgeno detectado es lo más grave: bloquea el guardado.
    if (alergenosDetectados.length > 0) {
      bloqueos.push(
        `Se detectó un posible alérgeno (${alergenosDetectados.map((a) => a.declarado).join(', ')}). Corrígelo antes de guardar.`
      )
    }

    return { bloqueos, avisos }
  }, [dietaIA, recetario, cuadrePorTiempo, cuadrePorOpcion, alergenosDetectados])

  /** Solo se puede guardar si no hay nada que lo impida. */
  const puedeGuardarDieta = validacionGuardado.bloqueos.length === 0

  const tablaComprobacion = useMemo(() => {
    if (!dietaIA || !distribucion) return null
    const filas = dietaIA.flatMap((t) =>
      t.alimentos.map((a) => ({
        descripcion: a.descripcion || `${a.equivalentes}× ${NOMBRE_GRUPO[a.grupo] ?? a.grupo}`,
        ...nutrientesDeAlimento(a.grupo, a.equivalentes),
      }))
    )
    const total = filas.reduce(
      (s, f) => ({
        hco: s.hco + f.hco,
        proteina: s.proteina + f.proteina,
        lipidos: s.lipidos + f.lipidos,
        kcal: s.kcal + f.kcal,
      }),
      { hco: 0, proteina: 0, lipidos: 0, kcal: 0 }
    )
    const meta = {
      hco: distribucion[0]!.gramos,
      proteina: distribucion[2]!.gramos,
      lipidos: distribucion[1]!.gramos,
      kcal: kcalMeta,
    }
    const r = (n: number) => Math.round(n * 10) / 10
    const diferencia = {
      hco: r(total.hco - meta.hco),
      proteina: r(total.proteina - meta.proteina),
      lipidos: r(total.lipidos - meta.lipidos),
      kcal: Math.round(total.kcal - meta.kcal),
    }
    return {
      filas,
      total: {
        hco: r(total.hco),
        proteina: r(total.proteina),
        lipidos: r(total.lipidos),
        kcal: Math.round(total.kcal),
      },
      meta: {
        hco: r(meta.hco),
        proteina: r(meta.proteina),
        lipidos: r(meta.lipidos),
        kcal: Math.round(meta.kcal),
      },
      diferencia,
    }
  }, [dietaIA, distribucion, kcalMeta])

  const setEquivalente = (id: GrupoSMAEId, valor: string) => {
    // Redondea al múltiplo del paso elegido (0.25 / 0.5 / 1).
    const n = valor === '' ? 0 : Math.max(0, Math.round(Number(valor) / pasoEquiv) * pasoEquiv)
    setEquivalentes((e) => ({ ...e, [id]: redondear2(n) }))
  }

  // --- Distribución en tiempos de comida (pestaña 2) ---

  // Grupos que el nutriólogo definió con equivalentes > 0 (los únicos a repartir).
  const gruposConEquiv = useMemo(
    () => GRUPOS_SMAE.filter((g) => (equivalentes[g.id] ?? 0) > 0),
    [equivalentes]
  )

  // Cuadre por grupo: repartido vs total.
  const cuadres = useMemo(() => validarDistribucion(equivalentes, reparto), [equivalentes, reparto])
  const cuadreDe = (grupo: GrupoSMAEId) => cuadres.find((c) => c.grupo === grupo)

  // Asigna equivalentes de un grupo a un tiempo (celda de la matriz).
  const setCelda = (tiempoId: string, grupo: GrupoSMAEId, valor: string) => {
    const n = valor === '' ? 0 : Math.max(0, Math.round(Number(valor) * 2) / 2)
    setReparto((r) => ({ ...r, [tiempoId]: { ...(r[tiempoId] ?? {}), [grupo]: n } }))
  }

  const agregarTiempo = () => {
    setTiempos((ts) => [...ts, { id: nuevoIdTiempo(), nombre: `Tiempo ${ts.length + 1}` }])
  }

  // Genera una propuesta de reparto automática (como la haría un nutriólogo):
  // fruta y lácteos hacia las colaciones; verduras, cereales y AOA en las
  // comidas fuertes. Cuadra exacto con los equivalentes definidos. Cada clic
  // incrementa la semilla para ofrecer una propuesta distinta pero válida.
  const distribuirAuto = () => {
    const nuevaVariacion = variacionDist + 1
    setVariacionDist(nuevaVariacion)
    setReparto(distribuirEnTiemposAuto(equivalentes, tiempos, nuevaVariacion))
  }

  // Propone automáticamente los equivalentes de cada grupo para cuadrar con la
  // meta de macros, con un patrón alimentario balanceado. Cada clic ofrece una
  // dieta distinta. Al proponer nuevos equivalentes, el reparto en tiempos
  // anterior deja de corresponder, así que se limpia.
  const proponerEquivalentes = () => {
    if (!distribucion) return
    const [hco, lip, pro] = distribucion
    const nueva = variacionEquiv + 1
    setVariacionEquiv(nueva)
    setEquivalentes(
      calcularEquivalentesAuto(
        {
          kcalMeta,
          hco_g: hco!.gramos,
          proteina_g: pro!.gramos,
          lipidos_g: lip!.gramos,
        },
        nueva
      )
    )
    // El reparto en tiempos ya no cuadra con los nuevos equivalentes.
    setReparto({})
    setVariacionDist(0)
  }
  const renombrarTiempo = (id: string, nombre: string) => {
    setTiempos((ts) => ts.map((t) => (t.id === id ? { ...t, nombre } : t)))
  }
  const eliminarTiempo = (id: string) => {
    setTiempos((ts) => ts.filter((t) => t.id !== id))
    setReparto((r) => {
      const copia = { ...r }
      delete copia[id]
      return copia
    })
  }

  // Buscar pacientes (autocompletado)
  // Preferencias persistidas del nutriólogo (aviso de guardado, historial plegado).
  useEffect(() => {
    if (localStorage.getItem('dietas.omitirAvisoGuardar') === '1') {
      setNoVolverAvisar(true)
    }
    if (localStorage.getItem('dietas.historialColapsado') === '1') {
      setHistorialColapsado(true)
    }
  }, [])

  /** Pliega o despliega el historial, recordando la preferencia. */
  const alternarHistorial = () => {
    setHistorialColapsado((c) => {
      const nuevo = !c
      localStorage.setItem('dietas.historialColapsado', nuevo ? '1' : '0')
      return nuevo
    })
  }

  // Auto-scroll del chat al fondo cuando llegan mensajes o texto en streaming.
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [mensajesIA])

  useEffect(() => {
    if (paciente) return
    if (query.trim().length < 2) {
      setResultados([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pacientes/buscar?q=${encodeURIComponent(query)}&limit=8`)
        if (res.ok) {
          const data = await res.json()
          setResultados(data.pacientes || [])
        }
      } catch {
        /* silencioso */
      }
    }, 250)
  }, [query, paciente])

  const seleccionarPaciente = useCallback(async (p: PacienteLite) => {
    setPaciente(p)
    setResultados([])
    setQuery('')
    setResultado(null)
    setEquivalentes({})
    setPct({ ...PCT_DEFAULT })
    setKcalOverride(null)
    setReparto({})
    setVariacionDist(0)
    setVariacionEquiv(0)
    setCuadroId(null)
    setDietaId(null)
    setEstadoDieta(null)
    limpiarHistorialEdicion()
    setRestricciones(null)
    setTiempos(TIEMPOS_DEFAULT.map((t) => ({ ...t })))
    setPestana('cuadro')
    setError('')
    setExito('')
    setConsultaId('')
    setConsultas([])
    setForm({ ...FORM_INICIAL })
    // Prellenar peso/talla/edad de la última consulta + traer sus consultas
    try {
      const res = await fetch(`/api/dietas/cuadros/prellenado?paciente_id=${p.id}`)
      if (res.ok) {
        const data = await res.json()
        setConsultas(data.consultas ?? [])
        setRestricciones(data.restricciones ?? null)
        setForm((f) => ({
          ...f,
          peso: data.peso != null ? String(data.peso) : '',
          talla_cm: data.talla_cm != null ? String(data.talla_cm) : '',
          edad: data.edad != null ? String(data.edad) : '',
          mlg_kg: data.mlg_kg != null ? String(data.mlg_kg) : '',
        }))
      }
    } catch {
      /* si falla, el nutriólogo llena a mano */
    }
    cargarHistorial(p.id)
  }, [])

  // Cambia la consulta base de la dieta y reprellenar peso/talla/MLG de ESA consulta.
  const cambiarConsultaBase = async (nuevaConsultaId: string) => {
    setConsultaId(nuevaConsultaId)
    setResultado(null) // invalida el cálculo previo
    if (!paciente) return
    const url = nuevaConsultaId
      ? `/api/dietas/cuadros/prellenado?paciente_id=${paciente.id}&consulta_id=${nuevaConsultaId}`
      : `/api/dietas/cuadros/prellenado?paciente_id=${paciente.id}`
    try {
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setForm((f) => ({
          ...f,
          peso: data.peso != null ? String(data.peso) : '',
          talla_cm: data.talla_cm != null ? String(data.talla_cm) : '',
          mlg_kg: data.mlg_kg != null ? String(data.mlg_kg) : '',
        }))
      }
    } catch {
      /* si falla, quedan los datos actuales */
    }
  }

  /**
   * Abre desde el resumen: selecciona al paciente y carga ese cuadro, que a su
   * vez restaura la dieta guardada. Así un clic en el panel lleva directo al
   * trabajo (sobre todo útil para retomar un borrador).
   */
  const abrirDesdeResumen = async (
    p: { id: string; nombre: string; email: string },
    cuadroId: string
  ) => {
    await seleccionarPaciente(p)
    cargarCuadro(cuadroId)
  }

  // Carga una página del historial de cuadros del paciente.
  const cargarHistorial = async (pacienteId: string, pagina = 1) => {
    setCargandoHistorial(true)
    try {
      const res = await fetch(
        `/api/dietas/cuadros?paciente_id=${pacienteId}&pagina=${pagina}&por_pagina=${POR_PAGINA}`
      )
      if (res.ok) {
        const data = await res.json()
        setHistorial(data.cuadros ?? [])
        setHistorialPagina(data.pagina ?? 1)
        setHistorialTotalPaginas(data.totalPaginas ?? 1)
        setHistorialTotal(data.total ?? 0)
      }
    } catch {
      /* silencioso */
    } finally {
      setCargandoHistorial(false)
    }
  }

  /** Cambia de página en el historial. */
  const irAPagina = (pagina: number) => {
    if (!paciente || pagina < 1 || pagina > historialTotalPaginas) return
    cargarHistorial(paciente.id, pagina)
  }

  /** Elimina un cuadro guardado (el servidor bloquea los que tienen dieta definitiva). */
  const eliminarCuadro = async (id: string) => {
    if (!paciente) return
    setError('')
    setExito('')
    try {
      const res = await fetch(`/api/dietas/cuadros/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        // Toast: el historial se ve desde cualquier pestaña, pero el aviso de la
        // cabecera solo aparece en "cuadro".
        toast.exito('Cuadro eliminado')
        // Si borramos el que estaba abierto, limpiamos la pantalla.
        if (cuadroId === id) {
          setCuadroId(null)
          setDietaId(null)
          setEstadoDieta(null)
          limpiarHistorialEdicion()
          setRestricciones(null)
          setDietaIA(null)
          setRecetario(null)
        }
        // Si la página se queda vacía, retrocedemos una.
        const quedan = historial.length - 1
        cargarHistorial(paciente.id, quedan === 0 && historialPagina > 1 ? historialPagina - 1 : historialPagina)
      } else {
        setError(data.error || 'No se pudo eliminar el cuadro')
      }
    } catch {
      setError('Error de conexión al eliminar')
    } finally {
      setConfirmandoBorrar(null)
    }
  }

  /** Duplica un cuadro como punto de partida de uno nuevo. */
  const duplicarCuadro = async (id: string) => {
    if (!paciente) return
    setError('')
    setExito('')
    setMenuCuadro(null)
    try {
      const res = await fetch(`/api/dietas/cuadros/${id}/duplicar`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        // Toast: `cargarCuadro` de abajo pisaría un `setExito` al instante.
        toast.exito('Cuadro duplicado', {
          descripcion: 'Ajusta los datos y genera la dieta.',
        })
        await cargarHistorial(paciente.id, 1)
        cargarCuadro(data.cuadro.id)
      } else {
        setError(data.error || 'No se pudo duplicar el cuadro')
      }
    } catch {
      setError('Error de conexión al duplicar')
    }
  }

  /** Guarda la etiqueta (nombre corto) de un cuadro. */
  const guardarEtiqueta = async (id: string) => {
    if (!paciente) return
    const texto = etiquetaTexto.trim()
    setRenombrando(null)
    try {
      const res = await fetch(`/api/dietas/cuadros/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etiqueta: texto }),
      })
      if (res.ok) {
        setHistorial((hs) => hs.map((h) => (h.id === id ? { ...h, etiqueta: texto || null } : h)))
      }
    } catch {
      /* silencioso: la etiqueta es cosmética */
    }
  }

  // Abre un cuadro guardado y repuebla toda la pantalla.
  const cargarCuadro = async (id: string) => {
    setError('')
    setExito('')
    // Limpiamos SIEMPRE la dieta que hubiera en pantalla antes de cargar otra:
    // si no, la dieta del cuadro anterior quedaría pegada a este.
    setDietaIA(null)
    setRecetario(null)
    setMensajesIA([])
    setElementosCambiados(new Set())
    setCuadroId(null)
    setDietaId(null)
    setEstadoDieta(null)
    limpiarHistorialEdicion()
    setRestricciones(null)
    try {
      const res = await fetch(`/api/dietas/cuadros/${id}`)
      if (!res.ok) {
        setError('No se pudo cargar el cuadro.')
        return
      }
      const { cuadro: c } = await res.json()
      setForm({
        peso: String(c.peso),
        talla_cm: String(c.talla_cm),
        edad: String(c.edad),
        sexo: c.sexo,
        nivel_actividad: c.nivel_actividad,
        objetivo: c.objetivo,
        formula: c.formula ?? 'MIFFLIN',
        mlg_kg: c.mlg_kg != null ? String(c.mlg_kg) : '',
        notas: c.notas ?? '',
      })
      setConsultaId(c.consulta_id ?? '')
      setPct({ hco: c.pct_carbohidrato, lip: c.pct_grasa, pro: c.pct_proteina })
      setEquivalentes((c.equivalentes as Equivalentes) ?? {})
      // Fijamos el resultado con los valores guardados (sin recalcular).
      setResultado({
        geb: c.geb,
        get: c.get,
        kcalMeta: c.kcal_meta,
        imc: c.imc,
        clasificacionImc: clasificarIMC(c.imc),
        pesoIdeal: c.peso_ideal,
        macros: {
          proteina: { gramos: c.proteina_g, kcal: 0, porcentaje: c.pct_proteina },
          grasa: { gramos: c.grasa_g, kcal: 0, porcentaje: c.pct_grasa },
          carbohidrato: { gramos: c.carbohidrato_g, kcal: 0, porcentaje: c.pct_carbohidrato },
          kcalTotal: c.kcal_meta,
        },
      })
      setKcalOverride(null)
      // Distribución en tiempos
      const dt = c.distribucion_tiempos as {
        tiempos?: TiempoComida[]
        reparto?: DistribucionTiempos
      } | null
      if (dt?.tiempos?.length) {
        setTiempos(dt.tiempos)
        setReparto(dt.reparto ?? {})
      } else {
        setTiempos(TIEMPOS_DEFAULT.map((t) => ({ ...t })))
        setReparto({})
      }
      setVariacionDist(0)
      setVariacionEquiv(0)
      setCuadroId(c.id)
      // Relanza la animación de entrada de los datos recién cargados.
      setCargaId((n) => n + 1)

      // Restaurar la dieta/recetario guardado: preferimos la versión definitiva
      // y, si no hay, el borrador más reciente.
      const dietas: DietaGuardada[] = Array.isArray(c.dietas) ? c.dietas : []
      const preferida = dietas.find((d) => d.estado === 'FINALIZADA') ?? dietas[0] ?? null
      const tiemposGuardados = Array.isArray(preferida?.contenido?.tiempos)
        ? preferida.contenido.tiempos
        : null

      if (preferida && tiemposGuardados) {
        setDietaId(preferida.id)
        setEstadoDieta(preferida.estado)
        // Esto acaba de salir de la base de datos: fijamos su firma para que
        // restaurarlo en pantalla no dispare un guardado de lo mismo.
        firmaGuardada.current = firmaContenido({
          modo: preferida.modo === 'RECETARIO' ? 'RECETARIO' : 'DIETA',
          tiempos: tiemposGuardados,
          indicacionesInicio: preferida.indicaciones_inicio ?? '',
        })
        setEstadoAutoguardado('guardado')
        if (preferida.modo === 'RECETARIO') {
          setModoIA('recetario')
          setRecetario({
            indicacionesInicio: preferida.indicaciones_inicio ?? '',
            tiempos: tiemposGuardados as TiempoRecetarioUI[],
            mensaje: '',
          })
        } else {
          setModoIA('dieta')
          setDietaIA(tiemposGuardados as TiempoGeneradoUI[])
        }
        // Si hay dieta, el nutriólogo quiere verla, no el formulario.
        setPestana('ia')
        // Toast y no `setExito`: el aviso de la cabecera solo se renderiza en la
        // pestaña "cuadro", así que aquí (que saltamos a "ia") no se vería.
        toast.exito(
          preferida.estado === 'FINALIZADA'
            ? 'Dieta definitiva abierta'
            : 'Borrador de dieta cargado',
          preferida.estado === 'FINALIZADA'
            ? { descripcion: 'Está en solo lectura. Pulsa Editar para cambiarla.' }
            : undefined
        )
      } else {
        setPestana('cuadro')
        setExito('Cuadro cargado.')
      }
    } catch {
      setError('Error de conexión al cargar el cuadro.')
    }
  }

  const cambiarPaciente = () => {
    // Antes de soltar al paciente, conserva lo que estuviera a medio ajustar.
    // Sin retardo: nos vamos ya. La ref del contexto todavía apunta a este
    // paciente, así que el guardado va al sitio correcto.
    void autoguardar()
    setPaciente(null)
    setResultado(null)
    setEquivalentes({})
    setPct({ ...PCT_DEFAULT })
    setKcalOverride(null)
    setReparto({})
    setVariacionDist(0)
    setVariacionEquiv(0)
    setCuadroId(null)
    setDietaId(null)
    setEstadoDieta(null)
    limpiarHistorialEdicion()
    setRestricciones(null)
    setTiempos(TIEMPOS_DEFAULT.map((t) => ({ ...t })))
    setPestana('cuadro')
    setForm({ ...FORM_INICIAL })
    setHistorial([])
    setConsultaId('')
    setConsultas([])
    setDietaIA(null)
    setRecetario(null)
    setMensajesIA([])
    setError('')
    setExito('')
  }

  const setCampo = (campo: string, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setResultado(null) // invalidar resultado al cambiar datos
    // Los datos ya no corresponden al cuadro guardado: al finalizar habrá que
    // crear uno nuevo en vez de cerrar el viejo.
    setCuadroId(null)
    setExito('')
  }

  // Actualiza un porcentaje de la distribución (HCO/Líp/Pro).
  const setPctCampo = (macro: 'hco' | 'lip' | 'pro', valor: string) => {
    const n = valor === '' ? 0 : Math.max(0, Math.min(100, Number(valor)))
    setPct((p) => ({ ...p, [macro]: n }))
  }

  // --- Generación con IA (pestaña 3) ---

  // Llama a la IA para proponer los alimentos, con instrucciones opcionales del chat.
  const generarDietaIA = async (instruccionesExtra?: string) => {
    if (!resultado || !distribucion) return
    if (!tieneDistribucion) {
      setError(
        'Primero reparte los equivalentes en la pestaña “Distribución en tiempos”. La IA necesita saber cuántos equivalentes lleva cada comida.'
      )
      return
    }
    setGenerando(true)
    setError('')
    // Lo que haya generado la IA, para autoguardarlo al terminar.
    let recienGenerado: ContenidoAutoguardado | null = null
    try {
      const res = await fetch('/api/dietas/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: paciente?.id,
          modo: modoIA,
          kcal_meta: kcalMeta,
          proteina_g: distribucion[2]!.gramos,
          grasa_g: distribucion[1]!.gramos,
          carbohidrato_g: distribucion[0]!.gramos,
          tiempos: tiempos.map((t) => ({
            id: t.id,
            nombre: t.nombre,
            equivalentes: reparto[t.id] ?? {},
          })),
          instrucciones_extra: instruccionesExtra,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        // La dieta recién generada entra con animación, no de golpe.
        setCargaId((n) => n + 1)
        if (modoIA === 'recetario') {
          setRecetario(data.recetario)
          if (data.recetario?.mensaje) {
            setMensajesIA((m) => [...m, { rol: 'ia', texto: data.recetario.mensaje }])
          }
          recienGenerado = {
            modo: 'RECETARIO',
            tiempos: data.recetario.tiempos,
            indicacionesInicio: data.recetario.indicacionesInicio,
          }
        } else {
          setDietaIA(data.dieta.tiempos)
          if (data.dieta.mensaje) {
            setMensajesIA((m) => [...m, { rol: 'ia', texto: data.dieta.mensaje }])
          }
          recienGenerado = { modo: 'DIETA', tiempos: data.dieta.tiempos }
        }
      } else {
        setError(data.error || 'Error al generar con IA')
      }
    } catch {
      setError('Error de conexión al generar')
    } finally {
      setGenerando(false)
    }

    // Guardar en cuanto la IA termina, sin esperar los 3 segundos: generar es
    // lo que más trabajo cuesta y lo que más dolía perder. Se pasa el contenido
    // a mano porque los setState de arriba aún no se han reflejado en la ref.
    if (recienGenerado) {
      cancelarAutoguardado()
      void autoguardar(recienGenerado)
    }
  }

  // Marca los elementos cambiados para resaltarlos y los desvanece tras ~2.2s.
  const resaltarCambios = (claves: string[]) => {
    if (claves.length === 0) return
    setElementosCambiados(new Set(claves))
    window.setTimeout(() => setElementosCambiados(new Set()), 2200)
  }

  // Compara la dieta anterior con la nueva y devuelve las claves "tiempoId|idx"
  // de los alimentos que cambiaron (descripcion o equivalentes distintos, o nuevos).
  const diffDieta = (anterior: TiempoGeneradoUI[] | null, nueva: TiempoGeneradoUI[]): string[] => {
    if (!anterior) return [] // primera generación: no resaltamos nada
    const claves: string[] = []
    for (const t of nueva) {
      const tAnt = anterior.find((x) => x.id === t.id)
      t.alimentos.forEach((a, i) => {
        const aAnt = tAnt?.alimentos[i]
        if (!aAnt || aAnt.descripcion !== a.descripcion || aAnt.grupo !== a.grupo) {
          claves.push(`${t.id}|${i}`)
        }
      })
    }
    return claves
  }

  // Igual para el recetario: clave "tiempoId|opcionIdx".
  const diffRecetario = (
    anterior: TiempoRecetarioUI[] | null,
    nueva: TiempoRecetarioUI[]
  ): string[] => {
    if (!anterior) return []
    const claves: string[] = []
    for (const t of nueva) {
      const tAnt = anterior.find((x) => x.id === t.id)
      t.opciones.forEach((o, i) => {
        const oAnt = tAnt?.opciones[i]
        const seria = (op: OpcionUI) =>
          op.nombre +
          '|' +
          op.alimentos.map((a) => a.descripcion).join(',') +
          '|' +
          (op.preparacion ?? '')
        if (!oAnt || seria(oAnt) !== seria(o)) {
          claves.push(`${t.id}|${i}`)
        }
      })
    }
    return claves
  }

  // Envía un mensaje del nutriólogo y recibe la respuesta de la IA con streaming.
  // La IA conversa y, si el mensaje implica un cambio, actualiza la dieta.
  const enviarMensajeChat = async () => {
    const texto = inputChat.trim()
    const estadoActual = modoIA === 'recetario' ? recetario : dietaIA
    if (!texto || chateando || generando || !estadoActual || !distribucion) return
    // Una dieta definitiva no se modifica: el chat reescribe la dieta, así que
    // hay que cortarlo aquí y no solo deshabilitar el botón.
    if (soloLectura) return

    // Historial para la IA (antes de agregar el mensaje nuevo).
    const historial = mensajesIA.map((m) => ({
      rol: m.rol === 'nutriologo' ? ('user' as const) : ('assistant' as const),
      contenido: m.texto,
    }))

    setMensajesIA((m) => [...m, { rol: 'nutriologo', texto }, { rol: 'ia', texto: '' }])
    setInputChat('')
    setChateando(true)
    setError('')

    try {
      const res = await fetch('/api/dietas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kcal_meta: kcalMeta,
          proteina_g: distribucion[2]!.gramos,
          grasa_g: distribucion[1]!.gramos,
          carbohidrato_g: distribucion[0]!.gramos,
          tiempos: tiempos.map((t) => ({
            id: t.id,
            nombre: t.nombre,
            equivalentes: reparto[t.id] ?? {},
          })),
          modo: modoIA,
          estado_actual:
            modoIA === 'recetario' ? { tiempos: recetario!.tiempos } : { tiempos: dietaIA },
          indicaciones_inicio: recetario?.indicacionesInicio ?? '',
          historial,
          mensaje: texto,
        }),
      })

      if (!res.ok || !res.body) {
        setError('No se pudo iniciar la conversación con la IA.')
        setChateando(false)
        return
      }

      // Lee el stream de Server-Sent Events y actualiza la última burbuja en vivo.
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lineas = buffer.split('\n\n')
        buffer = lineas.pop() ?? '' // el último puede estar incompleto

        for (const linea of lineas) {
          const l = linea.trim()
          if (!l.startsWith('data:')) continue
          const evento = JSON.parse(l.slice(5).trim())

          if (evento.tipo === 'texto') {
            setMensajesIA((m) => {
              const copia = [...m]
              const ultimo = copia[copia.length - 1]
              if (ultimo && ultimo.rol === 'ia') {
                copia[copia.length - 1] = { ...ultimo, texto: ultimo.texto + evento.delta }
              }
              return copia
            })
          } else if (evento.tipo === 'aplicando') {
            setAplicandoCambio(true)
          } else if (evento.tipo === 'dieta' && evento.dieta?.tiempos) {
            const cambiados = diffDieta(dietaIA, evento.dieta.tiempos)
            setDietaIA(evento.dieta.tiempos)
            setAplicandoCambio(false)
            resaltarCambios(cambiados)
          } else if (evento.tipo === 'recetario' && evento.recetario?.tiempos) {
            const cambiados = diffRecetario(recetario?.tiempos ?? null, evento.recetario.tiempos)
            setRecetario(evento.recetario)
            setAplicandoCambio(false)
            resaltarCambios(cambiados)
          } else if (evento.tipo === 'error') {
            setError(evento.error || 'Error en la conversación')
          }
        }
      }
    } catch {
      setError('Error de conexión en la conversación')
    } finally {
      setChateando(false)
      setAplicandoCambio(false)
      // Durante el stream el autoguardado está bloqueado (`chateando`), así que
      // los cambios que aplicó la IA se guardan aquí, al terminar.
      programarAutoguardado()
    }
  }

  // Edita a mano la descripción de un alimento propuesto.
  const editarAlimento = (tiempoId: string, idx: number, descripcion: string) => {
    if (soloLectura) return // una versión definitiva no se edita
    setDietaIA((d) =>
      d
        ? d.map((t) =>
            t.id === tiempoId
              ? {
                  ...t,
                  alimentos: t.alimentos.map((a, i) => (i === idx ? { ...a, descripcion } : a)),
                }
              : t
          )
        : d
    )
  }

  // --- Deshacer / rehacer ---

  /**
   * Avisa de que el guardado automático está fallando, UNA sola vez. Sin este
   * freno, una caída de red lanzaría un aviso cada 3 segundos.
   */
  const avisarFalloGuardado = useCallback(() => {
    if (avisadoFalloGuardado.current) return
    avisadoFalloGuardado.current = true
    toast.error('No se pudo guardar la dieta', {
      descripcion: 'Se reintentará al siguiente cambio. Tu trabajo sigue en pantalla.',
    })
  }, [toast])

  /**
   * Guarda la dieta en segundo plano, sin cerrarla y sin molestar al usuario.
   *
   * Lee todo de `ctxGuardado` en lugar de las dependencias del callback: así es
   * estable (deps vacías) y el retardo no se reprograma en cada tecla. De paso,
   * al cambiar de paciente la ref todavía apunta al anterior, que es justo el
   * contexto en el que hay que guardar.
   *
   * `contenidoExplicito` sirve para guardar lo que acaba de llegar de la IA sin
   * esperar a que React lo refleje en el estado.
   */
  const autoguardar = useCallback(async (contenidoExplicito?: ContenidoAutoguardado) => {
    const c = ctxGuardado.current
    if (!c.paciente) return
    if (c.soloLectura) return
    if (autoguardadoBloqueado.current) return
    // Nunca competir con el guardado manual. La generación y el chat sí pueden
    // pasar contenido explícito, porque saben lo que están guardando.
    if (c.finalizando) return
    if (!contenidoExplicito && (c.generando || c.chateando)) return

    const cont: ContenidoAutoguardado | null =
      contenidoExplicito ??
      (c.recetario
        ? {
            modo: 'RECETARIO',
            tiempos: c.recetario.tiempos,
            indicacionesInicio: c.recetario.indicacionesInicio,
          }
        : c.dietaIA
          ? { modo: 'DIETA', tiempos: c.dietaIA }
          : null)
    // El endpoint exige al menos un tiempo; sin contenido no hay nada que salvar.
    if (!cont || cont.tiempos.length === 0) return

    const firma = firmaContenido(cont)
    if (firma === firmaGuardada.current) return

    // Una sola petición en vuelo. Si llegan más cambios se encolan: con dos POST
    // simultáneos y sin `cuadro_id` todavía, se crearían dos cuadros duplicados.
    // Abortar no serviría, porque el servidor ya habría escrito.
    if (autoguardadoEnCurso.current) {
      autoguardadoPendiente.current = true
      return
    }
    autoguardadoEnCurso.current = true
    setEstadoAutoguardado('guardando')

    // Si no hay cuadro todavía, este guardado lo crea: hay que refrescar el
    // historial para que aparezca.
    const creaCuadro = !c.cuadroId

    try {
      const res = await fetch('/api/dietas/dietas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuadro_id: c.cuadroId ?? undefined,
          dieta_id: c.dietaId ?? undefined,
          cuadro: c.cuadroId ? undefined : c.payloadCuadro,
          modo: cont.modo,
          contenido: { tiempos: cont.tiempos },
          indicaciones_inicio: cont.indicacionesInicio || undefined,
          finalizar: false,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Quedarnos con los ids es lo que convierte esto en un upsert: sin ellos
        // el siguiente guardado volvería a crear cuadro y dieta desde cero.
        if (data.cuadro_id) {
          setCuadroId(data.cuadro_id)
          // Espejo síncrono: un cambio en este mismo tick usaría todavía
          // `cuadroId === null` y duplicaría el cuadro.
          ctxGuardado.current.cuadroId = data.cuadro_id
        }
        if (data.dieta?.id) {
          setDietaId(data.dieta.id)
          ctxGuardado.current.dietaId = data.dieta.id
        }
        setEstadoDieta((e) => e ?? 'BORRADOR')
        firmaGuardada.current = firma
        setGuardadoEn(new Date())
        setEstadoAutoguardado('guardado')
        // Si veníamos de un fallo, confirmar que se recuperó: el nutriólogo se
        // quedó con el aviso de que no se guardaba.
        if (avisadoFalloGuardado.current) {
          avisadoFalloGuardado.current = false
          toast.exito('Ya se guardó la dieta', {
            descripcion: 'Se recuperó la conexión.',
          })
        }
        if (creaCuadro && c.paciente) void cargarHistorial(c.paciente.id, 1)
      } else if (res.status === 409) {
        // El cuadro ya tiene una versión definitiva de este modo: el borrador en
        // pantalla no debe pisarla. Dejamos de intentarlo, en silencio.
        autoguardadoBloqueado.current = true
        setEstadoAutoguardado('inactivo')
      } else {
        setEstadoAutoguardado('error')
        avisarFalloGuardado()
      }
    } catch {
      // El guardado automático no interrumpe al usuario, pero un fallo sí debe
      // verse: si no, creería que su trabajo está a salvo cuando no lo está.
      setEstadoAutoguardado('error')
      avisarFalloGuardado()
    } finally {
      autoguardadoEnCurso.current = false
      if (autoguardadoPendiente.current) {
        autoguardadoPendiente.current = false
        // Reintento con lo más fresco de la ref. La firma corta el bucle si el
        // contenido ya coincide con lo persistido.
        void autoguardar()
      }
    }
    // `avisarFalloGuardado` es estable (depende solo del toast, memorizado), así
    // que no envejece el closure. El resto se lee de `ctxGuardado`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avisarFalloGuardado])

  /** Programa un autoguardado tras un momento de calma. */
  const programarAutoguardado = useCallback(() => {
    if (temporizadorAutoguardado.current) clearTimeout(temporizadorAutoguardado.current)
    setEstadoAutoguardado((e) => (e === 'guardando' ? e : 'pendiente'))
    temporizadorAutoguardado.current = setTimeout(() => {
      temporizadorAutoguardado.current = null
      void autoguardar()
    }, RETRASO_AUTOGUARDADO)
  }, [autoguardar])

  /** Cancela el autoguardado pendiente (cambio de contexto o guardado manual). */
  const cancelarAutoguardado = useCallback(() => {
    if (temporizadorAutoguardado.current) {
      clearTimeout(temporizadorAutoguardado.current)
      temporizadorAutoguardado.current = null
    }
  }, [])

  /**
   * Autoguardado: cualquier cambio en la dieta o el recetario programa un
   * guardado en segundo plano. Observarlo aquí (y no en cada handler) hace que
   * ninguna forma de editar se quede sin guardar, ni las que se añadan después.
   *
   * ORDEN IMPORTANTE: va ANTES del observador de deshacer porque ese consume
   * `restaurando.current` (lo pone en false). React ejecuta los efectos en orden
   * de declaración, así que si se moviera detrás, el flag ya valdría false y
   * deshacer dispararía guardados. Si aun así se reordena, la firma de contenido
   * de `autoguardar` lo amortigua: como mucho un POST redundante, nunca un
   * duplicado.
   */
  useEffect(() => {
    if (soloLectura) return
    // Deshacer/rehacer no es una edición nueva: no hay nada que salvar todavía.
    if (restaurando.current) return
    if (!dietaIA && !recetario) return
    programarAutoguardado()
  }, [dietaIA, recetario, soloLectura, programarAutoguardado])

  // Al desmontar, no dejar un temporizador suelto.
  useEffect(() => {
    return () => {
      if (temporizadorAutoguardado.current) clearTimeout(temporizadorAutoguardado.current)
    }
  }, [])

  /**
   * Observa la dieta y el recetario: cuando cambian por una edición del usuario
   * o de la IA, apila el estado ANTERIOR. Hacerlo aquí (y no en cada handler)
   * garantiza que ninguna forma de editar se quede fuera del historial.
   *
   * Ver la nota de orden en el efecto de autoguardado de arriba: este consume
   * `restaurando.current`, así que debe seguir yendo después.
   */
  useEffect(() => {
    const previo = ultimoEstado.current
    const cambio = previo.dieta !== dietaIA || previo.recetario !== recetario
    if (!cambio) return

    // Al restaurar no se apila: sería deshacer el deshacer.
    if (restaurando.current) {
      restaurando.current = false
      ultimoEstado.current = { dieta: dietaIA, recetario: recetario }
      return
    }

    // Solo guardamos si había algo antes (no apilamos el "nada" inicial).
    if (previo.dieta || previo.recetario) {
      setPilaDeshacer((p) => [...p, previo].slice(-MAX_DESHACER))
      // Una edición nueva invalida la rama de rehacer.
      setPilaRehacer([])
    }
    ultimoEstado.current = { dieta: dietaIA, recetario: recetario }
  }, [dietaIA, recetario])

  const puedeDeshacer = pilaDeshacer.length > 0 && !soloLectura
  const puedeRehacer = pilaRehacer.length > 0 && !soloLectura

  /** Vuelve al estado anterior de la dieta o el recetario. */
  const deshacer = useCallback(() => {
    if (pilaDeshacer.length === 0 || soloLectura) return
    const anterior = pilaDeshacer[pilaDeshacer.length - 1]
    if (!anterior) return
    restaurando.current = true
    // El estado actual pasa a la pila de rehacer.
    setPilaRehacer((r) => [...r, { dieta: dietaIA, recetario }].slice(-MAX_DESHACER))
    setPilaDeshacer((p) => p.slice(0, -1))
    setDietaIA(anterior.dieta)
    setRecetario(anterior.recetario)
    setAvisoDeshacer('Cambio deshecho')
  }, [pilaDeshacer, dietaIA, recetario, soloLectura])

  /** Repite el cambio que se acababa de deshacer. */
  const rehacer = useCallback(() => {
    if (pilaRehacer.length === 0 || soloLectura) return
    const siguiente = pilaRehacer[pilaRehacer.length - 1]
    if (!siguiente) return
    restaurando.current = true
    setPilaDeshacer((p) => [...p, { dieta: dietaIA, recetario }].slice(-MAX_DESHACER))
    setPilaRehacer((r) => r.slice(0, -1))
    setDietaIA(siguiente.dieta)
    setRecetario(siguiente.recetario)
    setAvisoDeshacer('Cambio rehecho')
  }, [pilaRehacer, dietaIA, recetario, soloLectura])

  // El aviso se desvanece solo.
  useEffect(() => {
    if (!avisoDeshacer) return
    const t = window.setTimeout(() => setAvisoDeshacer(null), 1800)
    return () => window.clearTimeout(t)
  }, [avisoDeshacer])

  /**
   * Atajos de teclado: Ctrl/Cmd+Z deshace, Ctrl+Shift+Z o Ctrl+Y rehace. Se
   * ignoran mientras se escribe en un campo, para no pisar el deshacer nativo
   * del texto.
   */
  useEffect(() => {
    const enTeclado = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const destino = e.target as HTMLElement | null
      const escribiendo =
        destino instanceof HTMLInputElement ||
        destino instanceof HTMLTextAreaElement ||
        destino?.isContentEditable
      if (escribiendo) return

      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        deshacer()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        rehacer()
      }
    }
    window.addEventListener('keydown', enTeclado)
    return () => window.removeEventListener('keydown', enTeclado)
  }, [deshacer, rehacer])

  // --- Alternativas para un alimento concreto ---

  /**
   * Pide a la IA otras formas de cubrir ese mismo alimento, sin tocar el resto
   * de la dieta. Si el panel ya estaba abierto, lo cierra.
   */
  const pedirAlternativas = async (
    clave: string,
    alimento: AlimentoUI,
    contexto: string
  ) => {
    if (soloLectura) return
    if (alternativasDe === clave) {
      setAlternativasDe(null)
      return
    }
    setAlternativasDe(clave)
    setAlternativas([])
    setErrorAlternativas('')
    setCargandoAlternativas(true)
    try {
      const res = await fetch('/api/dietas/alternativas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grupo: alimento.grupo,
          equivalentes: alimento.equivalentes,
          descripcion: alimento.descripcion || NOMBRE_GRUPO[alimento.grupo],
          contexto,
          paciente_id: paciente?.id,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAlternativas(data.alternativas ?? [])
        if ((data.alternativas ?? []).length === 0) {
          setErrorAlternativas('La IA no encontró alternativas para este alimento.')
        }
      } else {
        setErrorAlternativas(data.error || 'No se pudieron obtener alternativas')
      }
    } catch {
      setErrorAlternativas('Error de conexión')
    } finally {
      setCargandoAlternativas(false)
    }
  }

  /** Aplica una alternativa a un alimento de la dieta precisa. */
  const aplicarAlternativa = (
    tiempoId: string,
    idx: number,
    alt: { descripcion: string; calculo?: string }
  ) => {
    setDietaIA((d) =>
      d
        ? d.map((t) =>
            t.id === tiempoId
              ? {
                  ...t,
                  alimentos: t.alimentos.map((a, i) =>
                    i === idx
                      ? { ...a, descripcion: alt.descripcion, calculo: alt.calculo }
                      : a
                  ),
                }
              : t
          )
        : d
    )
    setAlternativasDe(null)
    // Resalta el cambio, igual que cuando lo hace el chat.
    resaltarCambios([`${tiempoId}|${idx}`])
  }

  /** Aplica una alternativa a un ingrediente del recetario. */
  const aplicarAlternativaRecetario = (
    tiempoId: string,
    idxOpcion: number,
    idxAlimento: number,
    alt: { descripcion: string; calculo?: string }
  ) => {
    editarIngrediente(tiempoId, idxOpcion, idxAlimento, {
      descripcion: alt.descripcion,
      calculo: alt.calculo,
    })
    setAlternativasDe(null)
  }

  /** Fija o libera un alimento para que la IA no lo modifique. */
  const alternarFijado = (tiempoId: string, idx: number) => {
    if (soloLectura) return
    setDietaIA((d) =>
      d
        ? d.map((t) =>
            t.id === tiempoId
              ? {
                  ...t,
                  alimentos: t.alimentos.map((a, i) =>
                    i === idx ? { ...a, fijado: !a.fijado } : a
                  ),
                }
              : t
          )
        : d
    )
  }

  /** Quita un alimento del tiempo. El cuadre se recalcula solo. */
  const eliminarAlimento = (tiempoId: string, idx: number) => {
    if (soloLectura) return
    setDietaIA((d) =>
      d
        ? d.map((t) =>
            t.id === tiempoId
              ? { ...t, alimentos: t.alimentos.filter((_, i) => i !== idx) }
              : t
          )
        : d
    )
    setAlimentoNuevo(null)
  }

  /**
   * Añade un alimento al tiempo. La descripción se deja en blanco a propósito:
   * el nutriólogo la escribe, y el aporte ya cuenta por grupo y equivalentes.
   */
  const agregarAlimento = (tiempoId: string, grupo: GrupoSMAEId, equivalentes: number) => {
    if (soloLectura) return
    let indiceNuevo = 0
    setDietaIA((d) =>
      d
        ? d.map((t) => {
            if (t.id !== tiempoId) return t
            indiceNuevo = t.alimentos.length
            return {
              ...t,
              alimentos: [
                ...t.alimentos,
                { grupo, equivalentes, descripcion: '', calculo: undefined },
              ],
            }
          })
        : d
    )
    setAlimentoNuevo(null)
    // Marca el nuevo para animarlo y lo desmarca al terminar la animación.
    setRecienAgregado(`${tiempoId}|${indiceNuevo}`)
    window.setTimeout(() => setRecienAgregado(null), 400)
  }

  /** Ajusta los equivalentes de un alimento (el cuadre se recalcula en vivo). */
  const cambiarEquivalentes = (tiempoId: string, idx: number, valor: number) => {
    if (soloLectura) return
    const n = Math.max(0.5, Math.round(valor * 2) / 2)
    setDietaIA((d) =>
      d
        ? d.map((t) =>
            t.id === tiempoId
              ? {
                  ...t,
                  alimentos: t.alimentos.map((a, i) =>
                    i === idx ? { ...a, equivalentes: n } : a
                  ),
                }
              : t
          )
        : d
    )
  }

  // ============================================================
  // Edición del recetario (opciones de platillo por tiempo)
  // ============================================================

  /** Aplica un cambio a una opción concreta de un tiempo del recetario. */
  const editarOpcion = (
    tiempoId: string,
    idxOpcion: number,
    cambio: Partial<OpcionUI>
  ) => {
    if (soloLectura) return
    setRecetario((r) =>
      r
        ? {
            ...r,
            tiempos: r.tiempos.map((t) =>
              t.id === tiempoId
                ? {
                    ...t,
                    opciones: t.opciones.map((o, i) => (i === idxOpcion ? { ...o, ...cambio } : o)),
                  }
                : t
            ),
          }
        : r
    )
  }

  /** Reemplaza las opciones de un tiempo (para añadir, quitar o reordenar). */
  const setOpciones = (tiempoId: string, fn: (ops: OpcionUI[]) => OpcionUI[]) => {
    if (soloLectura) return
    setRecetario((r) =>
      r
        ? {
            ...r,
            tiempos: r.tiempos.map((t) =>
              t.id === tiempoId ? { ...t, opciones: fn(t.opciones) } : t
            ),
          }
        : r
    )
  }

  /** Añade una opción vacía al final del tiempo. */
  const agregarOpcion = (tiempoId: string) => {
    setOpciones(tiempoId, (ops) => [...ops, { nombre: '', alimentos: [], preparacion: '' }])
  }

  /** Quita una opción del tiempo. */
  const eliminarOpcion = (tiempoId: string, idxOpcion: number) => {
    setOpciones(tiempoId, (ops) => ops.filter((_, i) => i !== idxOpcion))
  }

  /** Duplica una opción, para hacerle una variante sin empezar de cero. */
  const duplicarOpcion = (tiempoId: string, idxOpcion: number) => {
    setOpciones(tiempoId, (ops) => {
      const original = ops[idxOpcion]
      if (!original) return ops
      const copia: OpcionUI = {
        nombre: original.nombre ? `${original.nombre} (variante)` : '',
        // Copia profunda de los alimentos: si no, editar la copia tocaría el original.
        alimentos: original.alimentos.map((a) => ({ ...a })),
        preparacion: original.preparacion,
      }
      return [...ops.slice(0, idxOpcion + 1), copia, ...ops.slice(idxOpcion + 1)]
    })
  }

  /** Mueve una opción arriba o abajo dentro de su tiempo. */
  const moverOpcion = (tiempoId: string, idxOpcion: number, direccion: -1 | 1) => {
    setOpciones(tiempoId, (ops) => {
      const destino = idxOpcion + direccion
      if (destino < 0 || destino >= ops.length) return ops
      const copia = [...ops]
      const a = copia[idxOpcion]
      const b = copia[destino]
      if (!a || !b) return ops
      copia[idxOpcion] = b
      copia[destino] = a
      return copia
    })
  }

  /** Cambia un ingrediente de una opción (descripción, equivalentes o fijado). */
  const editarIngrediente = (
    tiempoId: string,
    idxOpcion: number,
    idxAlimento: number,
    cambio: Partial<AlimentoUI>
  ) => {
    if (soloLectura) return
    setRecetario((r) =>
      r
        ? {
            ...r,
            tiempos: r.tiempos.map((t) =>
              t.id === tiempoId
                ? {
                    ...t,
                    opciones: t.opciones.map((o, i) =>
                      i === idxOpcion
                        ? {
                            ...o,
                            alimentos: o.alimentos.map((a, j) =>
                              j === idxAlimento ? { ...a, ...cambio } : a
                            ),
                          }
                        : o
                    ),
                  }
                : t
            ),
          }
        : r
    )
  }

  /** Quita un ingrediente de una opción. */
  const eliminarIngrediente = (tiempoId: string, idxOpcion: number, idxAlimento: number) => {
    if (soloLectura) return
    setRecetario((r) =>
      r
        ? {
            ...r,
            tiempos: r.tiempos.map((t) =>
              t.id === tiempoId
                ? {
                    ...t,
                    opciones: t.opciones.map((o, i) =>
                      i === idxOpcion
                        ? { ...o, alimentos: o.alimentos.filter((_, j) => j !== idxAlimento) }
                        : o
                    ),
                  }
                : t
            ),
          }
        : r
    )
  }

  /** Añade un ingrediente a una opción. */
  const agregarIngrediente = (
    tiempoId: string,
    idxOpcion: number,
    grupo: GrupoSMAEId,
    equivalentes: number
  ) => {
    if (soloLectura) return
    setRecetario((r) =>
      r
        ? {
            ...r,
            tiempos: r.tiempos.map((t) =>
              t.id === tiempoId
                ? {
                    ...t,
                    opciones: t.opciones.map((o, i) =>
                      i === idxOpcion
                        ? { ...o, alimentos: [...o.alimentos, { grupo, equivalentes, descripcion: '' }] }
                        : o
                    ),
                  }
                : t
            ),
          }
        : r
    )
    setIngredienteNuevo(null)
  }

  const construirPayload = (guardar: boolean) => ({
    paciente_id: paciente!.id,
    consulta_id: consultaId || undefined,
    peso: Number(form.peso),
    talla_cm: Number(form.talla_cm),
    edad: Number(form.edad),
    sexo: form.sexo,
    nivel_actividad: form.nivel_actividad,
    objetivo: form.objetivo,
    formula: form.formula,
    mlg_kg: form.mlg_kg ? Number(form.mlg_kg) : undefined,
    pct_proteina: pct.pro,
    pct_grasa: pct.lip,
    pct_carbohidrato: pct.hco,
    kcal_meta_manual: kcalEditada ? kcalMeta : undefined,
    equivalentes,
    distribucion_tiempos: Object.keys(reparto).length ? { tiempos, reparto } : undefined,
    notas: form.notas || undefined,
    guardar,
  })

  // Refresca el contexto del autoguardado. Sin array de dependencias: se
  // actualiza en cada render, que es lo que elimina de raíz los closures
  // obsoletos. Vive aquí abajo porque necesita `construirPayload`.
  useEffect(() => {
    const previo = ctxGuardado.current
    // Los ids que capturó el autoguardado mandan sobre el estado hasta que React
    // lo refleje: si aquí volviéramos a poner el `cuadroId` viejo (null), el
    // siguiente guardado crearía un cuadro duplicado. Al cambiar de paciente el
    // estado sí gana, porque entonces `paciente` cambia.
    const mismoPaciente = previo.paciente?.id === paciente?.id
    ctxGuardado.current = {
      paciente,
      cuadroId: cuadroId ?? (mismoPaciente ? previo.cuadroId : null),
      dietaId: dietaId ?? (mismoPaciente ? previo.dietaId : null),
      soloLectura,
      recetario,
      dietaIA,
      generando,
      chateando,
      finalizando,
      // `construirPayload` usa `paciente!`, así que solo con paciente elegido.
      payloadCuadro: paciente ? construirPayload(false) : null,
    }
  })

  const requiereMlg = FORMULAS_MLG.includes(form.formula)

  const calcular = async () => {
    setError('')
    setExito('')
    if (!pctOk) {
      setError('Los porcentajes de la distribución (HCO/Líp/Pro) deben sumar 100.')
      return
    }
    if (requiereMlg && !form.mlg_kg) {
      setError(
        'Esta fórmula requiere la masa libre de grasa (MLG). Escríbela o elige otra fórmula.'
      )
      return
    }
    setCalculando(true)
    try {
      const res = await fetch('/api/dietas/cuadros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(construirPayload(false)),
      })
      const data = await res.json()
      if (res.ok) {
        setResultado(data.resultado)
      } else {
        setError(data.error || 'Error al calcular')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setCalculando(false)
    }
  }

  // ¿Ya hay algo repartido en tiempos de comida?
  const tieneDistribucion = Object.keys(reparto).some((tid) =>
    Object.values(reparto[tid] ?? {}).some((n) => (n ?? 0) > 0)
  )

  // Al presionar guardar: muestra el aviso salvo que el usuario lo haya omitido.
  const intentarGuardar = () => {
    if (noVolverAvisar) {
      guardar()
    } else {
      setConfirmando(true)
    }
  }

  // Confirma desde el modal: persiste la preferencia y guarda.
  const confirmarGuardar = () => {
    if (noVolverAvisar) {
      localStorage.setItem('dietas.omitirAvisoGuardar', '1')
    }
    setConfirmando(false)
    guardar()
  }

  const guardar = async () => {
    setError('')
    setExito('')
    setGuardando(true)
    try {
      const res = await fetch('/api/dietas/cuadros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(construirPayload(true)),
      })
      const data = await res.json()
      if (res.ok) {
        setResultado(data.resultado)
        // Guardamos el id para poder colgarle después la dieta sin duplicar cuadro.
        if (data.cuadro?.id) setCuadroId(data.cuadro.id)
        setExito('Dieta guardada como nueva versión.')
        if (paciente) cargarHistorial(paciente.id) // refresca el historial
      } else {
        setError(data.error || 'Error al guardar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  // --- Guardar / finalizar la dieta generada ---

  /**
   * Persiste la dieta o recetario que hay en pantalla. Con `finalizar` la cierra
   * como versión definitiva. Si el cuadro aún no está guardado, se crea en el
   * mismo paso: así el nutriólogo cierra desde aquí sin cambiar de pestaña.
   */
  const guardarDietaGenerada = async (finalizar: boolean) => {
    if (!paciente) return
    const contenidoTiempos = recetario ? recetario.tiempos : dietaIA
    if (!contenidoTiempos || contenidoTiempos.length === 0) {
      setError('Primero genera la dieta o el recetario.')
      return
    }
    // Segunda barrera: los botones ya están deshabilitados, pero si algo cambió
    // entre el clic y el envío, no queremos guardar una dieta incompleta.
    if (finalizar && validacionGuardado.bloqueos.length > 0) {
      setError(validacionGuardado.bloqueos[0] ?? 'La dieta tiene datos incompletos.')
      setConfirmandoFinalizar(false)
      return
    }
    setError('')
    setExito('')
    // Este guardado manda: que no se cruce con uno automático a medio camino.
    cancelarAutoguardado()
    setFinalizando(true)
    const modo = recetario ? ('RECETARIO' as const) : ('DIETA' as const)
    try {
      const res = await fetch('/api/dietas/dietas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuadro_id: cuadroId ?? undefined,
          dieta_id: dietaId ?? undefined,
          // Si el cuadro no está guardado, mandamos sus datos para crearlo.
          cuadro: cuadroId ? undefined : construirPayload(false),
          modo,
          contenido: { tiempos: contenidoTiempos },
          indicaciones_inicio: recetario?.indicacionesInicio || undefined,
          finalizar,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCuadroId(data.cuadro_id ?? cuadroId)
        setDietaId(data.dieta?.id ?? null)
        setEstadoDieta(data.dieta?.estado ?? 'BORRADOR')
        // Lo que acabamos de mandar ya está persistido: que el autoguardado no
        // lo repita, y que el indicador refleje este guardado.
        firmaGuardada.current = firmaContenido({
          modo,
          tiempos: contenidoTiempos,
          indicacionesInicio: recetario?.indicacionesInicio ?? '',
        })
        setGuardadoEn(new Date())
        setEstadoAutoguardado('guardado')
        // Toast: la pestaña de IA no renderiza el aviso de éxito, así que el
        // guardado más importante de la sección pasaba desapercibido.
        if (finalizar) {
          toast.exito('Dieta guardada', {
            descripcion: 'Es la versión definitiva. Para cambiarla, pulsa Editar.',
          })
        } else {
          toast.exito('Progreso guardado')
        }
        cargarHistorial(paciente.id)
      } else {
        setError(data.error || 'Error al guardar la dieta')
      }
    } catch {
      setError('Error de conexión al guardar la dieta')
    } finally {
      setFinalizando(false)
      setConfirmandoFinalizar(false)
    }
  }


  /** Duplica la dieta finalizada en pantalla para trabajar una versión nueva. */
  const crearVersionNueva = async () => {
    if (!dietaId) return
    setError('')
    setExito('')
    setFinalizando(true)
    try {
      const res = await fetch(`/api/dietas/dietas/${dietaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'reabrir' }),
      })
      const data = await res.json()
      if (res.ok) {
        setEstadoDieta('BORRADOR')
        // Vuelve a ser editable: el autoguardado se reactiva (si se había
        // bloqueado por un 409 contra la versión que acabamos de reabrir).
        autoguardadoBloqueado.current = false
        toast.info('Ya puedes editar la dieta', {
          descripcion: 'Se guarda sola mientras trabajas.',
        })
        if (paciente) cargarHistorial(paciente.id)
      } else {
        setError(data.error || 'No se pudo abrir la dieta para editar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setFinalizando(false)
    }
  }

  const datosMinimos = form.peso && form.talla_cm && form.edad

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dietas</h1>
        <p className={styles.subtitle}>
          Cuadro dietosintético: captura los datos del paciente y el sistema calcula sus
          requerimientos energéticos y de macronutrientes.
        </p>
      </div>

      {/* Selector de paciente */}
      {!paciente ? (
        <>
        <div className={styles.buscador}>
          <div className={styles.buscadorInputWrap}>
            <svg
              className={styles.buscadorIcono}
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="9" cy="9" r="6" />
              <path strokeLinecap="round" d="M14 14l3.5 3.5" />
            </svg>
            <input
              type="text"
              className={styles.buscadorInput}
              placeholder="Busca un paciente por nombre o email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className={styles.buscadorLimpiar}
                onClick={() => setQuery('')}
                title="Limpiar"
              >
                ×
              </button>
            )}
          </div>
          {resultados.length > 0 && (
            <div className={styles.resultados}>
              {resultados.map((p) => (
                <button
                  key={p.id}
                  className={styles.resultadoItem}
                  onClick={() => seleccionarPaciente(p)}
                >
                  <span className={styles.resultadoAvatar}>{p.nombre.charAt(0).toUpperCase()}</span>
                  <span className={styles.resultadoInfo}>
                    <span className={styles.resultadoNombre}>{p.nombre}</span>
                    <span className={styles.resultadoEmail}>{p.email}</span>
                  </span>
                  <svg
                    className={styles.resultadoFlecha}
                    width="18"
                    height="18"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4l6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resumen del trabajo: solo mientras no hay un paciente elegido. */}
        <ResumenDietas onAbrir={abrirDesdeResumen} />
        </>
      ) : (
        <div className={styles.pacienteSel}>
          <div className={styles.pacienteSelIdentidad}>
            <span className={styles.pacienteSelAvatar}>
              {paciente.nombre.charAt(0).toUpperCase()}
            </span>
            <div className={styles.pacienteSelTexto}>
              <span className={styles.pacienteSelNombre}>{paciente.nombre}</span>
              <span className={styles.pacienteSelEmail}>{paciente.email}</span>

              {/* Restricciones del paciente: van con él, no en una franja aparte */}
              {restricciones &&
                (restricciones.alergias ||
                  restricciones.intolerancias ||
                  restricciones.preferencias ||
                  restricciones.disgustos) && (
                  <div className={styles.restriccionesChips}>
                    {restricciones.alergias && (
                      <span
                        className={`${styles.restriccionChip} ${styles.restriccionChipAlergia}`}
                        title="Alergias: la IA nunca las propondrá"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                          <path strokeLinecap="round" d="M12 9v4M12 17v.5" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 3.9L2.4 17.1A2 2 0 004.1 20h15.8a2 2 0 001.7-2.9L13.7 3.9a2 2 0 00-3.4 0z" />
                        </svg>
                        {restricciones.alergias}
                      </span>
                    )}
                    {restricciones.intolerancias && (
                      <span className={styles.restriccionChip} title="Intolerancias">
                        {restricciones.intolerancias}
                      </span>
                    )}
                    {restricciones.preferencias && (
                      <span className={styles.restriccionChip} title="Preferencias">
                        {restricciones.preferencias}
                      </span>
                    )}
                    {restricciones.disgustos && (
                      <span className={styles.restriccionChip} title="No le gustan">
                        {restricciones.disgustos}
                      </span>
                    )}
                  </div>
                )}
            </div>
          </div>

          {consultas.length > 0 && (
            <div className={styles.pacienteSelConsulta}>
              <label htmlFor="consultaBarra">Basar en consulta</label>
              <select
                id="consultaBarra"
                value={consultaId}
                onChange={(e) => cambiarConsultaBase(e.target.value)}
              >
                <option value="">Ninguna (última consulta)</option>
                {consultas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {new Date(c.fecha).toLocaleDateString('es-MX', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {c.peso ? ` · ${c.peso} kg` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button className={styles.cambiarBtn} onClick={cambiarPaciente}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M16 16v-5h-5" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 9a6 6 0 0110.5-2.5M15.5 11a6 6 0 01-10.5 2.5"
              />
            </svg>
            Cambiar
          </button>
        </div>
      )}

      {/* Historial de cuadros guardados */}
      {paciente && historial.length > 0 && (
        <div className={styles.historial}>
          <div className={styles.historialHeader}>
            <button
              className={styles.historialToggle}
              onClick={alternarHistorial}
              aria-expanded={!historialColapsado}
              title={historialColapsado ? 'Mostrar los cuadros' : 'Ocultar los cuadros'}
            >
              <span
                className={`${styles.historialFlecha} ${
                  historialColapsado ? styles.historialFlechaCerrada : ''
                }`}
                aria-hidden
              >
                ▾
              </span>
              Cuadros guardados
              <span className={styles.historialTotal}>{historialTotal}</span>
            </button>
            {!historialColapsado && historialTotalPaginas > 1 && (
              <div className={styles.paginacion}>
                <button
                  className={styles.pagBtn}
                  onClick={() => irAPagina(historialPagina - 1)}
                  disabled={historialPagina <= 1 || cargandoHistorial}
                  aria-label="Página anterior"
                >
                  ‹
                </button>
                <span className={styles.pagInfo}>
                  {historialPagina} / {historialTotalPaginas}
                </span>
                <button
                  className={styles.pagBtn}
                  onClick={() => irAPagina(historialPagina + 1)}
                  disabled={historialPagina >= historialTotalPaginas || cargandoHistorial}
                  aria-label="Página siguiente"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          {/* Contenedor plegable: anima la altura sin tener que medirla en JS. */}
          <div
            className={`${styles.historialPlegable} ${
              historialColapsado ? styles.historialPlegableCerrado : ''
            }`}
          >
          <div className={styles.historialPlegableInner}>
          <div
            className={`${styles.cuadrosGrid} ${cargandoHistorial ? styles.cuadrosGridCargando : ''}`}
          >
            {historial.map((h) => {
              const tieneFinalizada = h.dietas?.some((d) => d.estado === 'FINALIZADA') ?? false
              const dietaVer = h.dietas?.[0]
              const abierto = cuadroId === h.id
              return (
                <div
                  key={h.id}
                  className={`${styles.cuadroCard} ${tieneFinalizada ? styles.cuadroCardFinal : ''} ${
                    abierto ? styles.cuadroCardAbierto : ''
                  }`}
                >
                  {/* Encabezado: fecha + menú de acciones */}
                  <div className={styles.cuadroCardTop}>
                    <span className={styles.cuadroFecha}>
                      {new Date(h.createdAt).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <div className={styles.cuadroMenuWrap}>
                      <button
                        className={styles.cuadroMenuBtn}
                        onClick={() => setMenuCuadro(menuCuadro === h.id ? null : h.id)}
                        aria-label="Acciones del cuadro"
                        title="Más acciones"
                      >
                        ⋮
                      </button>
                      {menuCuadro === h.id && (
                        <>
                          <div className={styles.menuBackdrop} onClick={() => setMenuCuadro(null)} />
                          <div className={styles.cuadroMenu}>
                            {dietaVer && (
                              <button
                                onClick={() => {
                                  setMenuCuadro(null)
                                  cargarCuadro(h.id)
                                }}
                              >
                                Ver la dieta
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setMenuCuadro(null)
                                setRenombrando(h.id)
                                setEtiquetaTexto(h.etiqueta ?? '')
                              }}
                            >
                              {h.etiqueta ? 'Renombrar' : 'Poner nombre'}
                            </button>
                            <button onClick={() => duplicarCuadro(h.id)}>Duplicar</button>
                            <button
                              className={styles.menuPeligro}
                              onClick={() => {
                                setMenuCuadro(null)
                                setConfirmandoBorrar(h.id)
                              }}
                              disabled={tieneFinalizada}
                              title={
                                tieneFinalizada
                                  ? 'No se puede eliminar: tiene una dieta definitiva'
                                  : ''
                              }
                            >
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Etiqueta editable */}
                  {renombrando === h.id ? (
                    <input
                      className={styles.cuadroEtiquetaInput}
                      value={etiquetaTexto}
                      onChange={(e) => setEtiquetaTexto(e.target.value)}
                      onBlur={() => guardarEtiqueta(h.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') guardarEtiqueta(h.id)
                        if (e.key === 'Escape') setRenombrando(null)
                      }}
                      placeholder="Ej. Etapa 1 - déficit"
                      maxLength={60}
                      autoFocus
                    />
                  ) : (
                    h.etiqueta && <span className={styles.cuadroEtiqueta}>{h.etiqueta}</span>
                  )}

                  {/* Datos clave */}
                  <div className={styles.cuadroDatos}>
                    <span className={styles.cuadroKcal}>{Math.round(h.kcal_meta)} kcal</span>
                    <span className={styles.cuadroMeta}>
                      {NOMBRE_OBJETIVO[h.objetivo] ?? h.objetivo}
                    </span>
                    <span className={styles.cuadroMeta}>
                      IMC {h.imc.toFixed(1)}
                      {h.peso != null && ` · ${h.peso} kg`}
                    </span>
                  </div>

                  {/* Estado + abrir */}
                  <div className={styles.cuadroCardPie}>
                    {tieneFinalizada ? (
                      <span className={styles.chipFinalizada}>✓ Guardada</span>
                    ) : dietaVer ? (
                      <span className={styles.chipBorrador}>Borrador</span>
                    ) : (
                      <span className={styles.chipSinDieta}>Sin dieta</span>
                    )}
                    <button className={styles.cuadroAbrir} onClick={() => cargarCuadro(h.id)}>
                      {abierto ? 'Abierto' : 'Abrir'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          </div>
          </div>
        </div>
      )}
      {paciente && cargandoHistorial && historial.length === 0 && (
        <p className={styles.historialVacio}>Buscando cuadros guardados…</p>
      )}

      {/* Pestañas */}
      {paciente && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${pestana === 'cuadro' ? styles.tabActivo : ''}`}
            onClick={() => setPestana('cuadro')}
          >
            Cuadro dietosintético
          </button>
          <button
            className={`${styles.tab} ${pestana === 'tiempos' ? styles.tabActivo : ''}`}
            onClick={() => setPestana('tiempos')}
            disabled={!resultado}
            title={!resultado ? 'Primero calcula el cuadro' : ''}
          >
            Distribución en tiempos
          </button>
          <button
            className={`${styles.tab} ${pestana === 'ia' ? styles.tabActivo : ''}`}
            onClick={() => setPestana('ia')}
            disabled={!resultado || gruposConEquiv.length === 0}
            title={
              !resultado
                ? 'Primero calcula el cuadro'
                : gruposConEquiv.length === 0
                  ? 'Primero define equivalentes'
                  : ''
            }
          >
            Generar con IA ✨
          </button>
        </div>
      )}

      {/* Alérgenos encontrados en la dieta ya generada: red de seguridad */}
      {alergenosDetectados.length > 0 && (
        <div className={styles.alergenoAlerta}>
          <div className={styles.alergenoTitulo}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <path strokeLinecap="round" d="M12 9v4M12 17v.5" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            Revisa: puede haber un alérgeno en la dieta
          </div>
          <ul className={styles.alergenoLista}>
            {alergenosDetectados.map((h, i) => (
              <li key={i}>
                <strong>{h.declarado}</strong> — «{h.texto}» en {h.ubicacion}
              </li>
            ))}
          </ul>
          <p className={styles.alergenoNota}>
            Comprobación automática sobre el texto de la dieta: puede dar falsos positivos y no
            detecta ingredientes que no se nombran. Revísalo tú.
          </p>
        </div>
      )}

      {/* Dieta guardada: el cuadro y la distribución quedan en solo lectura */}
      {paciente && soloLectura && pestana !== 'ia' && (
        <div className={styles.avisoFinalizada}>
          <svg
            className={styles.avisoFinalizadaIcono}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
          </svg>
          <span className={styles.avisoFinalizadaTexto}>
            Dieta guardada · el cuadro no se puede modificar
          </span>
          <Button variant="secondary" onClick={() => setPestana('ia')}>
            Ver la dieta
          </Button>
        </div>
      )}

      {paciente && pestana === 'cuadro' && (
        <div className={styles.grid}>
          {/* Columna izquierda: datos del paciente */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Datos del paciente</h2>

            {consultaId && (
              <p className={styles.consultaLigadaAviso}>
                Datos tomados de la consulta seleccionada; la dieta quedará ligada a ella.
              </p>
            )}

            {/* Una dieta finalizada no se edita: el fieldset bloquea de golpe
                todos los campos que contiene. */}
            <fieldset className={styles.fieldsetPlano} disabled={soloLectura}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="peso">Peso (kg)</label>
                <input
                  id="peso"
                  type="number"
                  step="0.1"
                  value={form.peso}
                  onChange={(e) => setCampo('peso', e.target.value)}
                  placeholder="80"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="talla">Talla (cm)</label>
                <input
                  id="talla"
                  type="number"
                  step="1"
                  value={form.talla_cm}
                  onChange={(e) => setCampo('talla_cm', e.target.value)}
                  placeholder="180"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="edad">Edad (años)</label>
                <input
                  id="edad"
                  type="number"
                  step="1"
                  value={form.edad}
                  onChange={(e) => setCampo('edad', e.target.value)}
                  placeholder="30"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="sexo">Sexo</label>
                <select
                  id="sexo"
                  value={form.sexo}
                  onChange={(e) => setCampo('sexo', e.target.value)}
                >
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="actividad">Nivel de actividad</label>
              <select
                id="actividad"
                value={form.nivel_actividad}
                onChange={(e) => setCampo('nivel_actividad', e.target.value)}
              >
                {ACTIVIDADES.map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="objetivo">Objetivo</label>
              <select
                id="objetivo"
                value={form.objetivo}
                onChange={(e) => setCampo('objetivo', e.target.value)}
              >
                {OBJETIVOS.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="formula">Fórmula (gasto en reposo)</label>
                <select
                  id="formula"
                  value={form.formula}
                  onChange={(e) => setCampo('formula', e.target.value)}
                >
                  {FORMULAS.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              {requiereMlg && (
                <div className={styles.formGroup}>
                  <label htmlFor="mlg">Masa libre de grasa (kg)</label>
                  <input
                    id="mlg"
                    type="number"
                    step="0.1"
                    value={form.mlg_kg}
                    onChange={(e) => setCampo('mlg_kg', e.target.value)}
                    placeholder="Ej: 65"
                  />
                  <small className={styles.campoAyuda}>
                    Se calcula del % de grasa de la consulta: peso × (1 − %grasa/100). Si la consulta
                    no tiene % de grasa, escríbela a mano.
                  </small>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="notas">Notas (opcional)</label>
              <textarea
                id="notas"
                rows={2}
                value={form.notas}
                onChange={(e) => setCampo('notas', e.target.value)}
                placeholder="Observaciones sobre el cuadro…"
              />
            </div>
            </fieldset>
          </div>

          {/* Columna derecha: resultado + cuadro de distribución (apilados) */}
          <div className={styles.columna}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Resultado</h2>
              {!resultado ? (
                <p className={styles.resultadoVacio}>
                  Llena los datos y presiona <strong>Calcular</strong> para ver los requerimientos.
                </p>
              ) : (
                <div className={styles.entrada} key={`res-${cargaId}`}>
                  <div className={`${styles.metricaFila} ${styles.metricaDestacada}`}>
                    <span className={styles.metricaLabel}>Kcal meta / día</span>
                    <span className={styles.kcalEditable}>
                      <input
                        type="number"
                        className={styles.kcalInput}
                        value={kcalOverride !== null ? kcalOverride : Math.round(kcalCalculada)}
                        onChange={(e) => setKcalOverride(e.target.value)}
                        aria-label="Kcal meta editable"
                      />
                      <span className={styles.kcalUnidad}>kcal</span>
                      {kcalEditada && (
                        <button
                          type="button"
                          className={styles.recalcularBtn}
                          onClick={() => setKcalOverride(null)}
                          title={`Volver al valor calculado (${Math.round(kcalCalculada)} kcal)`}
                        >
                          ↻
                        </button>
                      )}
                    </span>
                  </div>
                  {kcalEditada && (
                    <p className={styles.kcalAviso}>
                      Valor manual. Calculado: {Math.round(kcalCalculada)} kcal.
                    </p>
                  )}
                  <div className={styles.metricaFila}>
                    <span className={styles.metricaLabel}>Gasto energético basal (GEB)</span>
                    <span className={styles.metricaValor}>{resultado.geb} kcal</span>
                  </div>
                  <div className={styles.metricaFila}>
                    <span className={styles.metricaLabel}>Gasto energético total (GET)</span>
                    <span className={styles.metricaValor}>{resultado.get} kcal</span>
                  </div>
                  <div className={styles.metricaFila}>
                    <span className={styles.metricaLabel}>IMC</span>
                    <span className={styles.metricaValor}>
                      {resultado.imc}{' '}
                      <span className={styles.badge}>{resultado.clasificacionImc}</span>
                    </span>
                  </div>
                  <div className={styles.metricaFila}>
                    <span className={styles.metricaLabel}>Peso ideal (ref.)</span>
                    <span className={styles.metricaValor}>{resultado.pesoIdeal} kg</span>
                  </div>

                  {distribucion && (
                    <div className={styles.macrosGrid}>
                      <div className={styles.macroCard}>
                        <div className={styles.macroNombre}>Proteína</div>
                        <p className={styles.macroGramos}>
                          {distribucion[2]!.gramos}
                          <span className={styles.macroUnidad}>g</span>
                        </p>
                        <span className={styles.macroKcal}>{distribucion[2]!.kcal} kcal</span>
                      </div>
                      <div className={styles.macroCard}>
                        <div className={styles.macroNombre}>Grasa</div>
                        <p className={styles.macroGramos}>
                          {distribucion[1]!.gramos}
                          <span className={styles.macroUnidad}>g</span>
                        </p>
                        <span className={styles.macroKcal}>{distribucion[1]!.kcal} kcal</span>
                      </div>
                      <div className={styles.macroCard}>
                        <div className={styles.macroNombre}>Carbohidrato</div>
                        <p className={styles.macroGramos}>
                          {distribucion[0]!.gramos}
                          <span className={styles.macroUnidad}>g</span>
                        </p>
                        <span className={styles.macroKcal}>{distribucion[0]!.kcal} kcal</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cuadro de distribución — debajo de Resultado */}
            {distribucion && (
              <div className={styles.card}>
                <h3 className={styles.subCardTitle}>Cuadro de distribución</h3>
                <p className={styles.smaeAyuda}>
                  Ajusta el % de cada macronutriente; recalcula kcal, gramos y la META de la tabla
                  de abajo.
                </p>
                <div className={styles.tablaWrap}>
                  <table className={`${styles.tablaSmae} ${styles.tablaDist}`}>
                    <thead>
                      <tr>
                        <th className={styles.thDistNombre}></th>
                        <th>Porcentaje</th>
                        <th>Kcal</th>
                        <th>Gramos</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={styles.tdGrupo}>HCO</td>
                        <td className={styles.tdPct}>
                          <input
                            type="number"
                            className={styles.pctInput}
                            value={pct.hco}
                            onChange={(e) => setPctCampo('hco', e.target.value)}
                            aria-label="Porcentaje de HCO"
                          />
                          <span className={styles.pctSigno}>%</span>
                        </td>
                        <td className={styles.tdNum}>{distribucion[0]!.kcal}</td>
                        <td className={styles.tdNum}>{distribucion[0]!.gramos}</td>
                      </tr>
                      <tr>
                        <td className={styles.tdGrupo}>Lípidos</td>
                        <td className={styles.tdPct}>
                          <input
                            type="number"
                            className={styles.pctInput}
                            value={pct.lip}
                            onChange={(e) => setPctCampo('lip', e.target.value)}
                            aria-label="Porcentaje de lípidos"
                          />
                          <span className={styles.pctSigno}>%</span>
                        </td>
                        <td className={styles.tdNum}>{distribucion[1]!.kcal}</td>
                        <td className={styles.tdNum}>{distribucion[1]!.gramos}</td>
                      </tr>
                      <tr>
                        <td className={styles.tdGrupo}>Proteína</td>
                        <td className={styles.tdPct}>
                          <input
                            type="number"
                            className={styles.pctInput}
                            value={pct.pro}
                            onChange={(e) => setPctCampo('pro', e.target.value)}
                            aria-label="Porcentaje de proteína"
                          />
                          <span className={styles.pctSigno}>%</span>
                        </td>
                        <td className={styles.tdNum}>{distribucion[2]!.kcal}</td>
                        <td className={styles.tdNum}>{distribucion[2]!.gramos}</td>
                      </tr>
                      <tr className={styles.filaMeta}>
                        <td className={styles.tdGrupo}>HCO simples (máx.)</td>
                        <td className={styles.tdNum}>{distribucion[3]!.porcentaje}%</td>
                        <td className={styles.tdNum}>{distribucion[3]!.kcal}</td>
                        <td className={styles.tdNum}>{distribucion[3]!.gramos}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className={styles.filaTotal}>
                        <td className={styles.tdGrupo}>Suma</td>
                        <td className={pctOk ? styles.difOk : styles.difLejos}>
                          {sumaPct}% {pctOk ? '✓' : '(≠100)'}
                        </td>
                        <td className={styles.tdNum}></td>
                        <td className={styles.tdNum}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra de acciones al final de la pestaña 1 */}
      {paciente && pestana === 'cuadro' && (
        <div className={styles.barraAcciones}>
          <Button onClick={calcular} disabled={!datosMinimos || calculando || soloLectura}>
            {calculando ? 'Calculando…' : 'Calcular'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPestana('tiempos')}
            disabled={!resultado}
            title={!resultado ? 'Primero calcula el cuadro' : ''}
          >
            Continuar a distribución →
          </Button>
        </div>
      )}
      {paciente && pestana === 'cuadro' && error && <p className={styles.error}>{error}</p>}
      {paciente && pestana === 'cuadro' && exito && <p className={styles.exito}>{exito}</p>}

      {/* Distribución por equivalentes (SMAE) — aparece al calcular */}
      {paciente && pestana === 'cuadro' && resultado && diferenciaSmae && distribucion && (
        <>
          <div className={styles.card} style={{ marginTop: 'var(--spacing-lg)' }}>
            <div className={styles.tiemposHeader}>
              <div>
                <h2 className={styles.cardTitle}>Distribución por grupos (SMAE)</h2>
                <p className={styles.smaeAyuda}>
                  Usa <strong>Proponer dieta balanceada</strong> para que el sistema calcule los
                  equivalentes de cada grupo y cuadren con la meta de macros (patrón saludable:
                  verduras, frutas, leguminosas, cereal integral, proteína magra y grasas buenas).
                  Púlsalo de nuevo para ver otra propuesta y ajusta a mano lo que quieras.
                </p>
              </div>
              <div className={styles.tiemposAcciones}>
                <Button
                  variant="primary"
                  onClick={proponerEquivalentes}
                  disabled={soloLectura}
                  title="Calcula automáticamente los equivalentes para cuadrar con la meta. Vuelve a pulsar para otra propuesta."
                >
                  <span className={styles.btnIconoIA} aria-hidden>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
                      <path
                        d="M19 14l.8 2.3L22 17l-2.2.7L19 20l-.8-2.3L16 17l2.2-.7L19 14z"
                        opacity="0.75"
                      />
                    </svg>
                  </span>
                  {variacionEquiv === 0 ? 'Proponer dieta balanceada' : 'Proponer otra dieta'}
                </Button>
              </div>
            </div>
            <div className={styles.pasoSelector}>
              <label htmlFor="paso">Paso entre porciones</label>
              <select
                id="paso"
                value={pasoEquiv}
                onChange={(e) => setPasoEquiv(Number(e.target.value))}
              >
                <option value={0.25}>0.25</option>
                <option value={0.5}>0.5</option>
                <option value={1}>1</option>
              </select>
            </div>
            <div className={styles.tablaWrap}>
              <table className={styles.tablaSmae}>
                <thead>
                  <tr>
                    <th className={styles.thGrupo}>Grupo</th>
                    <th className={styles.thEquiv}>Equivalentes</th>
                    <th>HCO</th>
                    <th>Prot</th>
                    <th>Líp</th>
                    <th>Kcal</th>
                  </tr>
                </thead>
                <tbody>
                  {GRUPOS_SMAE.map((g) => {
                    const n = equivalentes[g.id] ?? 0
                    return (
                      <tr key={g.id}>
                        <td className={styles.tdGrupo}>{g.nombre}</td>
                        <td>
                          <div className={styles.equivControl}>
                            <input
                              type="range"
                              min={0}
                              max={15}
                              step={pasoEquiv}
                              className={styles.equivSlider}
                              value={n}
                              onChange={(e) => setEquivalente(g.id, e.target.value)}
                              disabled={soloLectura}
                              aria-label={`Equivalentes de ${g.nombre}`}
                            />
                            <span className={styles.equivValor}>{fmtNum(n)}</span>
                          </div>
                        </td>
                        <td className={styles.tdNum}>{n ? fmtNum(g.hco * n) : '—'}</td>
                        <td className={styles.tdNum}>{n ? fmtNum(g.proteina * n) : '—'}</td>
                        <td className={styles.tdNum}>{n ? fmtNum(g.lipidos * n) : '—'}</td>
                        <td className={styles.tdNum}>{n ? fmtNum(g.kcal * n) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className={styles.filaTotal}>
                    <td className={styles.tdGrupo}>TOTAL</td>
                    <td></td>
                    <td className={styles.tdNum}>{totalesSmae.hco.toFixed(0)}</td>
                    <td className={styles.tdNum}>{totalesSmae.proteina.toFixed(0)}</td>
                    <td className={styles.tdNum}>{totalesSmae.lipidos.toFixed(0)}</td>
                    <td className={styles.tdNum}>{totalesSmae.kcal.toFixed(0)}</td>
                  </tr>
                  <tr className={styles.filaMeta}>
                    <td className={styles.tdGrupo}>META</td>
                    <td></td>
                    <td className={styles.tdNum}>
                      {resultado.macros.carbohidrato.gramos.toFixed(0)}
                    </td>
                    <td className={styles.tdNum}>{resultado.macros.proteina.gramos.toFixed(0)}</td>
                    <td className={styles.tdNum}>{resultado.macros.grasa.gramos.toFixed(0)}</td>
                    <td className={styles.tdNum}>{resultado.kcalMeta.toFixed(0)}</td>
                  </tr>
                  <tr className={styles.filaDif}>
                    <td className={styles.tdGrupo}>DIFERENCIA</td>
                    <td></td>
                    <td className={celdaDif(diferenciaSmae.hco)}>{fmtDif(diferenciaSmae.hco)}</td>
                    <td className={celdaDif(diferenciaSmae.proteina)}>
                      {fmtDif(diferenciaSmae.proteina)}
                    </td>
                    <td className={celdaDif(diferenciaSmae.lipidos)}>
                      {fmtDif(diferenciaSmae.lipidos)}
                    </td>
                    <td className={celdaDif(diferenciaSmae.kcal, 30)}>
                      {fmtDif(diferenciaSmae.kcal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* PESTAÑA 2: Distribución en tiempos de comida */}
      {paciente && pestana === 'tiempos' && resultado && (
        <div className={styles.tiemposWrap}>
          <div className={styles.tiemposHeader}>
            <div>
              <h2 className={styles.cardTitle}>Distribución en tiempos de comida</h2>
              <p className={styles.smaeAyuda}>
                Usa <strong>Distribuir automáticamente</strong> para que el sistema reparta los
                equivalentes con criterio nutricional (fruta y lácteos en colaciones; verduras,
                cereales y proteína en las comidas fuertes). Púlsalo de nuevo para ver{' '}
                <strong>otra propuesta</strong> igualmente válida, y ajusta a mano lo que quieras. La
                columna final avisa si un grupo quedó completo; el pie muestra el aporte de cada
                tiempo.
              </p>
            </div>
            <div className={styles.tiemposAcciones}>
              <Button
                variant="primary"
                onClick={distribuirAuto}
                disabled={gruposConEquiv.length === 0 || soloLectura}
                title="Reparte los equivalentes entre los tiempos con criterio nutricional. Vuelve a pulsar para otra propuesta."
              >
                <span className={styles.btnIconoIA} aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
                    <path d="M19 14l.8 2.3L22 17l-2.2.7L19 20l-.8-2.3L16 17l2.2-.7L19 14z" opacity="0.75" />
                  </svg>
                </span>
                {variacionDist === 0 ? 'Distribuir automáticamente' : 'Proponer otra distribución'}
              </Button>
              <Button variant="secondary" onClick={agregarTiempo} disabled={soloLectura}>
                + Agregar tiempo
              </Button>
            </div>
          </div>

          {gruposConEquiv.length === 0 ? (
            <p className={styles.resultadoVacio}>
              Primero define equivalentes en la pestaña <strong>Cuadro dietosintético</strong>.
            </p>
          ) : (
            <fieldset className={styles.fieldsetPlano} disabled={soloLectura}>
              <div className={styles.tablaWrap}>
                <table className={styles.tablaTiempos}>
                  <thead>
                    <tr>
                      <th className={styles.thGrupo}>Grupo</th>
                      {tiempos.map((t) => (
                        <th key={t.id} className={styles.thTiempo}>
                          <div className={styles.thTiempoContenido}>
                            <input
                              className={styles.tiempoNombre}
                              value={t.nombre}
                              onChange={(e) => renombrarTiempo(t.id, e.target.value)}
                              aria-label="Nombre del tiempo de comida"
                            />
                            {tiempos.length > 1 && (
                              <button
                                className={styles.tiempoEliminar}
                                onClick={() => eliminarTiempo(t.id)}
                                title="Eliminar tiempo"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className={styles.thCuadre}>Repartido / Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gruposConEquiv.map((g) => {
                      const c = cuadreDe(g.id)
                      const completo = c?.completo ?? false
                      return (
                        <tr key={g.id}>
                          <td className={styles.tdGrupo}>{g.nombre}</td>
                          {tiempos.map((t) => (
                            <td key={t.id}>
                              <input
                                type="number"
                                step={0.5}
                                min={0}
                                className={styles.tiempoInput}
                                value={reparto[t.id]?.[g.id] || ''}
                                onChange={(e) => setCelda(t.id, g.id, e.target.value)}
                                placeholder="0"
                              />
                            </td>
                          ))}
                          <td className={styles.celdaCuadre}>
                            <span className={completo ? styles.difOk : styles.difLejos}>
                              {c?.repartido ?? 0} / {c?.total ?? 0} {completo ? '✓' : '✗'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    {/* Resumen por tiempo (columna): kcal y macros */}
                    <tr className={styles.filaEnergia}>
                      <td className={styles.tdGrupo}>Energía</td>
                      {tiempos.map((t) => (
                        <td key={t.id} className={styles.filaEnergiaValor}>
                          {resumenTiempo(reparto[t.id] ?? {}).kcal} kcal
                        </td>
                      ))}
                      <td></td>
                    </tr>
                    <tr>
                      <td className={styles.tdGrupo}>Proteína (g)</td>
                      {tiempos.map((t) => (
                        <td key={t.id} className={styles.filaMacroValor}>
                          {resumenTiempo(reparto[t.id] ?? {}).proteina}
                        </td>
                      ))}
                      <td></td>
                    </tr>
                    <tr>
                      <td className={styles.tdGrupo}>Lípidos (g)</td>
                      {tiempos.map((t) => (
                        <td key={t.id} className={styles.filaMacroValor}>
                          {resumenTiempo(reparto[t.id] ?? {}).lipidos}
                        </td>
                      ))}
                      <td></td>
                    </tr>
                    <tr>
                      <td className={styles.tdGrupo}>HCO (g)</td>
                      {tiempos.map((t) => (
                        <td key={t.id} className={styles.filaMacroValor}>
                          {resumenTiempo(reparto[t.id] ?? {}).hco}
                        </td>
                      ))}
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className={styles.acciones}>
                <span className={styles.accionAyuda}>
                  Guarda los cálculos y el reparto. La dieta se guarda aparte, en la pestaña de IA.
                </span>
                <Button
                  variant="secondary"
                  onClick={intentarGuardar}
                  disabled={guardando || soloLectura}
                >
                  {guardando ? 'Guardando…' : 'Guardar cuadro'}
                </Button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              {exito && <p className={styles.exito}>{exito}</p>}
            </fieldset>
          )}
        </div>
      )}

      {/* PESTAÑA 3: Generar con IA */}
      {paciente && pestana === 'ia' && resultado && (
        <div className={styles.iaWrap}>
          <div className={styles.iaGrid}>
            {/* Columna izquierda: dieta generada (editable) */}
            <div className={styles.card}>
              <div className={styles.iaHeader}>
                <div className={styles.iaHeaderTitulo}>
                  <h2 className={styles.cardTitle}>
                    {modoIA === 'recetario' ? 'Recetario de opciones' : 'Dieta propuesta por IA'}
                  </h2>
                  {indicadorGuardado && (
                    <span
                      className={`${styles.badgeGuardado} ${
                        TONO_GUARDADO[indicadorGuardado.tono]
                      }`}
                      // El texto cambia solo; que un lector de pantalla lo anuncie
                      // sin interrumpir lo que el nutriólogo esté haciendo.
                      role="status"
                      aria-live="polite"
                    >
                      {indicadorGuardado.tono === 'trabajando' && (
                        <span className={styles.puntoGuardando} aria-hidden />
                      )}
                      {(indicadorGuardado.tono === 'ok' ||
                        indicadorGuardado.tono === 'definitiva') && (
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          aria-hidden
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                      {indicadorGuardado.texto}
                    </span>
                  )}
                </div>
                <div className={styles.iaHeaderAcciones}>
                  {/* Deshacer / rehacer: aparecen cuando hay algo que revertir */}
                  {(dietaIA || recetario) && !soloLectura && (
                    <div className={styles.deshacerGrupo}>
                      <button
                        className={styles.deshacerBtn}
                        onClick={deshacer}
                        disabled={!puedeDeshacer}
                        title={
                          puedeDeshacer
                            ? `Deshacer (Ctrl+Z) · ${pilaDeshacer.length} ${pilaDeshacer.length === 1 ? 'paso' : 'pasos'}`
                            : 'Nada que deshacer'
                        }
                        aria-label="Deshacer"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3"
                          />
                        </svg>
                        {pilaDeshacer.length > 0 && (
                          <span className={styles.deshacerCuenta}>{pilaDeshacer.length}</span>
                        )}
                      </button>
                      <button
                        className={styles.deshacerBtn}
                        onClick={rehacer}
                        disabled={!puedeRehacer}
                        title={puedeRehacer ? 'Rehacer (Ctrl+Shift+Z)' : 'Nada que rehacer'}
                        aria-label="Rehacer"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                  <Button
                    onClick={() => generarDietaIA()}
                    disabled={generando || soloLectura}
                    variant="secondary"
                  >
                    {generando
                      ? 'Generando…'
                      : (modoIA === 'recetario' ? recetario : dietaIA)
                        ? 'Regenerar'
                        : 'Generar'}
                  </Button>

                  {/* Guardar aquí arriba: con un recetario largo, tenerlo solo
                      al final obliga a recorrer toda la dieta para llegar. */}
                  {(dietaIA || recetario) && !soloLectura && (
                    <Button
                      onClick={() => setConfirmandoFinalizar(true)}
                      disabled={generando || chateando || finalizando || !puedeGuardarDieta}
                      title={
                        puedeGuardarDieta
                          ? 'Guarda el cuadro y la dieta juntos'
                          : validacionGuardado.bloqueos[0] ?? 'Corrige lo indicado para guardar'
                      }
                    >
                      {finalizando ? 'Guardando…' : 'Guardar dieta'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Confirmación breve de que se deshizo/rehizo */}
              {avisoDeshacer && <div className={styles.avisoFlotante}>{avisoDeshacer}</div>}

              {/* Dieta ya guardada: se ve, y para cambiarla se pulsa Editar */}
              {soloLectura && (
                <div className={styles.avisoFinalizada}>
                  <svg
                    className={styles.avisoFinalizadaIcono}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className={styles.avisoFinalizadaTexto}>Dieta guardada</span>
                  <Button variant="secondary" onClick={crearVersionNueva} disabled={finalizando}>
                    {finalizando ? 'Abriendo…' : 'Editar'}
                  </Button>
                </div>
              )}

              {/* Selector de modo */}
              <div className={styles.modoSelector}>
                <button
                  className={`${styles.modoBtn} ${modoIA === 'dieta' ? styles.modoBtnActivo : ''}`}
                  onClick={() => setModoIA('dieta')}
                  disabled={soloLectura}
                >
                  Dieta precisa
                </button>
                <button
                  className={`${styles.modoBtn} ${modoIA === 'recetario' ? styles.modoBtnActivo : ''}`}
                  onClick={() => setModoIA('recetario')}
                  disabled={soloLectura}
                >
                  Recetario de opciones
                </button>
              </div>

              <p className={styles.smaeAyuda}>
                {modoIA === 'recetario'
                  ? 'La IA propone varias opciones de platillo por tiempo (el paciente elige), todas con los mismos equivalentes.'
                  : 'La IA propone los alimentos concretos de cada tiempo respetando tus equivalentes y tu estilo. Puedes editar cada alimento a mano.'}
              </p>

              {/* Indicador sutil mientras la IA edita (sin velar la dieta) */}
              {aplicandoCambio && (
                <div className={styles.editandoChip}>
                  <span className={styles.editandoIcono}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
                    </svg>
                  </span>
                  <span className={styles.editandoTexto}>
                    La IA está editando{modoIA === 'recetario' ? ' el recetario' : ' la dieta'}
                    <span className={styles.editandoPuntos} />
                  </span>
                </div>
              )}

              <div>
                {/* Vista del RECETARIO */}
                {modoIA === 'recetario' ? (
                  generando && !recetario ? (
                    <GenerandoIA modo="recetario" />
                  ) : !recetario ? (
                    <p className={styles.resultadoVacio}>
                      Presiona “Generar” para que la IA proponga varias opciones por tiempo.
                    </p>
                  ) : (
                    <div className={styles.recetario} key={`rec-${cargaId}`}>
                      {/* Leyenda de colores por familia de alimento */}
                      <div className={styles.leyendaFamilias}>
                        {[
                          { c: '#16a34a', t: 'Verduras' },
                          { c: '#ea580c', t: 'Frutas' },
                          { c: '#d97706', t: 'Cereales' },
                          { c: '#7c3aed', t: 'Leguminosas' },
                          { c: '#dc2626', t: 'Proteína animal' },
                          { c: '#2563eb', t: 'Lácteos' },
                          { c: '#ca8a04', t: 'Grasas' },
                          { c: '#db2777', t: 'Azúcares' },
                        ].map((f) => (
                          <span key={f.t} className={styles.leyendaItem}>
                            <span
                              className={styles.leyendaPunto}
                              style={{ backgroundColor: f.c }}
                            />
                            {f.t}
                          </span>
                        ))}
                      </div>

                      {(recetario.indicacionesInicio || !soloLectura) && (
                        <div
                          className={`${styles.recetarioIndicaciones} ${styles.entrada}`}
                          style={{ animationDelay: '0ms' }}
                        >
                          <h3 className={styles.recetarioSubtitulo}>Indicaciones de inicio</h3>
                          {soloLectura ? (
                            <p>{recetario.indicacionesInicio}</p>
                          ) : (
                            <textarea
                              className={styles.indicacionesInput}
                              value={recetario.indicacionesInicio}
                              onChange={(e) =>
                                setRecetario((r) =>
                                  r ? { ...r, indicacionesInicio: e.target.value } : r
                                )
                              }
                              placeholder="Recomendaciones generales que encabezan el recetario…"
                              rows={3}
                            />
                          )}
                        </div>
                      )}
                      {recetario.tiempos.map((t, ti) => (
                        <div
                          key={t.id}
                          className={`${styles.recetarioTiempo} ${styles.entrada}`}
                          style={{ animationDelay: `${(ti + 1) * 70}ms` }}
                        >
                          <div className={styles.tiempoCabecera}>
                            <span className={styles.tiempoIcono}>
                              <IconoTiempo nombre={t.nombre} />
                            </span>
                            <h3 className={styles.tiempoNombre}>{t.nombre}</h3>
                            <span className={styles.tiempoAporte}>
                              {t.opciones.length}{' '}
                              {t.opciones.length === 1 ? 'opción' : 'opciones'}
                            </span>
                          </div>
                          {t.opciones.map((o, i) => {
                            const desajustes = cuadrePorOpcion?.get(`${t.id}|${i}`) ?? []
                            return (
                              <div
                                key={i}
                                className={`${styles.recetarioOpcion} ${
                                  elementosCambiados.has(`${t.id}|${i}`) ? styles.recienEditado : ''
                                }`}
                              >
                                {/* Cabecera: número, nombre editable y acciones */}
                                <div className={styles.opcionCabecera}>
                                  <span className={styles.recetarioOpcionNum}>Opción {i + 1}</span>
                                  {soloLectura ? (
                                    <span className={styles.opcionNombreTexto}>{o.nombre}</span>
                                  ) : (
                                    <input
                                      className={styles.opcionNombreInput}
                                      value={o.nombre}
                                      onChange={(e) =>
                                        editarOpcion(t.id, i, { nombre: e.target.value })
                                      }
                                      placeholder="Nombre del platillo…"
                                    />
                                  )}
                                  {/* Aporte y cuadre de esta opción */}
                                  {(() => {
                                    const eq: Equivalentes = {}
                                    for (const a of o.alimentos) {
                                      eq[a.grupo] = (eq[a.grupo] ?? 0) + a.equivalentes
                                    }
                                    const ap = resumenTiempo(eq)
                                    const ok = desajustes.length === 0
                                    return (
                                      <span className={styles.opcionAporte}>
                                        <span
                                          className={ok ? styles.cuadreOk : styles.cuadreFalla}
                                          title={ok ? 'Cuadra con el tiempo' : 'No cuadra'}
                                        >
                                          {ok ? (
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                                            </svg>
                                          ) : (
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                              <path strokeLinecap="round" d="M12 8v5M12 16.5v.5" />
                                              <circle cx="12" cy="12" r="9" />
                                            </svg>
                                          )}
                                        </span>
                                        {ap.kcal} kcal
                                      </span>
                                    )
                                  })()}
                                  {!soloLectura && (
                                    <span className={styles.opcionAcciones}>
                                      <button
                                        className={styles.accionBtn}
                                        onClick={() => moverOpcion(t.id, i, -1)}
                                        disabled={i === 0}
                                        title="Subir"
                                        aria-label="Subir opción"
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l-6-6-6 6" />
                                        </svg>
                                      </button>
                                      <button
                                        className={styles.accionBtn}
                                        onClick={() => moverOpcion(t.id, i, 1)}
                                        disabled={i === t.opciones.length - 1}
                                        title="Bajar"
                                        aria-label="Bajar opción"
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                                        </svg>
                                      </button>
                                      <button
                                        className={styles.accionBtn}
                                        onClick={() => duplicarOpcion(t.id, i)}
                                        title="Duplicar esta opción"
                                        aria-label="Duplicar opción"
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                          <rect x="9" y="9" width="11" height="11" rx="2" />
                                          <path strokeLinecap="round" d="M5 15V5a2 2 0 012-2h8" />
                                        </svg>
                                      </button>
                                      <button
                                        className={`${styles.accionBtn} ${styles.accionBtnPeligro}`}
                                        onClick={() => eliminarOpcion(t.id, i)}
                                        title="Quitar esta opción"
                                        aria-label="Quitar opción"
                                      >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                                        </svg>
                                      </button>
                                    </span>
                                  )}
                                </div>

                                {/* Ingredientes con sus controles */}
                                <div className={styles.opcionIngredientes}>
                                  {o.alimentos.map((a, j) => (
                                    <div key={j}>
                                    <div
                                      className={`${styles.iaAlimento} ${a.fijado ? styles.alimentoFijado : ''}`}
                                      style={
                                        {
                                          '--color-familia': COLOR_FAMILIA[a.grupo] ?? '#6b7280',
                                        } as React.CSSProperties
                                      }
                                    >
                                      <span className={styles.equivEditable}>
                                        <input
                                          type="number"
                                          className={styles.equivInput}
                                          value={a.equivalentes}
                                          step={0.5}
                                          min={0.5}
                                          onChange={(e) =>
                                            editarIngrediente(t.id, i, j, {
                                              equivalentes: Math.max(
                                                0.5,
                                                Math.round(Number(e.target.value) * 2) / 2
                                              ),
                                            })
                                          }
                                          disabled={soloLectura || a.fijado}
                                          aria-label="Equivalentes"
                                        />
                                        <span className={styles.iaAlimentoGrupo}>
                                          × {NOMBRE_GRUPO[a.grupo] ?? a.grupo}
                                        </span>
                                      </span>
                                      <input
                                        className={styles.iaAlimentoInput}
                                        value={a.descripcion}
                                        onChange={(e) =>
                                          editarIngrediente(t.id, i, j, {
                                            descripcion: e.target.value,
                                          })
                                        }
                                        placeholder="Ingrediente y su porción…"
                                        disabled={soloLectura || a.fijado}
                                      />
                                      {a.calculo && (
                                        <span className={styles.calculoChip} title={a.calculo}>
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="9" />
                                            <path strokeLinecap="round" d="M12 16v-5M12 8v.5" />
                                          </svg>
                                          <span className={styles.calculoTexto}>{a.calculo}</span>
                                        </span>
                                      )}
                                      {!soloLectura && (
                                        <span className={styles.alimentoAcciones}>
                                          {/* Alternativas para este ingrediente */}
                                          <button
                                            className={`${styles.accionBtn} ${styles.accionBtnIA} ${
                                              alternativasDe === `${t.id}|${i}|${j}`
                                                ? styles.accionBtnActiva
                                                : ''
                                            }`}
                                            onClick={() =>
                                              pedirAlternativas(
                                                `${t.id}|${i}|${j}`,
                                                a,
                                                `${t.nombre} · ${o.nombre || `opción ${i + 1}`}`
                                              )
                                            }
                                            disabled={a.fijado || cargandoAlternativas}
                                            title={
                                              a.fijado
                                                ? 'Libera el ingrediente para poder cambiarlo'
                                                : 'Ver otras opciones equivalentes'
                                            }
                                            aria-label="Ver alternativas"
                                          >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                              <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
                                              <path d="M19 14l.8 2.3L22 17l-2.2.7L19 20l-.8-2.3L16 17l2.2-.7L19 14z" opacity="0.7" />
                                            </svg>
                                          </button>
                                          <button
                                            className={`${styles.accionBtn} ${a.fijado ? styles.accionBtnActiva : ''}`}
                                            onClick={() =>
                                              editarIngrediente(t.id, i, j, { fijado: !a.fijado })
                                            }
                                            title={
                                              a.fijado
                                                ? 'Liberar: la IA podrá cambiarlo'
                                                : 'Fijar: la IA no lo tocará'
                                            }
                                            aria-label={a.fijado ? 'Liberar' : 'Fijar'}
                                          >
                                            {a.fijado ? (
                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v3H9V7a3 3 0 013-3z" />
                                              </svg>
                                            ) : (
                                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="4" y="10" width="16" height="12" rx="2" />
                                                <path strokeLinecap="round" d="M8 10V7a4 4 0 017.5-2" />
                                              </svg>
                                            )}
                                          </button>
                                          <button
                                            className={`${styles.accionBtn} ${styles.accionBtnPeligro}`}
                                            onClick={() => eliminarIngrediente(t.id, i, j)}
                                            disabled={a.fijado}
                                            title="Quitar ingrediente"
                                            aria-label="Quitar ingrediente"
                                          >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                                            </svg>
                                          </button>
                                        </span>
                                      )}
                                    </div>

                                    {/* Alternativas para este ingrediente */}
                                    {alternativasDe === `${t.id}|${i}|${j}` && (
                                      <PanelAlternativas
                                        cargando={cargandoAlternativas}
                                        error={errorAlternativas}
                                        alternativas={alternativas}
                                        onElegir={(alt) =>
                                          aplicarAlternativaRecetario(t.id, i, j, alt)
                                        }
                                        onCerrar={() => setAlternativasDe(null)}
                                      />
                                    )}
                                    </div>
                                  ))}

                                  {o.alimentos.length === 0 && (
                                    <p className={styles.tiempoVacio}>
                                      Esta opción no tiene ingredientes.
                                    </p>
                                  )}
                                </div>

                                {/* Cuadre de ESTA opción: cada una debe cumplir sola */}
                                {desajustes.length > 0 && (
                                  <p className={styles.cuadreAviso}>
                                    <span className={styles.cuadreAvisoIcono}>⚠</span>
                                    {desajustes.map((d) => (
                                      <span key={d.grupo} className={styles.cuadreChip}>
                                        {NOMBRE_GRUPO[d.grupo] ?? d.grupo}: {d.enOpcion} de{' '}
                                        {d.esperado}
                                      </span>
                                    ))}
                                  </p>
                                )}

                                {/* Añadir ingrediente */}
                                {!soloLectura && (
                                  <div className={styles.agregarZona}>
                                    {ingredienteNuevo?.tiempoId === t.id &&
                                    ingredienteNuevo.idxOpcion === i ? (
                                      <div className={styles.agregarForm}>
                                        <select
                                          className={styles.agregarSelect}
                                          value={ingredienteNuevo.grupo}
                                          onChange={(e) =>
                                            setIngredienteNuevo({
                                              ...ingredienteNuevo,
                                              grupo: e.target.value as GrupoSMAEId,
                                            })
                                          }
                                          aria-label="Grupo del ingrediente"
                                        >
                                          {GRUPOS_SMAE.map((g) => (
                                            <option key={g.id} value={g.id}>
                                              {g.nombre}
                                            </option>
                                          ))}
                                        </select>
                                        <input
                                          type="number"
                                          className={styles.agregarEquiv}
                                          value={ingredienteNuevo.equivalentes}
                                          step={0.5}
                                          min={0.5}
                                          onChange={(e) =>
                                            setIngredienteNuevo({
                                              ...ingredienteNuevo,
                                              equivalentes: Math.max(
                                                0.5,
                                                Math.round(Number(e.target.value) * 2) / 2
                                              ),
                                            })
                                          }
                                          aria-label="Equivalentes"
                                        />
                                        <span className={styles.agregarEquivLabel}>equiv.</span>
                                        <Button
                                          onClick={() =>
                                            agregarIngrediente(
                                              t.id,
                                              i,
                                              ingredienteNuevo.grupo,
                                              ingredienteNuevo.equivalentes
                                            )
                                          }
                                        >
                                          Añadir
                                        </Button>
                                        <button
                                          className={styles.agregarCancelar}
                                          onClick={() => setIngredienteNuevo(null)}
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        className={styles.agregarBtn}
                                        onClick={() =>
                                          setIngredienteNuevo({
                                            tiempoId: t.id,
                                            idxOpcion: i,
                                            grupo: GRUPOS_SMAE[0]!.id,
                                            equivalentes: 1,
                                          })
                                        }
                                      >
                                        + Añadir ingrediente
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Preparación editable */}
                                {soloLectura ? (
                                  o.preparacion && (
                                    <p className={styles.recetarioPrep}>
                                      <strong>Preparación:</strong> {o.preparacion}
                                    </p>
                                  )
                                ) : (
                                  <div className={styles.prepZona}>
                                    <label className={styles.prepLabel}>Preparación</label>
                                    <textarea
                                      className={styles.prepInput}
                                      value={o.preparacion ?? ''}
                                      onChange={(e) =>
                                        editarOpcion(t.id, i, { preparacion: e.target.value })
                                      }
                                      placeholder="Pasos de preparación (opcional)…"
                                      rows={2}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {/* Añadir una opción al tiempo */}
                          {!soloLectura && (
                            <button
                              className={styles.agregarOpcionBtn}
                              onClick={() => agregarOpcion(t.id)}
                            >
                              + Añadir opción a {t.nombre}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : generando && !dietaIA ? (
                  <GenerandoIA modo="dieta" />
                ) : !dietaIA ? (
                  <p className={styles.resultadoVacio}>
                    Presiona “Generar dieta” para que la IA proponga los alimentos.
                  </p>
                ) : (
                  <div className={styles.iaTiempos} key={`dieta-${cargaId}`}>
                    {/* Leyenda de colores: sin ella, los colores confunden. */}
                    <div className={styles.leyendaFamilias}>
                      {[
                        { c: '#16a34a', t: 'Verduras' },
                        { c: '#ea580c', t: 'Frutas' },
                        { c: '#d97706', t: 'Cereales' },
                        { c: '#7c3aed', t: 'Leguminosas' },
                        { c: '#dc2626', t: 'Proteína animal' },
                        { c: '#2563eb', t: 'Lácteos' },
                        { c: '#ca8a04', t: 'Grasas' },
                        { c: '#db2777', t: 'Azúcares' },
                      ].map((f) => (
                        <span key={f.t} className={styles.leyendaItem}>
                          <span className={styles.leyendaPunto} style={{ backgroundColor: f.c }} />
                          {f.t}
                        </span>
                      ))}
                    </div>

                    {dietaIA.map((t, ti) => (
                      <div
                        key={t.id}
                        className={`${styles.iaTiempo} ${styles.entrada}`}
                        style={{ animationDelay: `${ti * 70}ms` }}
                      >
                        {/* Cabecera: icono, nombre, cuadre y aporte del tiempo */}
                        {(() => {
                          const equivDelTiempo: Equivalentes = {}
                          for (const a of t.alimentos) {
                            equivDelTiempo[a.grupo] =
                              (equivDelTiempo[a.grupo] ?? 0) + a.equivalentes
                          }
                          const aporte = resumenTiempo(equivDelTiempo)
                          const cuadra = (cuadrePorTiempo?.get(t.id) ?? []).length === 0
                          return (
                            <div className={styles.tiempoCabecera}>
                              <span className={styles.tiempoIcono}>
                                <IconoTiempo nombre={t.nombre} />
                              </span>
                              <h3 className={styles.tiempoNombre}>{t.nombre}</h3>
                              {t.alimentos.length > 0 && (
                                <span
                                  className={cuadra ? styles.cuadreOk : styles.cuadreFalla}
                                  title={
                                    cuadra
                                      ? 'Cuadra con lo repartido en este tiempo'
                                      : 'No cuadra con lo repartido'
                                  }
                                >
                                  {cuadra ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                                    </svg>
                                  ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path strokeLinecap="round" d="M12 8v5M12 16.5v.5" />
                                      <circle cx="12" cy="12" r="9" />
                                    </svg>
                                  )}
                                </span>
                              )}
                              <span className={styles.tiempoAporte}>
                                <strong>{aporte.kcal}</strong> kcal
                                <span className={styles.tiempoMacros}>
                                  P{Math.round(aporte.proteina)} · G{Math.round(aporte.lipidos)} · C
                                  {Math.round(aporte.hco)}
                                </span>
                              </span>
                            </div>
                          )
                        })()}
                        {t.alimentos.map((a, i) => (
                          <div key={i}>
                          <div
                            className={`${styles.iaAlimento} ${
                              elementosCambiados.has(`${t.id}|${i}`) ? styles.recienEditado : ''
                            } ${a.fijado ? styles.alimentoFijado : ''} ${
                              recienAgregado === `${t.id}|${i}` ? styles.alimentoNuevo : ''
                            }`}
                            style={
                              {
                                '--color-familia': COLOR_FAMILIA[a.grupo] ?? '#6b7280',
                              } as React.CSSProperties
                            }
                          >
                            {/* Equivalentes editables: al cambiarlos se recalcula el cuadre */}
                            <span className={styles.equivEditable}>
                              <input
                                type="number"
                                className={styles.equivInput}
                                value={a.equivalentes}
                                step={0.5}
                                min={0.5}
                                onChange={(e) =>
                                  cambiarEquivalentes(t.id, i, Number(e.target.value))
                                }
                                disabled={soloLectura || a.fijado}
                                aria-label="Equivalentes"
                              />
                              <span className={styles.iaAlimentoGrupo}>
                                × {NOMBRE_GRUPO[a.grupo] ?? a.grupo}
                              </span>
                            </span>
                            <input
                              className={styles.iaAlimentoInput}
                              value={a.descripcion}
                              onChange={(e) => editarAlimento(t.id, i, e.target.value)}
                              placeholder="Escribe el alimento y su porción…"
                              disabled={soloLectura || a.fijado}
                            />
                            {a.calculo && (
                              <span className={styles.calculoChip} title={a.calculo}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="9" />
                                  <path strokeLinecap="round" d="M12 16v-5M12 8v.5" />
                                </svg>
                                <span className={styles.calculoTexto}>{a.calculo}</span>
                              </span>
                            )}
                            {!soloLectura && (
                              <span className={styles.alimentoAcciones}>
                                {/* Alternativas para ESTE alimento, sin tocar el resto */}
                                <button
                                  className={`${styles.accionBtn} ${styles.accionBtnIA} ${
                                    alternativasDe === `${t.id}|${i}` ? styles.accionBtnActiva : ''
                                  }`}
                                  onClick={() => pedirAlternativas(`${t.id}|${i}`, a, t.nombre)}
                                  disabled={a.fijado || cargandoAlternativas}
                                  title={
                                    a.fijado
                                      ? 'Libera el alimento para poder cambiarlo'
                                      : 'Ver otras opciones equivalentes'
                                  }
                                  aria-label="Ver alternativas"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
                                    <path d="M19 14l.8 2.3L22 17l-2.2.7L19 20l-.8-2.3L16 17l2.2-.7L19 14z" opacity="0.7" />
                                  </svg>
                                </button>
                                <button
                                  className={`${styles.accionBtn} ${a.fijado ? styles.accionBtnActiva : ''}`}
                                  onClick={() => alternarFijado(t.id, i)}
                                  title={
                                    a.fijado
                                      ? 'Liberar: la IA podrá cambiarlo'
                                      : 'Fijar: la IA no lo tocará'
                                  }
                                  aria-label={a.fijado ? 'Liberar alimento' : 'Fijar alimento'}
                                >
                                  {a.fijado ? (
                                    /* Candado cerrado */
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v3H9V7a3 3 0 013-3zm0 10a1.6 1.6 0 01.8 2.98V19a.8.8 0 01-1.6 0v-1.02A1.6 1.6 0 0112 14z" />
                                    </svg>
                                  ) : (
                                    /* Candado abierto */
                                    <svg
                                      width="13"
                                      height="13"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <rect x="4" y="10" width="16" height="12" rx="2" />
                                      <path strokeLinecap="round" d="M8 10V7a4 4 0 017.5-2" />
                                    </svg>
                                  )}
                                </button>
                                <button
                                  className={`${styles.accionBtn} ${styles.accionBtnPeligro}`}
                                  onClick={() => eliminarAlimento(t.id, i)}
                                  title="Quitar este alimento"
                                  aria-label="Quitar alimento"
                                  disabled={a.fijado}
                                >
                                  <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                  >
                                    <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                                  </svg>
                                </button>
                              </span>
                            )}
                            </div>

                            {/* Alternativas para este alimento */}
                            {alternativasDe === `${t.id}|${i}` && (
                              <PanelAlternativas
                                cargando={cargandoAlternativas}
                                error={errorAlternativas}
                                alternativas={alternativas}
                                onElegir={(alt) => aplicarAlternativa(t.id, i, alt)}
                                onCerrar={() => setAlternativasDe(null)}
                              />
                            )}
                          </div>
                        ))}

                        {/* Tiempo sin alimentos: se dice, no se deja en blanco. */}
                        {t.alimentos.length === 0 && (
                          <p className={styles.tiempoVacio}>
                            Este tiempo quedó sin alimentos. Añade uno o pídele a la IA que lo
                            complete.
                          </p>
                        )}

                        {/* Aviso de cuadre del tiempo, en vivo */}
                        {(() => {
                          const desajustes = cuadrePorTiempo?.get(t.id) ?? []
                          if (desajustes.length === 0) return null
                          return (
                            <p className={styles.cuadreAviso}>
                              <span className={styles.cuadreAvisoIcono}>⚠</span>
                              {desajustes.map((d, k) => (
                                <span key={d.grupo} className={styles.cuadreChip}>
                                  {NOMBRE_GRUPO[d.grupo] ?? d.grupo}: {d.enDieta} de {d.esperado}
                                  {k < desajustes.length - 1 ? '' : ''}
                                </span>
                              ))}
                            </p>
                          )
                        })()}

                        {/* Añadir un alimento al tiempo */}
                        {!soloLectura && (
                          <div className={styles.agregarZona}>
                            {alimentoNuevo?.tiempoId === t.id ? (
                              <div className={styles.agregarForm}>
                                <select
                                  className={styles.agregarSelect}
                                  value={alimentoNuevo.grupo}
                                  onChange={(e) =>
                                    setAlimentoNuevo({
                                      ...alimentoNuevo,
                                      grupo: e.target.value as GrupoSMAEId,
                                    })
                                  }
                                  aria-label="Grupo del alimento"
                                >
                                  {GRUPOS_SMAE.map((g) => (
                                    <option key={g.id} value={g.id}>
                                      {g.nombre}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  className={styles.agregarEquiv}
                                  value={alimentoNuevo.equivalentes}
                                  step={0.5}
                                  min={0.5}
                                  onChange={(e) =>
                                    setAlimentoNuevo({
                                      ...alimentoNuevo,
                                      equivalentes: Math.max(
                                        0.5,
                                        Math.round(Number(e.target.value) * 2) / 2
                                      ),
                                    })
                                  }
                                  aria-label="Equivalentes"
                                />
                                <span className={styles.agregarEquivLabel}>equiv.</span>
                                <Button
                                  onClick={() =>
                                    agregarAlimento(
                                      t.id,
                                      alimentoNuevo.grupo,
                                      alimentoNuevo.equivalentes
                                    )
                                  }
                                >
                                  Añadir
                                </Button>
                                <button
                                  className={styles.agregarCancelar}
                                  onClick={() => setAlimentoNuevo(null)}
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                className={styles.agregarBtn}
                                onClick={() =>
                                  setAlimentoNuevo({
                                    tiempoId: t.id,
                                    grupo: GRUPOS_SMAE[0]!.id,
                                    equivalentes: 1,
                                  })
                                }
                              >
                                + Añadir alimento
                              </button>
                            )}
                          </div>
                        )}

                        {t.nota && <p className={styles.iaTiempoNota}>{t.nota}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabla de comprobación de nutrientes */}
              {tablaComprobacion && (
                <div className={styles.comprobacion}>
                  <h3 className={styles.subCardTitle}>Comprobación de nutrientes</h3>
                  <p className={styles.smaeAyuda}>
                    Nutrientes de cada alimento (según el SMAE) sumados y comparados con la meta del
                    cuadro. El color indica qué tan cerca queda.
                  </p>
                  <div className={styles.tablaWrap}>
                    <table className={`${styles.tablaSmae} ${styles.tablaComprob}`}>
                      <thead>
                        <tr>
                          <th className={styles.thGrupo}>Alimento</th>
                          <th>HCO</th>
                          <th>Prot</th>
                          <th>Líp</th>
                          <th>Kcal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tablaComprobacion.filas.map((f, i) => (
                          <tr key={i}>
                            <td className={styles.tdGrupo}>{f.descripcion}</td>
                            <td className={styles.tdNum}>{f.hco}</td>
                            <td className={styles.tdNum}>{f.proteina}</td>
                            <td className={styles.tdNum}>{f.lipidos}</td>
                            <td className={styles.tdNum}>{f.kcal}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className={styles.filaTotal}>
                          <td className={styles.tdGrupo}>TOTAL</td>
                          <td className={styles.tdNum}>{tablaComprobacion.total.hco}</td>
                          <td className={styles.tdNum}>{tablaComprobacion.total.proteina}</td>
                          <td className={styles.tdNum}>{tablaComprobacion.total.lipidos}</td>
                          <td className={styles.tdNum}>{tablaComprobacion.total.kcal}</td>
                        </tr>
                        <tr className={styles.filaMeta}>
                          <td className={styles.tdGrupo}>META</td>
                          <td className={styles.tdNum}>{tablaComprobacion.meta.hco}</td>
                          <td className={styles.tdNum}>{tablaComprobacion.meta.proteina}</td>
                          <td className={styles.tdNum}>{tablaComprobacion.meta.lipidos}</td>
                          <td className={styles.tdNum}>{tablaComprobacion.meta.kcal}</td>
                        </tr>
                        <tr className={styles.filaDif}>
                          <td className={styles.tdGrupo}>DIFERENCIA</td>
                          <td className={claseGradiente(tablaComprobacion.diferencia.hco)}>
                            {fmtDif(tablaComprobacion.diferencia.hco)}
                          </td>
                          <td className={claseGradiente(tablaComprobacion.diferencia.proteina)}>
                            {fmtDif(tablaComprobacion.diferencia.proteina)}
                          </td>
                          <td className={claseGradiente(tablaComprobacion.diferencia.lipidos)}>
                            {fmtDif(tablaComprobacion.diferencia.lipidos)}
                          </td>
                          <td className={claseGradiente(tablaComprobacion.diferencia.kcal, 30)}>
                            {fmtDif(tablaComprobacion.diferencia.kcal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {Math.abs(tablaComprobacion.diferencia.kcal) <= 30 &&
                  Math.abs(tablaComprobacion.diferencia.hco) <= 5 &&
                  Math.abs(tablaComprobacion.diferencia.proteina) <= 5 &&
                  Math.abs(tablaComprobacion.diferencia.lipidos) <= 5 ? (
                    <p className={styles.comprobacionOk}>
                      ✓ La dieta cuadra con la meta del cuadro.
                    </p>
                  ) : (
                    <p className={styles.comprobacionAviso}>
                      ⚠ La dieta no cuadra del todo con la meta. Pídele a la IA que ajuste, o revisa
                      el reparto en la pestaña de distribución.
                    </p>
                  )}
                </div>
              )}

              {/* Qué falta o qué revisar antes de guardar. El botón vive arriba,
                  junto a Regenerar, para no tener que recorrer toda la dieta. */}
              {(dietaIA || recetario) &&
                !soloLectura &&
                (validacionGuardado.bloqueos.length > 0 ||
                  validacionGuardado.avisos.length > 0) && (
                <div className={styles.guardarZona}>
                  {/* Lo que impide guardar */}
                  {validacionGuardado.bloqueos.length > 0 && (
                    <div className={styles.bloqueoLista}>
                      <span className={styles.bloqueoTitulo}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" d="M12 8v5M12 16.5v.5" />
                        </svg>
                        Falta esto para poder guardar
                      </span>
                      <ul>
                        {validacionGuardado.bloqueos.slice(0, 4).map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                        {validacionGuardado.bloqueos.length > 4 && (
                          <li>y {validacionGuardado.bloqueos.length - 4} más…</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Lo que solo merece un aviso */}
                  {puedeGuardarDieta && validacionGuardado.avisos.length > 0 && (
                    <div className={styles.avisoLista}>
                      {validacionGuardado.avisos.map((a, i) => (
                        <span key={i}>⚠ {a}</span>
                      ))}
                    </div>
                  )}

                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}
            </div>

            {/* Columna derecha: chat copiloto. El envoltorio ocupa toda la altura
                de la fila y la tarjeta se ancla dentro, para que acompañe al
                scroll en lugar de quedarse arriba con dietas largas. */}
            <div className={styles.chatColumna}>
            <div className={`${styles.card} ${styles.chatPegajoso}`}>
              <h2 className={styles.cardTitle}>Ajustar con la IA</h2>
              <p className={styles.smaeAyuda}>
                {soloLectura
                  ? 'Esta dieta está guardada. Pulsa Editar para poder ajustarla con la IA.'
                  : 'Conversa: pregunta “¿por qué esa porción?”, o pide “cambia la fruta”, “no uses lácteos”, “hazlo más económico”. La IA responde y ajusta la dieta cuando aplica.'}
              </p>

              {/* Recordatorio de lo que la IA no va a tocar. */}
              {!soloLectura && totalFijados > 0 && (
                <p className={styles.fijadosAviso}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v3H9V7a3 3 0 013-3z" />
                  </svg>
                  {totalFijados} {totalFijados === 1 ? 'alimento fijado' : 'alimentos fijados'}: la
                  IA no los cambiará.
                </p>
              )}
              <div className={styles.chatMensajes} ref={chatRef}>
                {mensajesIA.length === 0 && !chateando ? (
                  <p className={styles.chatVacio}>
                    {soloLectura
                      ? 'Dieta guardada: pulsa Editar para ajustarla.'
                      : (modoIA === 'recetario' ? recetario : dietaIA)
                        ? `Escríbele a la IA para afinar ${modoIA === 'recetario' ? 'el recetario' : 'la dieta'}.`
                        : `Genera ${modoIA === 'recetario' ? 'un recetario' : 'una dieta'} primero para poder conversar.`}
                  </p>
                ) : (
                  mensajesIA.map((m, i) => {
                    const esUltima = i === mensajesIA.length - 1
                    const escribiendoAqui = chateando && esUltima && m.rol === 'ia'
                    // Burbuja de la IA aún vacía mientras esperamos el primer token.
                    if (escribiendoAqui && m.texto === '') {
                      return (
                        <div
                          key={i}
                          className={`${styles.chatBurbujaIA} ${styles.chatEscribiendo}`}
                        >
                          <span className={styles.dot} />
                          <span className={styles.dot} />
                          <span className={styles.dot} />
                        </div>
                      )
                    }
                    return (
                      <div
                        key={i}
                        className={m.rol === 'ia' ? styles.chatBurbujaIA : styles.chatBurbujaNutri}
                      >
                        {m.texto}
                        {escribiendoAqui && <span className={styles.cursor} />}
                      </div>
                    )
                  })
                )}
                {aplicandoCambio && (
                  <div className={styles.aplicando}>
                    <span className={styles.aplicandoIcono}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
                      </svg>
                    </span>
                    <span className={styles.aplicandoTexto}>
                      Aplicando cambios{modoIA === 'recetario' ? ' al recetario' : ' a la dieta'}
                      <span className={styles.puntosAplicando} />
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.chatInput}>
                <input
                  value={inputChat}
                  onChange={(e) => setInputChat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarMensajeChat()}
                  placeholder={
                    soloLectura ? 'Dieta guardada (pulsa Editar)' : 'Escribe tu mensaje…'
                  }
                  disabled={
                    chateando ||
                    generando ||
                    soloLectura ||
                    !(modoIA === 'recetario' ? recetario : dietaIA)
                  }
                />
                <Button
                  onClick={enviarMensajeChat}
                  disabled={
                    chateando ||
                    generando ||
                    soloLectura ||
                    !(modoIA === 'recetario' ? recetario : dietaIA) ||
                    !inputChat.trim()
                  }
                >
                  Enviar
                </Button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación antes de guardar */}
      {confirmando &&
        createPortal(
          <div className={styles.modalOverlay} onClick={() => setConfirmando(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitulo}>Guardar cuadro</h3>
              <p className={styles.modalTexto}>
                Se guardan los cálculos, los equivalentes
                {tieneDistribucion ? ' y su reparto en tiempos de comida' : ''}, sin la dieta. No
                reemplaza los cuadros anteriores del paciente.
              </p>
              {!tieneDistribucion && (
                <p className={styles.modalAviso}>
                  ⚠ Todavía no has repartido los equivalentes en tiempos de comida. Puedes guardar
                  igual y completarlo después.
                </p>
              )}
              <label className={styles.modalCheck}>
                <input
                  type="checkbox"
                  checked={noVolverAvisar}
                  onChange={(e) => setNoVolverAvisar(e.target.checked)}
                />
                No volver a mostrar este aviso
              </label>
              <div className={styles.modalAcciones}>
                <Button variant="secondary" onClick={() => setConfirmando(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirmarGuardar}>Guardar</Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de confirmación antes de eliminar un cuadro */}
      {confirmandoBorrar &&
        createPortal(
          <div className={styles.modalOverlay} onClick={() => setConfirmandoBorrar(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitulo}>Eliminar cuadro</h3>
              <p className={styles.modalTexto}>
                Se borrará este cuadro y la dieta en borrador que tenga. Esta acción no se puede
                deshacer.
              </p>
              <div className={styles.modalAcciones}>
                <Button variant="secondary" onClick={() => setConfirmandoBorrar(null)}>
                  Cancelar
                </Button>
                <Button variant="danger" onClick={() => eliminarCuadro(confirmandoBorrar)}>
                  Eliminar
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Modal de confirmación antes de finalizar (acción irreversible) */}
      {confirmandoFinalizar &&
        createPortal(
          <div className={styles.modalOverlay} onClick={() => setConfirmandoFinalizar(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitulo}>Guardar dieta</h3>
              <p className={styles.modalTexto}>
                Se guardan el <strong>cuadro dietosintético</strong> y la dieta juntos. Quedará
                como solo lectura; si necesitas cambiar algo después, pulsa{' '}
                <strong>Editar</strong>.
              </p>
              {validacionGuardado.avisos.length > 0 && (
                <p className={styles.modalAviso}>
                  ⚠ {validacionGuardado.avisos.join(' ')} Puedes guardar igualmente si es
                  intencional.
                </p>
              )}
              <div className={styles.modalAcciones}>
                <Button variant="secondary" onClick={() => setConfirmandoFinalizar(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => guardarDietaGenerada(true)}
                  disabled={finalizando || !puedeGuardarDieta}
                >
                  {finalizando ? 'Guardando…' : 'Guardar dieta'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

// Redondea a 2 decimales para evitar ruido de coma flotante (0.1+0.2, etc.).
function redondear2(n: number): number {
  return Math.round(n * 100) / 100
}

// Muestra un número sin ceros decimales sobrantes (2, 2.5, 2.25).
function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(redondear2(n))
}

// Formatea una diferencia con signo explícito.
function fmtDif(n: number): string {
  if (n === 0) return '0'
  return n > 0 ? `+${n}` : `${n}`
}

// Clase de color según qué tan lejos está la diferencia de cero.
// Verde si está dentro de la tolerancia; ámbar si está cerca; rojo si está lejos.
function celdaDif(n: number, tolerancia = 5): string {
  const abs = Math.abs(n)
  const base = styles.tdNum
  if (abs <= tolerancia) return `${base} ${styles.difOk}`
  if (abs <= tolerancia * 3) return `${base} ${styles.difCerca}`
  return `${base} ${styles.difLejos}`
}

// Clase de gradiente (5 escalones: verde → lima → amarillo → naranja → rojo)
// según qué tan cerca está la diferencia de la meta. Para la tabla de la IA.
const CLASES_GRADIENTE = ['grad0', 'grad1', 'grad2', 'grad3', 'grad4'] as const
function claseGradiente(diferencia: number, tolerancia = 5): string {
  const nivel = nivelCercania(diferencia, tolerancia)
  return `${styles.tdNum} ${styles[CLASES_GRADIENTE[nivel]]}`
}
