'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  calcularSomatotipo,
  clasificarSomatotipo,
  formatearSomatotipo,
  analizarCambio,
  interpretarCambio,
  categoriaReferencia,
  ritmoCambio,
  type Somatotipo,
} from '@/lib/utils/somatotipo'
import styles from './Charts.module.css'
import somato from './SomatotipoChart.module.css'

interface DataPoint {
  id: string
  fecha: string
  peso: number | null
  talla: number | null
  brazo_flexionado: number | null
  pantorrilla_maximo: number | null
  diametro_humero: number | null
  diametro_femur: number | null
  pliegue_tricipital: number | null
  pliegue_subescapular: number | null
  pliegue_supraespinal: number | null
  pliegue_pantorrilla: number | null
}

interface SomatotipoChartProps {
  data: DataPoint[]
  onConsultaClick: (id: string) => void
}

interface PuntoSomato {
  id: string
  fecha: string
  soma: Somatotipo
  n: number
  x: number
  y: number
  t: number
  esUltimo: boolean
}

// ── Somatocarta con ejes graduados ──
const W = 560
const H = 540
const CX = 280
const CY = 292
const UNIT = 27
const MAX = 9
const RAD = Math.PI / 180

const DIR_MESO = { x: 0, y: -1 }
const DIR_ENDO = { x: -Math.cos(30 * RAD), y: Math.sin(30 * RAD) }
const DIR_ECTO = { x: Math.cos(30 * RAD), y: Math.sin(30 * RAD) }

function proyectar(s: Somatotipo) {
  return {
    x: CX + UNIT * (s.endomorfia * DIR_ENDO.x + s.mesomorfia * DIR_MESO.x + s.ectomorfia * DIR_ECTO.x),
    y: CY + UNIT * (s.endomorfia * DIR_ENDO.y + s.mesomorfia * DIR_MESO.y + s.ectomorfia * DIR_ECTO.y),
  }
}
function verticeEje(dir: { x: number; y: number }) {
  return { x: CX + UNIT * MAX * dir.x, y: CY + UNIT * MAX * dir.y }
}
const V_MESO = verticeEje(DIR_MESO)
const V_ENDO = verticeEje(DIR_ENDO)
const V_ECTO = verticeEje(DIR_ECTO)

function medioAbombado(a: { x: number; y: number }, b: { x: number; y: number }, bulge: number) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = mx - CX
  const dy = my - CY
  const l = Math.hypot(dx, dy) || 1
  return { x: mx + (dx / l) * bulge, y: my + (dy / l) * bulge }
}
const CONTORNO = [
  `M ${V_MESO.x} ${V_MESO.y}`,
  `Q ${medioAbombado(V_MESO, V_ECTO, 22).x} ${medioAbombado(V_MESO, V_ECTO, 22).y} ${V_ECTO.x} ${V_ECTO.y}`,
  `Q ${medioAbombado(V_ECTO, V_ENDO, 22).x} ${medioAbombado(V_ECTO, V_ENDO, 22).y} ${V_ENDO.x} ${V_ENDO.y}`,
  `Q ${medioAbombado(V_ENDO, V_MESO, 22).x} ${medioAbombado(V_ENDO, V_MESO, 22).y} ${V_MESO.x} ${V_MESO.y}`,
  'Z',
].join(' ')

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}
function colorPunto(t: number) {
  return `rgb(${lerp(190, 45, t)}, ${lerp(225, 159, t)}, ${lerp(205, 93, t)})`
}

function ticksEje(dir: { x: number; y: number }) {
  const perp = { x: -dir.y, y: dir.x }
  const items = []
  for (let u = 1; u <= MAX; u++) {
    const x = CX + UNIT * u * dir.x
    const y = CY + UNIT * u * dir.y
    items.push({
      x,
      y,
      lx: x + perp.x * 12,
      ly: y + perp.y * 12 + 3,
      label: u,
      mostrar: u % 2 === 0 || u === MAX,
      x1: x - perp.x * 4,
      y1: y - perp.y * 4,
      x2: x + perp.x * 4,
      y2: y + perp.y * 4,
    })
  }
  return items
}
const TICKS_MESO = ticksEje(DIR_MESO)
const TICKS_ENDO = ticksEje(DIR_ENDO)
const TICKS_ECTO = ticksEje(DIR_ECTO)

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function mesesEntre(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
}

function calcularPuntos(data: DataPoint[]): PuntoSomato[] {
  const puntos: PuntoSomato[] = []
  data.forEach((d) => {
    const s = calcularSomatotipo(d)
    if (!s) return
    const { x, y } = proyectar(s)
    puntos.push({ id: d.id, fecha: d.fecha, soma: s, n: 0, x, y, t: 0, esUltimo: false })
  })
  const last = puntos.length - 1
  puntos.forEach((p, i) => {
    p.n = i + 1
    p.t = last > 0 ? i / last : 1
  })
  if (last >= 0) puntos[last]!.esUltimo = true
  return puntos
}

function Ticks({ items, color }: { items: ReturnType<typeof ticksEje>; color: string }) {
  return (
    <g>
      {items.map((it, i) => (
        <g key={i}>
          <line x1={it.x1} y1={it.y1} x2={it.x2} y2={it.y2} stroke={color} strokeWidth={1.5} />
          {it.mostrar && (
            <text x={it.lx} y={it.ly} textAnchor="middle" className={somato.tickNum}>
              {it.label}
            </text>
          )}
        </g>
      ))}
    </g>
  )
}

function Delta({ valor, favorable }: { valor: number; favorable: boolean | null }) {
  const flecha = valor > 0.05 ? '↑' : valor < -0.05 ? '↓' : '→'
  const signo = valor > 0 ? '+' : ''
  const cls = favorable === true ? somato.favorable : favorable === false ? somato.desfavorable : somato.neutral
  return (
    <span className={`${somato.delta} ${cls}`}>
      {flecha} {signo}
      {valor.toFixed(1)}
    </span>
  )
}

export default function SomatotipoChart({ data, onConsultaClick }: SomatotipoChartProps) {
  const puntos = calcularPuntos(data)
  const total = puntos.length
  const [sel, setSel] = useState(total - 1) // índice seleccionado (empieza en la más reciente)
  const [zoom, setZoom] = useState(false) // acercamiento a la zona del recorrido
  const [reproduciendo, setReproduciendo] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mantener sel válido si cambian los datos
  useEffect(() => {
    setSel((s) => Math.min(Math.max(0, s), Math.max(0, total - 1)))
  }, [total])

  const detener = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setReproduciendo(false)
  }, [])

  const reproducir = useCallback(() => {
    if (total < 2) return
    detener()
    setZoom(true)
    setSel(0)
    setReproduciendo(true)
    let i = 0
    timerRef.current = setInterval(() => {
      i += 1
      if (i >= total) {
        detener()
        return
      }
      setSel(i)
    }, 900)
  }, [total, detener])

  useEffect(() => () => detener(), [detener])

  if (total === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>
          No hay consultas con datos completos para el somatotipo. Se requieren: talla, peso, los
          pliegues tricipital, subescapular, supraespinal y de pantorrilla, el perímetro de brazo
          flexionado y de pantorrilla, y los diámetros de húmero y fémur.
        </p>
      </div>
    )
  }

  const inicial = puntos[0]!.soma
  const actual = puntos[total - 1]!.soma
  const seleccion = puntos[sel]!
  const hayVarias = total > 1
  const trayectoria = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  // Análisis clínico
  const analisis = analizarCambio(inicial, actual)
  const interpretacion = interpretarCambio(analisis)
  const meses = mesesEntre(puntos[0]!.fecha, puntos[total - 1]!.fecha)
  const ritmo = ritmoCambio(analisis.sam, meses)
  const perfil = categoriaReferencia(actual)
  const prev = hayVarias ? puntos[total - 2]!.soma : null
  const dPrev = prev
    ? {
        e: Math.round((actual.endomorfia - prev.endomorfia) * 10) / 10,
        m: Math.round((actual.mesomorfia - prev.mesomorfia) * 10) / 10,
        c: Math.round((actual.ectomorfia - prev.ectomorfia) * 10) / 10,
      }
    : null

  // Zoom real: viewBox que encuadra la nube de puntos (con margen) al activar
  const minx = Math.min(...puntos.map((p) => p.x))
  const maxx = Math.max(...puntos.map((p) => p.x))
  const miny = Math.min(...puntos.map((p) => p.y))
  const maxy = Math.max(...puntos.map((p) => p.y))
  const bw = maxx - minx
  const bh = maxy - miny
  const margen = Math.max(bw, bh) * 0.5 + 46
  const vbX = minx - margen
  const vbY = miny - margen
  const vbW = bw + margen * 2
  const vbH = bh + margen * 2
  const viewBox = zoom && hayVarias ? `${vbX} ${vbY} ${vbW} ${vbH}` : `0 0 ${W} ${H}`
  // Escala del zoom para ajustar tamaños de puntos/textos
  const zEsc = zoom && hayVarias ? Math.min(vbW / W, vbH / H) : 1
  const rPunto = (esUlt: boolean) => (esUlt ? 7 : 5.5) * (zoom ? Math.max(0.55, zEsc * 2.4) : 1)

  const irA = (i: number) => {
    detener()
    setSel(i)
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Somatotipo (Heath-Carter)</h3>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Somatotipo actual</span>
            <span className={styles.statValue}>{formatearSomatotipo(actual)}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Clasificación</span>
            <span className={styles.statValue}>{clasificarSomatotipo(actual)}</span>
          </div>
        </div>
      </div>

      <div className={somato.grid}>
        {/* ── Columna izquierda: carta interactiva + navegación ── */}
        <div className={somato.colCarta}>
          <div className={somato.cartaWrap}>
            <svg viewBox={viewBox} className={`${somato.carta} ${zoom ? somato.cartaZoom : ''}`} role="img" aria-label="Somatocarta Heath-Carter">
              <path d={CONTORNO} className={somato.contorno} />
              <line x1={CX} y1={CY} x2={V_MESO.x} y2={V_MESO.y} className={somato.eje} />
              <line x1={CX} y1={CY} x2={V_ENDO.x} y2={V_ENDO.y} className={somato.eje} />
              <line x1={CX} y1={CY} x2={V_ECTO.x} y2={V_ECTO.y} className={somato.eje} />
              <Ticks items={TICKS_MESO} color="#86efac" />
              <Ticks items={TICKS_ENDO} color="#fca5a5" />
              <Ticks items={TICKS_ECTO} color="#93c5fd" />
              <circle cx={CX} cy={CY} r={3} className={somato.centro} />
              <text x={V_MESO.x} y={V_MESO.y - 11} textAnchor="middle" className={`${somato.polo} ${somato.poloMeso}`}>
                MESOMORFIA
              </text>
              <text x={V_ENDO.x - 2} y={V_ENDO.y + 20} textAnchor="middle" className={`${somato.polo} ${somato.poloEndo}`}>
                ENDOMORFIA
              </text>
              <text x={V_ECTO.x + 2} y={V_ECTO.y + 20} textAnchor="middle" className={`${somato.polo} ${somato.poloEcto}`}>
                ECTOMORFIA
              </text>

              {hayVarias && <path d={trayectoria} className={somato.trayectoriaTenue} />}

              {puntos.map((p, i) => {
                const activo = i === sel
                const r = rPunto(p.esUltimo)
                return (
                  <g
                    key={p.id}
                    className={somato.puntoGroup}
                    onMouseEnter={() => !reproduciendo && setSel(i)}
                    onClick={() => onConsultaClick(p.id)}
                  >
                    {activo && <circle cx={p.x} cy={p.y} r={r + 6 * (zoom ? Math.max(0.6, zEsc * 2.4) : 1)} className={somato.halo} />}
                    <circle cx={p.x} cy={p.y} r={activo ? r + 1.5 : r} fill={colorPunto(p.t)} className={somato.puntoBorde} />
                    {zoom && (
                      <text x={p.x} y={p.y + r * 0.42} textAnchor="middle" className={p.t > 0.45 ? somato.puntoNumClaro : somato.puntoNumOscuro} style={{ fontSize: `${r * 1.05}px` }}>
                        {p.n}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {/* Controles de zoom sobre la carta */}
            {hayVarias && (
              <div className={somato.controlesZoom}>
                <button
                  type="button"
                  className={somato.btnZoom}
                  onClick={() => {
                    detener()
                    setZoom((z) => !z)
                  }}
                  aria-label={zoom ? 'Alejar' : 'Acercar al recorrido'}
                  title={zoom ? 'Ver carta completa' : 'Acercar al recorrido'}
                >
                  {zoom ? '⤢ Ver completa' : '🔍 Acercar'}
                </button>
              </div>
            )}
          </div>

          {/* ── Barra de navegación (time-lapse) ── */}
          {hayVarias && (
            <div className={somato.navBar}>
              <button
                type="button"
                className={somato.navBtn}
                onClick={() => (reproduciendo ? detener() : reproducir())}
                title={reproduciendo ? 'Pausar' : 'Reproducir evolución'}
              >
                {reproduciendo ? '❚❚' : '▶'}
              </button>
              <button type="button" className={somato.navBtn} disabled={sel === 0} onClick={() => irA(Math.max(0, sel - 1))} title="Anterior">
                ‹
              </button>

              <div className={somato.chips}>
                {puntos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`${somato.chip} ${i === sel ? somato.chipActivo : ''}`}
                    style={i === sel ? { backgroundColor: colorPunto(p.t), borderColor: colorPunto(p.t) } : undefined}
                    onClick={() => irA(i)}
                    onDoubleClick={() => onConsultaClick(p.id)}
                    title={`Consulta ${p.n} · ${formatearFecha(p.fecha)}`}
                  >
                    {p.n}
                  </button>
                ))}
              </div>

              <button type="button" className={somato.navBtn} disabled={sel === total - 1} onClick={() => irA(Math.min(total - 1, sel + 1))} title="Siguiente">
                ›
              </button>
            </div>
          )}

          {/* Detalle de la consulta seleccionada */}
          <div className={somato.selDetalle}>
            <div className={somato.selHead}>
              <span className={somato.selN} style={{ backgroundColor: colorPunto(seleccion.t) }}>
                {seleccion.n}
              </span>
              <div>
                <p className={somato.selTitulo}>
                  {seleccion.esUltimo ? 'Consulta más reciente' : `Consulta ${seleccion.n} de ${total}`}
                </p>
                <p className={somato.selFecha}>{formatearFecha(seleccion.fecha)}</p>
              </div>
              <span className={somato.selSoma}>{formatearSomatotipo(seleccion.soma)}</span>
            </div>
            <button type="button" className={somato.selBtn} onClick={() => onConsultaClick(seleccion.id)}>
              Abrir esta consulta →
            </button>
          </div>
        </div>

        {/* ── Columna derecha: análisis clínico ── */}
        <div className={somato.colPanel}>
          {hayVarias && <div className={somato.interpretacion}>{interpretacion}</div>}

          <div className={somato.tarjeta}>
            <div className={somato.tarjetaHead}>
              <span className={somato.tarjetaTitulo}>{hayVarias ? 'CAMBIO TOTAL' : 'COMPONENTES'}</span>
              {hayVarias && <span className={somato.tarjetaNota}>inicial → actual</span>}
            </div>
            {hayVarias ? (
              <>
                <Fila color="#dc2626" label="Endomorfia (grasa)">
                  <Delta valor={analisis.endomorfia.delta} favorable={analisis.endomorfia.favorable} />
                </Fila>
                <Fila color="#16a34a" label="Mesomorfia (músculo)">
                  <Delta valor={analisis.mesomorfia.delta} favorable={analisis.mesomorfia.favorable} />
                </Fila>
                <Fila color="#2563eb" label="Ectomorfia (linealidad)">
                  <Delta valor={analisis.ectomorfia.delta} favorable={null} />
                </Fila>
                {dPrev && (
                  <>
                    <p className={somato.subhead}>DESDE LA CONSULTA ANTERIOR</p>
                    <Fila color="#dc2626" label="Endomorfia">
                      <Delta valor={dPrev.e} favorable={dPrev.e < 0} />
                    </Fila>
                    <Fila color="#16a34a" label="Mesomorfia">
                      <Delta valor={dPrev.m} favorable={dPrev.m > 0} />
                    </Fila>
                    <Fila color="#2563eb" label="Ectomorfia">
                      <Delta valor={dPrev.c} favorable={null} />
                    </Fila>
                  </>
                )}
              </>
            ) : (
              <>
                <Fila color="#dc2626" label="Endomorfia (grasa)">
                  <span className={somato.valorFijo}>{actual.endomorfia.toFixed(1)}</span>
                </Fila>
                <Fila color="#16a34a" label="Mesomorfia (músculo)">
                  <span className={somato.valorFijo}>{actual.mesomorfia.toFixed(1)}</span>
                </Fila>
                <Fila color="#2563eb" label="Ectomorfia (linealidad)">
                  <span className={somato.valorFijo}>{actual.ectomorfia.toFixed(1)}</span>
                </Fila>
              </>
            )}
          </div>

          {hayVarias && (
            <div className={somato.metricas}>
              <div className={somato.metrica}>
                <span className={somato.metricaLabel}>Migración (SAM)</span>
                <span className={somato.metricaValor}>{analisis.sam.toFixed(1)}</span>
                <span className={somato.metricaNota}>{analisis.cambioReal ? 'cambio real (>2)' : 'cambio leve'}</span>
              </div>
              <div className={somato.metrica}>
                <span className={somato.metricaLabel}>Ritmo</span>
                <span className={somato.metricaValor}>
                  {ritmo.porMes.toFixed(2)}
                  <span className={somato.metricaUnidad}>/mes</span>
                </span>
                <span className={somato.metricaNota}>{ritmo.etiqueta}</span>
              </div>
            </div>
          )}

          <p className={somato.perfil}>
            Perfil: <b>{perfil}</b>
          </p>
        </div>
      </div>
    </div>
  )
}

function Fila({ color, label, children }: { color: string; label: string; children: React.ReactNode }) {
  return (
    <div className={somato.fila}>
      <span className={somato.filaDot} style={{ backgroundColor: color }} />
      <span className={somato.filaLabel}>{label}</span>
      {children}
    </div>
  )
}
