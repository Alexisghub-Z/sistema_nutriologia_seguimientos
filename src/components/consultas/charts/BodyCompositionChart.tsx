'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import styles from './Charts.module.css'

interface DataPoint {
  id: string
  fecha: string
  grasa_corporal: number | null
  porcentaje_agua: number | null
  masa_muscular_kg: number | null
  grasa_visceral: number | null
}

interface BodyCompositionChartProps {
  data: DataPoint[]
  onConsultaClick: (id: string) => void
}


interface DataPointConDelta extends DataPoint {
  delta_grasa: number | null
  delta_agua: number | null
  delta_musculo: number | null
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function formatearFechaTooltip(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function colorDelta(delta: number, bajarEsBueno: boolean): string {
  if (delta === 0) return '#6b7280'
  const esMejora = bajarEsBueno ? delta < 0 : delta > 0
  return esMejora ? '#16a34a' : '#dc2626'
}

function BodyTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  const punto: DataPointConDelta = payload[0]?.payload
  const fecha = formatearFechaTooltip(label)

  // Configuración explícita por métrica
  type FilaCfg = { name: string; valor: number | null; unit: string; color: string; delta: number | null; bajarEsBueno: boolean }
  const filas: FilaCfg[] = []

  for (const p of payload) {
    if (p.dataKey === 'grasa_corporal') {
      filas.push({ name: p.name, valor: p.value, unit: '%', color: p.color, delta: punto.delta_grasa, bajarEsBueno: true })
    } else if (p.dataKey === 'porcentaje_agua') {
      filas.push({ name: p.name, valor: p.value, unit: '%', color: p.color, delta: punto.delta_agua, bajarEsBueno: true })
    } else if (p.dataKey === 'masa_muscular_kg') {
      filas.push({ name: p.name, valor: p.value, unit: ' kg', color: p.color, delta: punto.delta_musculo, bajarEsBueno: true })
    }
  }

  const hayDelta = filas.some((f) => f.delta != null)

  return (
    <div className={styles.customTooltip}>
      <p className={styles.tooltipFecha}>{fecha}</p>
      <div className={styles.tooltipFilas}>
        {filas.map((f) => (
          <div key={f.name} className={styles.tooltipFila}>
            <span className={styles.tooltipDot} style={{ backgroundColor: f.color }} />
            <span className={styles.tooltipNombre}>{f.name}:</span>
            <span className={styles.tooltipValor}>{f.valor != null ? Number(f.valor).toFixed(1) : '—'}{f.unit}</span>
            {f.delta != null && (
              <span className={styles.tooltipDelta} style={{ color: colorDelta(f.delta, f.bajarEsBueno), fontSize: '11px', fontWeight: 600 }}>
                {f.delta > 0 ? '+' : ''}{f.delta.toFixed(1)}{f.unit}
              </span>
            )}
          </div>
        ))}
      </div>
      {hayDelta && <p className={styles.tooltipHint}>vs. consulta anterior</p>}
    </div>
  )
}

export default function BodyCompositionChart({ data, onConsultaClick }: BodyCompositionChartProps) {
  const validData = data.filter(
    (d) => d.grasa_corporal !== null || d.porcentaje_agua !== null || d.masa_muscular_kg !== null
  )

  if (validData.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>No hay datos de composición corporal para mostrar</p>
      </div>
    )
  }

  const soloUnPunto = validData.length === 1

  const dataConDelta: DataPointConDelta[] = validData.map((d, i) => {
    const prev = i > 0 ? validData[i - 1] : null
    return {
      ...d,
      delta_grasa:   prev?.grasa_corporal   != null && d.grasa_corporal   != null ? d.grasa_corporal   - prev.grasa_corporal   : null,
      delta_agua:    prev?.porcentaje_agua   != null && d.porcentaje_agua   != null ? d.porcentaje_agua   - prev.porcentaje_agua   : null,
      delta_musculo: prev?.masa_muscular_kg != null && d.masa_muscular_kg != null ? d.masa_muscular_kg - prev.masa_muscular_kg : null,
    }
  })

  const grasas = validData.filter((d) => d.grasa_corporal !== null).map((d) => d.grasa_corporal!)
  const grasaInicial = grasas.length > 0 ? grasas[0] : null
  const grasaActual = grasas.length > 0 ? grasas[grasas.length - 1] : null
  const diferenciaGrasa = grasaActual && grasaInicial ? grasaActual - grasaInicial : null

  const musculos = validData.filter((d) => d.masa_muscular_kg !== null).map((d) => d.masa_muscular_kg!)
  const musculoInicial = musculos.length > 0 ? musculos[0] : null
  const musculoActual = musculos.length > 0 ? musculos[musculos.length - 1] : null
  const diferenciaMusculo = musculoActual && musculoInicial ? musculoActual - musculoInicial : null

  const aguas = validData.filter((d) => d.porcentaje_agua !== null).map((d) => d.porcentaje_agua!)
  const aguaInicial = aguas.length > 0 ? aguas[0] : null
  const aguaActual = aguas.length > 0 ? aguas[aguas.length - 1] : null
  const diferenciaAgua = aguaActual && aguaInicial ? aguaActual - aguaInicial : null

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Composición Corporal</h3>
        {soloUnPunto && (
          <p className={styles.singlePointWarning}>
            Se necesitan al menos 2 consultas con datos para mostrar la evolución.
          </p>
        )}
        <div className={styles.stats}>
          {grasaActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>% Grasa actual:</span>
                <span className={styles.statValue}>{grasaActual!.toFixed(1)}%</span>
              </div>
              {diferenciaGrasa !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaGrasa < 0
                        ? styles.positive
                        : diferenciaGrasa > 0
                          ? styles.negative
                          : ''
                    }`}
                  >
                    {diferenciaGrasa > 0 ? '+' : ''}
                    {diferenciaGrasa.toFixed(1)}%
                  </span>
                </div>
              )}
            </>
          )}
          {musculoActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Masa muscular:</span>
                <span className={styles.statValue}>{musculoActual!.toFixed(1)} kg</span>
              </div>
              {diferenciaMusculo !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio masa musc.:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaMusculo < 0
                        ? styles.positive
                        : diferenciaMusculo > 0
                          ? styles.negative
                          : ''
                    }`}
                  >
                    {diferenciaMusculo > 0 ? '+' : ''}
                    {diferenciaMusculo.toFixed(1)} kg
                  </span>
                </div>
              )}
            </>
          )}
          {aguaActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>% Agua actual:</span>
                <span className={styles.statValue}>{aguaActual!.toFixed(1)}%</span>
              </div>
              {diferenciaAgua !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio % agua:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaAgua < 0
                        ? styles.positive
                        : diferenciaAgua > 0
                          ? styles.negative
                          : ''
                    }`}
                  >
                    {diferenciaAgua > 0 ? '+' : ''}
                    {diferenciaAgua.toFixed(1)}%
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={dataConDelta}
          onClick={(e: any) => {
            const id = e?.activePayload?.[0]?.payload?.id
            if (id) onConsultaClick(id)
          }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatearFecha}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#ef4444"
            style={{ fontSize: '12px' }}
            label={{ value: 'Porcentaje (%)', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#8b5cf6"
            style={{ fontSize: '12px' }}
            label={{ value: 'Masa (kg)', angle: 90, position: 'insideRight' }}
          />
          <Tooltip content={<BodyTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="grasa_corporal"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 5 }}
            activeDot={{ r: 10, strokeWidth: 0, onClick: (_: any, payload: any) => { if (payload?.payload?.id) onConsultaClick(payload.payload.id) } }}
            name="% Grasa"
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="porcentaje_agua"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={{ fill: '#06b6d4', r: 5 }}
            activeDot={{ r: 10, strokeWidth: 0, onClick: (_: any, payload: any) => { if (payload?.payload?.id) onConsultaClick(payload.payload.id) } }}
            name="% Agua"
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="masa_muscular_kg"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 5 }}
            activeDot={{ r: 10, strokeWidth: 0, onClick: (_: any, payload: any) => { if (payload?.payload?.id) onConsultaClick(payload.payload.id) } }}
            name="Masa Muscular (kg)"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
