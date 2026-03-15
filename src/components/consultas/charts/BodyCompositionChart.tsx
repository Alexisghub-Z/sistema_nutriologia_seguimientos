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
  fecha: string
  grasa_corporal: number | null
  porcentaje_agua: number | null
  masa_muscular_kg: number | null
  grasa_visceral: number | null
}

interface BodyCompositionChartProps {
  data: DataPoint[]
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

function DeltaBadge({ delta, unit, invertido = false }: { delta: number; unit: string; invertido?: boolean }) {
  const esMejora = invertido ? delta < 0 : delta > 0
  const color = delta === 0 ? '#6b7280' : esMejora ? '#16a34a' : '#dc2626'
  const signo = delta > 0 ? '+' : ''
  return (
    <span style={{ color, fontSize: '11px', fontWeight: 600 }}>
      {signo}{delta.toFixed(1)}{unit}
    </span>
  )
}

function BodyTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  const punto: DataPointConDelta = payload[0]?.payload
  const fecha = formatearFechaTooltip(label)

  const config: Record<string, { delta: number | null; unit: string; invertido: boolean }> = {
    grasa_corporal:  { delta: punto.delta_grasa,   unit: '%',  invertido: true },
    porcentaje_agua: { delta: punto.delta_agua,    unit: '%',  invertido: false },
    masa_muscular_kg:{ delta: punto.delta_musculo, unit: ' kg', invertido: false },
  }

  return (
    <div className={styles.customTooltip}>
      <p className={styles.tooltipFecha}>{fecha}</p>
      <div className={styles.tooltipFilas}>
        {payload.map((p: any) => {
          const cfg = config[p.dataKey]
          return (
            <div key={p.dataKey} className={styles.tooltipFila}>
              <span className={styles.tooltipDot} style={{ backgroundColor: p.color }} />
              <span className={styles.tooltipNombre}>{p.name}:</span>
              <span className={styles.tooltipValor}>{p.value != null ? Number(p.value).toFixed(1) : '—'}{cfg?.unit ?? ''}</span>
              {cfg?.delta != null && (
                <span className={styles.tooltipDelta}>
                  <DeltaBadge delta={cfg.delta} unit={cfg.unit} invertido={cfg.invertido} />
                </span>
              )}
            </div>
          )
        })}
      </div>
      {payload.some((p: any) => config[p.dataKey]?.delta != null) && (
        <p className={styles.tooltipHint}>vs. consulta anterior</p>
      )}
    </div>
  )
}

export default function BodyCompositionChart({ data }: BodyCompositionChartProps) {
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
                      diferenciaMusculo > 0
                        ? styles.positive
                        : diferenciaMusculo < 0
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
                      diferenciaAgua > 0
                        ? styles.positive
                        : diferenciaAgua < 0
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
        <LineChart data={dataConDelta}>
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
            dot={{ fill: '#ef4444', r: 4 }}
            name="% Grasa"
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="porcentaje_agua"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={{ fill: '#06b6d4', r: 4 }}
            name="% Agua"
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="masa_muscular_kg"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            name="Masa Muscular (kg)"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
