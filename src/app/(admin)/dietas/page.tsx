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
  notas: '',
}

// Distribución calórica por defecto (% de HCO / lípidos / proteína).
const PCT_DEFAULT = { hco: 50, lip: 25, pro: 25 }

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

  const setEquivalente = (id: GrupoSMAEId, valor: string) => {
    // Permite medios equivalentes: redondea al 0.5 más cercano.
    const n = valor === '' ? 0 : Math.max(0, Math.round(Number(valor) * 2) / 2)
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
    setPct({ ...PCT_DEFAULT })
    setKcalOverride(null)
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
    setPct({ ...PCT_DEFAULT })
    setKcalOverride(null)
    setForm({ ...FORM_INICIAL })
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

  const construirPayload = (guardar: boolean) => ({
    paciente_id: paciente!.id,
    peso: Number(form.peso),
    talla_cm: Number(form.talla_cm),
    edad: Number(form.edad),
    sexo: form.sexo,
    nivel_actividad: form.nivel_actividad,
    objetivo: form.objetivo,
    pct_proteina: pct.pro,
    pct_grasa: pct.lip,
    pct_carbohidrato: pct.hco,
    kcal_meta_manual: kcalEditada ? kcalMeta : undefined,
    equivalentes,
    notas: form.notas || undefined,
    guardar,
  })

  const calcular = async () => {
    setError('')
    setExito('')
    if (!pctOk) {
      setError('Los porcentajes de la distribución (HCO/Líp/Pro) deben sumar 100.')
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
              <Button onClick={calcular} disabled={!datosMinimos || calculando}>
                {calculando ? 'Calculando…' : 'Calcular'}
              </Button>
              <Button variant="secondary" onClick={guardar} disabled={!resultado || guardando}>
                {guardando ? 'Guardando…' : 'Guardar cuadro'}
              </Button>
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {exito && <p className={styles.exito}>{exito}</p>}

            {/* Cuadro de distribución — % editables, junto a lo que se edita */}
            {distribucion && (
              <>
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
              </>
            )}
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
                      <p className={styles.macroGramos}>{distribucion[2]!.gramos} g</p>
                      <span className={styles.macroKcal}>{distribucion[2]!.kcal} kcal</span>
                    </div>
                    <div className={styles.macroCard}>
                      <div className={styles.macroNombre}>Grasa</div>
                      <p className={styles.macroGramos}>{distribucion[1]!.gramos} g</p>
                      <span className={styles.macroKcal}>{distribucion[1]!.kcal} kcal</span>
                    </div>
                    <div className={styles.macroCard}>
                      <div className={styles.macroNombre}>Carbohidrato</div>
                      <p className={styles.macroGramos}>{distribucion[0]!.gramos} g</p>
                      <span className={styles.macroKcal}>{distribucion[0]!.kcal} kcal</span>
                    </div>
                  </div>
                )}
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
                              step={0.5}
                              className={styles.equivSlider}
                              value={n}
                              onChange={(e) => setEquivalente(g.id, e.target.value)}
                              aria-label={`Equivalentes de ${g.nombre}`}
                            />
                            <span className={styles.equivValor}>{n}</span>
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
    </div>
  )
}

// Muestra un número sin decimales si es entero, o con 1 decimal si no
// (los medios equivalentes producen aportes fraccionarios como 7.5).
function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
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
