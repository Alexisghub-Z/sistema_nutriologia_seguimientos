'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Button from '@/components/ui/Button'
import {
  GRUPOS_SMAE,
  sumarEquivalentes,
  calcularDiferencia,
  cuadroDistribucion,
  type Equivalentes,
  type GrupoSMAEId,
} from '@/lib/utils/smae'
import styles from './dietas.module.css'

interface PacienteLite {
  id: string
  nombre: string
  email: string
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

const FORM_INICIAL = {
  peso: '',
  talla_cm: '',
  edad: '',
  sexo: 'MASCULINO',
  nivel_actividad: 'MODERADO',
  objetivo: 'BAJAR_PESO',
  pct_proteina: '25',
  pct_grasa: '25',
  pct_carbohidrato: '50',
  notas: '',
}

export default function DietasPage() {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<PacienteLite[]>([])
  const [paciente, setPaciente] = useState<PacienteLite | null>(null)
  const [form, setForm] = useState({ ...FORM_INICIAL })
  const [resultado, setResultado] = useState<ResultadoCuadro | null>(null)
  const [equivalentes, setEquivalentes] = useState<Equivalentes>({})
  const [calculando, setCalculando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Totales y diferencia del SMAE, recalculados en vivo mientras el nutriólogo
  // ajusta los equivalentes de cada grupo.
  const totalesSmae = useMemo(() => sumarEquivalentes(equivalentes), [equivalentes])
  const diferenciaSmae = useMemo(() => {
    if (!resultado) return null
    return calcularDiferencia(totalesSmae, {
      kcalMeta: resultado.kcalMeta,
      hco_g: resultado.macros.carbohidrato.gramos,
      proteina_g: resultado.macros.proteina.gramos,
      lipidos_g: resultado.macros.grasa.gramos,
    })
  }, [totalesSmae, resultado])
  const distribucion = useMemo(() => {
    if (!resultado) return null
    return cuadroDistribucion(
      resultado.kcalMeta,
      resultado.macros.carbohidrato.porcentaje,
      resultado.macros.grasa.porcentaje,
      resultado.macros.proteina.porcentaje
    )
  }, [resultado])

  const setEquivalente = (id: GrupoSMAEId, valor: string) => {
    const n = valor === '' ? 0 : Math.max(0, Math.floor(Number(valor)))
    setEquivalentes((e) => ({ ...e, [id]: n }))
  }

  // Buscar pacientes (autocompletado)
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
    setError('')
    setExito('')
    setForm({ ...FORM_INICIAL })
    // Prellenar peso/talla/edad de la última consulta
    try {
      const res = await fetch(`/api/dietas/cuadros/prellenado?paciente_id=${p.id}`)
      if (res.ok) {
        const data = await res.json()
        setForm((f) => ({
          ...f,
          peso: data.peso != null ? String(data.peso) : '',
          talla_cm: data.talla_cm != null ? String(data.talla_cm) : '',
          edad: data.edad != null ? String(data.edad) : '',
        }))
      }
    } catch {
      /* si falla, el nutriólogo llena a mano */
    }
  }, [])

  const cambiarPaciente = () => {
    setPaciente(null)
    setResultado(null)
    setEquivalentes({})
    setForm({ ...FORM_INICIAL })
    setError('')
    setExito('')
  }

  const setCampo = (campo: string, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setResultado(null) // invalidar resultado al cambiar datos
    setExito('')
  }

  const sumaMacros =
    Number(form.pct_proteina || 0) +
    Number(form.pct_grasa || 0) +
    Number(form.pct_carbohidrato || 0)
  const macrosOk = Math.abs(sumaMacros - 100) < 0.5

  const construirPayload = (guardar: boolean) => ({
    paciente_id: paciente!.id,
    peso: Number(form.peso),
    talla_cm: Number(form.talla_cm),
    edad: Number(form.edad),
    sexo: form.sexo,
    nivel_actividad: form.nivel_actividad,
    objetivo: form.objetivo,
    pct_proteina: Number(form.pct_proteina),
    pct_grasa: Number(form.pct_grasa),
    pct_carbohidrato: Number(form.pct_carbohidrato),
    equivalentes,
    notas: form.notas || undefined,
    guardar,
  })

  const calcular = async () => {
    setError('')
    setExito('')
    if (!macrosOk) {
      setError('Los porcentajes de macros deben sumar 100.')
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
        setExito('Cuadro guardado correctamente.')
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
          <input
            type="text"
            className={styles.buscadorInput}
            placeholder="Busca un paciente por nombre o email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {resultados.length > 0 && (
            <div className={styles.resultados}>
              {resultados.map((p) => (
                <button
                  key={p.id}
                  className={styles.resultadoItem}
                  onClick={() => seleccionarPaciente(p)}
                >
                  <span className={styles.resultadoNombre}>{p.nombre}</span>
                  <span className={styles.resultadoEmail}>{p.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.pacienteSel}>
          <span className={styles.pacienteSelNombre}>{paciente.nombre}</span>
          <button className={styles.cambiarBtn} onClick={cambiarPaciente}>
            Cambiar paciente
          </button>
        </div>
      )}

      {paciente && (
        <div className={styles.grid}>
          {/* Columna izquierda: datos del nutriólogo */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Datos del paciente</h2>

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

            <div className={styles.formGroup}>
              <label>Distribución de macros (%)</label>
              <div className={styles.macrosRow}>
                <input
                  type="number"
                  aria-label="Proteína %"
                  value={form.pct_proteina}
                  onChange={(e) => setCampo('pct_proteina', e.target.value)}
                  placeholder="Prot"
                />
                <input
                  type="number"
                  aria-label="Grasa %"
                  value={form.pct_grasa}
                  onChange={(e) => setCampo('pct_grasa', e.target.value)}
                  placeholder="Grasa"
                />
                <input
                  type="number"
                  aria-label="Carbohidratos %"
                  value={form.pct_carbohidrato}
                  onChange={(e) => setCampo('pct_carbohidrato', e.target.value)}
                  placeholder="Carbo"
                />
              </div>
              <span
                className={`${styles.macrosSuma} ${macrosOk ? styles.macrosSumaOk : styles.macrosSumaError}`}
              >
                Suma: {sumaMacros}% {macrosOk ? '✓' : '(debe sumar 100)'}
              </span>
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

            <div className={styles.acciones}>
              <Button onClick={calcular} disabled={!datosMinimos || !macrosOk || calculando}>
                {calculando ? 'Calculando…' : 'Calcular'}
              </Button>
              <Button variant="secondary" onClick={guardar} disabled={!resultado || guardando}>
                {guardando ? 'Guardando…' : 'Guardar cuadro'}
              </Button>
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {exito && <p className={styles.exito}>{exito}</p>}
          </div>

          {/* Columna derecha: resultado calculado */}
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
                  <span className={styles.metricaValor}>{resultado.kcalMeta} kcal</span>
                </div>
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

                <div className={styles.macrosGrid}>
                  <div className={styles.macroCard}>
                    <div className={styles.macroNombre}>Proteína</div>
                    <p className={styles.macroGramos}>{resultado.macros.proteina.gramos} g</p>
                    <span className={styles.macroKcal}>{resultado.macros.proteina.kcal} kcal</span>
                  </div>
                  <div className={styles.macroCard}>
                    <div className={styles.macroNombre}>Grasa</div>
                    <p className={styles.macroGramos}>{resultado.macros.grasa.gramos} g</p>
                    <span className={styles.macroKcal}>{resultado.macros.grasa.kcal} kcal</span>
                  </div>
                  <div className={styles.macroCard}>
                    <div className={styles.macroNombre}>Carbohidrato</div>
                    <p className={styles.macroGramos}>{resultado.macros.carbohidrato.gramos} g</p>
                    <span className={styles.macroKcal}>
                      {resultado.macros.carbohidrato.kcal} kcal
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Distribución por equivalentes (SMAE) — aparece al calcular */}
      {paciente && resultado && diferenciaSmae && distribucion && (
        <>
          <div className={styles.card} style={{ marginTop: 'var(--spacing-lg)' }}>
            <h2 className={styles.cardTitle}>Distribución por grupos (SMAE)</h2>
            <p className={styles.smaeAyuda}>
              Ajusta el número de equivalentes de cada grupo hasta que la diferencia con la meta
              tienda a cero.
            </p>
            <div className={styles.tablaWrap}>
              <table className={styles.tablaSmae}>
                <thead>
                  <tr>
                    <th className={styles.thGrupo}>Grupo</th>
                    <th>Equiv.</th>
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
                          <input
                            type="number"
                            min={0}
                            className={styles.equivInput}
                            value={n === 0 ? '' : n}
                            onChange={(e) => setEquivalente(g.id, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                        <td className={styles.tdNum}>{n ? (g.hco * n).toFixed(0) : '—'}</td>
                        <td className={styles.tdNum}>{n ? (g.proteina * n).toFixed(0) : '—'}</td>
                        <td className={styles.tdNum}>{n ? (g.lipidos * n).toFixed(0) : '—'}</td>
                        <td className={styles.tdNum}>{n ? (g.kcal * n).toFixed(0) : '—'}</td>
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

          {/* Cuadro de distribución final */}
          <div className={styles.card} style={{ marginTop: 'var(--spacing-lg)' }}>
            <h2 className={styles.cardTitle}>Cuadro de distribución</h2>
            <div className={styles.tablaWrap}>
              <table className={styles.tablaSmae}>
                <thead>
                  <tr>
                    <th className={styles.thGrupo}></th>
                    <th>Porcentaje</th>
                    <th>Kcal</th>
                    <th>Gramos</th>
                  </tr>
                </thead>
                <tbody>
                  {distribucion.map((fila) => (
                    <tr key={fila.nombre}>
                      <td className={styles.tdGrupo}>{fila.nombre}</td>
                      <td className={styles.tdNum}>{fila.porcentaje}%</td>
                      <td className={styles.tdNum}>{fila.kcal}</td>
                      <td className={styles.tdNum}>{fila.gramos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
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
