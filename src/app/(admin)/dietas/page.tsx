'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Button from '@/components/ui/Button'
import GenerandoIA from '@/components/dietas/GenerandoIA'
import { clasificarIMC } from '@/lib/utils/dietosintetico'
import {
  GRUPOS_SMAE,
  sumarEquivalentes,
  calcularDiferencia,
  cuadroDistribucion,
  resumenTiempo,
  validarDistribucion,
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

interface CuadroHistorial {
  id: string
  createdAt: string
  kcal_meta: number
  objetivo: string
  imc: number
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

// Mapa id de grupo SMAE → nombre legible (para mostrar en la dieta de IA).
const NOMBRE_GRUPO = Object.fromEntries(GRUPOS_SMAE.map((g) => [g.id, g.nombre])) as Record<
  GrupoSMAEId,
  string
>

export default function DietasPage() {
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

  // Paso entre porciones de los sliders de equivalentes (0.25 / 0.5 / 1).
  const [pasoEquiv, setPasoEquiv] = useState(0.5)
  // Pestaña activa: 'cuadro' (dietosintético) | 'tiempos' (distribución) | 'ia' (generar).
  const [pestana, setPestana] = useState<'cuadro' | 'tiempos' | 'ia'>('cuadro')
  // Tiempos de comida y su reparto de equivalentes.
  const [tiempos, setTiempos] = useState<TiempoComida[]>(() =>
    TIEMPOS_DEFAULT.map((t) => ({ ...t }))
  )
  const [reparto, setReparto] = useState<DistribucionTiempos>({})

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
  // Preferencia persistida: si el nutriólogo pidió no volver a ver el aviso.
  useEffect(() => {
    if (localStorage.getItem('dietas.omitirAvisoGuardar') === '1') {
      setNoVolverAvisar(true)
    }
  }, [])

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

  // Carga la lista de cuadros guardados de un paciente.
  const cargarHistorial = async (pacienteId: string) => {
    setCargandoHistorial(true)
    try {
      const res = await fetch(`/api/dietas/cuadros?paciente_id=${pacienteId}`)
      if (res.ok) {
        const data = await res.json()
        setHistorial(data.cuadros ?? [])
      }
    } catch {
      /* silencioso */
    } finally {
      setCargandoHistorial(false)
    }
  }

  // Abre un cuadro guardado y repuebla toda la pantalla.
  const cargarCuadro = async (id: string) => {
    setError('')
    setExito('')
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
      setPestana('cuadro')
      setExito('Cuadro cargado.')
    } catch {
      setError('Error de conexión al cargar el cuadro.')
    }
  }

  const cambiarPaciente = () => {
    setPaciente(null)
    setResultado(null)
    setEquivalentes({})
    setPct({ ...PCT_DEFAULT })
    setKcalOverride(null)
    setReparto({})
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
        if (modoIA === 'recetario') {
          setRecetario(data.recetario)
          if (data.recetario?.mensaje) {
            setMensajesIA((m) => [...m, { rol: 'ia', texto: data.recetario.mensaje }])
          }
        } else {
          setDietaIA(data.dieta.tiempos)
          if (data.dieta.mensaje) {
            setMensajesIA((m) => [...m, { rol: 'ia', texto: data.dieta.mensaje }])
          }
        }
      } else {
        setError(data.error || 'Error al generar con IA')
      }
    } catch {
      setError('Error de conexión al generar')
    } finally {
      setGenerando(false)
    }
  }

  // Envía un mensaje del nutriólogo al chat y regenera con esa instrucción.
  const enviarMensajeChat = () => {
    const texto = inputChat.trim()
    if (!texto || generando) return
    setMensajesIA((m) => [...m, { rol: 'nutriologo', texto }])
    setInputChat('')
    generarDietaIA(texto)
  }

  // Edita a mano la descripción de un alimento propuesto.
  const editarAlimento = (tiempoId: string, idx: number, descripcion: string) => {
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
      ) : (
        <div className={styles.pacienteSel}>
          <div className={styles.pacienteSelIdentidad}>
            <span className={styles.pacienteSelAvatar}>
              {paciente.nombre.charAt(0).toUpperCase()}
            </span>
            <div className={styles.pacienteSelTexto}>
              <span className={styles.pacienteSelNombre}>{paciente.nombre}</span>
              <span className={styles.pacienteSelEmail}>{paciente.email}</span>
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
          <span className={styles.historialTitulo}>Cuadros guardados:</span>
          <div className={styles.historialChips}>
            {historial.map((h) => (
              <button
                key={h.id}
                className={styles.historialChip}
                onClick={() => cargarCuadro(h.id)}
                title="Abrir este cuadro"
              >
                <span className={styles.historialFecha}>
                  {new Date(h.createdAt).toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span className={styles.historialKcal}>{Math.round(h.kcal_meta)} kcal</span>
              </button>
            ))}
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
                <>
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
                </>
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
          <Button onClick={calcular} disabled={!datosMinimos || calculando}>
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
            <h2 className={styles.cardTitle}>Distribución por grupos (SMAE)</h2>
            <p className={styles.smaeAyuda}>
              Ajusta el número de equivalentes de cada grupo hasta que la diferencia con la meta
              tienda a cero.
            </p>
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
                Reparte los equivalentes de cada grupo entre los tiempos de comida. La columna final
                avisa si un grupo quedó completo; el pie muestra el aporte de cada tiempo.
              </p>
            </div>
            <Button variant="secondary" onClick={agregarTiempo}>
              + Agregar tiempo
            </Button>
          </div>

          {gruposConEquiv.length === 0 ? (
            <p className={styles.resultadoVacio}>
              Primero define equivalentes en la pestaña <strong>Cuadro dietosintético</strong>.
            </p>
          ) : (
            <>
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
                <Button onClick={intentarGuardar} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar dieta completa'}
                </Button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              {exito && <p className={styles.exito}>{exito}</p>}
            </>
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
                <h2 className={styles.cardTitle}>
                  {modoIA === 'recetario' ? 'Recetario de opciones' : 'Dieta propuesta por IA'}
                </h2>
                <Button
                  onClick={() => generarDietaIA()}
                  disabled={generando}
                  variant={modoIA === 'recetario' ? 'secondary' : 'primary'}
                >
                  {generando
                    ? 'Generando…'
                    : (modoIA === 'recetario' ? recetario : dietaIA)
                      ? 'Regenerar'
                      : 'Generar'}
                </Button>
              </div>

              {/* Selector de modo */}
              <div className={styles.modoSelector}>
                <button
                  className={`${styles.modoBtn} ${modoIA === 'dieta' ? styles.modoBtnActivo : ''}`}
                  onClick={() => setModoIA('dieta')}
                >
                  Dieta precisa
                </button>
                <button
                  className={`${styles.modoBtn} ${modoIA === 'recetario' ? styles.modoBtnActivo : ''}`}
                  onClick={() => setModoIA('recetario')}
                >
                  Recetario de opciones
                </button>
              </div>

              <p className={styles.smaeAyuda}>
                {modoIA === 'recetario'
                  ? 'La IA propone varias opciones de platillo por tiempo (el paciente elige), todas con los mismos equivalentes.'
                  : 'La IA propone los alimentos concretos de cada tiempo respetando tus equivalentes y tu estilo. Puedes editar cada alimento a mano.'}
              </p>

              {/* Vista del RECETARIO */}
              {modoIA === 'recetario' ? (
                generando && !recetario ? (
                  <GenerandoIA modo="recetario" />
                ) : !recetario ? (
                  <p className={styles.resultadoVacio}>
                    Presiona “Generar” para que la IA proponga varias opciones por tiempo.
                  </p>
                ) : (
                  <div className={styles.recetario}>
                    {recetario.indicacionesInicio && (
                      <div className={styles.recetarioIndicaciones}>
                        <h3 className={styles.recetarioSubtitulo}>Indicaciones de inicio</h3>
                        <p>{recetario.indicacionesInicio}</p>
                      </div>
                    )}
                    {recetario.tiempos.map((t) => (
                      <div key={t.id} className={styles.recetarioTiempo}>
                        <h3 className={styles.recetarioTiempoNombre}>{t.nombre}</h3>
                        {t.opciones.map((o, i) => (
                          <div key={i} className={styles.recetarioOpcion}>
                            <div className={styles.recetarioOpcionNombre}>
                              <span className={styles.recetarioOpcionNum}>Opción {i + 1}</span>
                              {o.nombre}
                            </div>
                            <ul className={styles.recetarioAlimentos}>
                              {o.alimentos.map((a, j) => (
                                <li key={j}>{a.descripcion}</li>
                              ))}
                            </ul>
                            {o.preparacion && (
                              <p className={styles.recetarioPrep}>
                                <strong>Preparación:</strong> {o.preparacion}
                              </p>
                            )}
                          </div>
                        ))}
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
                <div className={styles.iaTiempos}>
                  {dietaIA.map((t) => (
                    <div key={t.id} className={styles.iaTiempo}>
                      <h3 className={styles.iaTiempoNombre}>{t.nombre}</h3>
                      {t.alimentos.map((a, i) => (
                        <div key={i} className={styles.iaAlimento}>
                          <span className={styles.iaAlimentoGrupo}>
                            {a.equivalentes}× {NOMBRE_GRUPO[a.grupo] ?? a.grupo}
                          </span>
                          <input
                            className={styles.iaAlimentoInput}
                            value={a.descripcion}
                            onChange={(e) => editarAlimento(t.id, i, e.target.value)}
                          />
                          {a.calculo && (
                            <span className={styles.iaCalculo} title={a.calculo}>
                              ⓘ
                            </span>
                          )}
                        </div>
                      ))}
                      {t.nota && <p className={styles.iaTiempoNota}>{t.nota}</p>}
                    </div>
                  ))}
                </div>
              )}

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

              {error && <p className={styles.error}>{error}</p>}
            </div>

            {/* Columna derecha: chat copiloto */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Ajustar con la IA</h2>
              <p className={styles.smaeAyuda}>
                Pídele cambios: “cámbiale la fruta del desayuno”, “no uses lácteos”, “más
                económico”.
              </p>
              <div className={styles.chatMensajes}>
                {mensajesIA.length === 0 ? (
                  <p className={styles.chatVacio}>Aún no hay conversación.</p>
                ) : (
                  mensajesIA.map((m, i) => (
                    <div
                      key={i}
                      className={m.rol === 'ia' ? styles.chatBurbujaIA : styles.chatBurbujaNutri}
                    >
                      {m.texto}
                    </div>
                  ))
                )}
                {generando && (
                  <div className={`${styles.chatBurbujaIA} ${styles.chatEscribiendo}`}>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </div>
                )}
              </div>
              <div className={styles.chatInput}>
                <input
                  value={inputChat}
                  onChange={(e) => setInputChat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarMensajeChat()}
                  placeholder="Escribe un ajuste…"
                  disabled={generando || !dietaIA}
                />
                <Button
                  onClick={enviarMensajeChat}
                  disabled={generando || !dietaIA || !inputChat.trim()}
                >
                  Enviar
                </Button>
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
              <h3 className={styles.modalTitulo}>Guardar dieta</h3>
              <p className={styles.modalTexto}>
                Se guardará como una <strong>versión nueva</strong> (no reemplaza las anteriores).
                Incluye el cuadro dietosintético, los equivalentes
                {tieneDistribucion ? ' y la distribución en tiempos de comida.' : '.'}
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
