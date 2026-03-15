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
  pliegue_tricipital: number | null
  pliegue_subescapular: number | null
  pliegue_bicipital: number | null
  pliegue_cresta_iliaca: number | null
  pliegue_supraespinal: number | null
  pliegue_abdominal: number | null
}

interface SkinfoldChartProps {
  data: DataPoint[]
}

interface DataPointConSumaYDelta extends DataPoint {
  suma_pliegues: number | null
  delta_tricipital: number | null
  delta_subescapular: number | null
  delta_bicipital: number | null
  delta_cresta: number | null
  delta_supraespinal: number | null
  delta_abdominal: number | null
  delta_suma: number | null
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function formatearFechaTooltip(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DeltaBadge({ delta, unit }: { delta: number; unit: string }) {
  const color = delta === 0 ? '#6b7280' : delta < 0 ? '#16a34a' : '#dc2626'
  const signo = delta > 0 ? '+' : ''
  return (
    <span style={{ color, fontSize: '11px', fontWeight: 600 }}>
      {signo}{delta.toFixed(1)} {unit}
    </span>
  )
}

const DELTA_KEY_SKIN: Record<string, keyof DataPointConSumaYDelta> = {
  pliegue_tricipital:    'delta_tricipital',
  pliegue_subescapular:  'delta_subescapular',
  pliegue_bicipital:     'delta_bicipital',
  pliegue_cresta_iliaca: 'delta_cresta',
  pliegue_supraespinal:  'delta_supraespinal',
  pliegue_abdominal:     'delta_abdominal',
  suma_pliegues:         'delta_suma',
}

function SkinfoldTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  const punto: DataPointConSumaYDelta = payload[0]?.payload
  return (
    <div className={styles.customTooltip}>
      <p className={styles.tooltipFecha}>{formatearFechaTooltip(label)}</p>
      <div className={styles.tooltipFilas}>
        {payload.map((p: any) => {
          const deltaKey = DELTA_KEY_SKIN[p.dataKey]
          const delta = deltaKey ? (punto[deltaKey] as number | null) : null
          return (
            <div key={p.dataKey} className={styles.tooltipFila}>
              <span className={styles.tooltipDot} style={{ backgroundColor: p.color }} />
              <span className={styles.tooltipNombre}>{p.name}:</span>
              <span className={styles.tooltipValor}>{p.value != null ? Number(p.value).toFixed(1) : '—'} mm</span>
              {delta != null && (
                <span className={styles.tooltipDelta}>
                  <DeltaBadge delta={delta} unit="mm" />
                </span>
              )}
            </div>
          )
        })}
      </div>
      {payload.some((p: any) => {
        const k = DELTA_KEY_SKIN[p.dataKey]; return k && punto[k] != null
      }) && (
        <p className={styles.tooltipHint}>vs. consulta anterior</p>
      )}
    </div>
  )
}

export default function SkinfoldChart({ data }: SkinfoldChartProps) {
  // Filtrar datos válidos
  const validData = data.filter(
    (d) =>
      d.pliegue_tricipital !== null ||
      d.pliegue_subescapular !== null ||
      d.pliegue_bicipital !== null ||
      d.pliegue_cresta_iliaca !== null ||
      d.pliegue_supraespinal !== null ||
      d.pliegue_abdominal !== null
  )

  if (validData.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>No hay datos de pliegues cutáneos para mostrar</p>
      </div>
    )
  }

  const soloUnPunto = validData.length === 1

  // Calcular suma de pliegues y deltas respecto al punto anterior
  const dataConSuma: DataPointConSumaYDelta[] = validData.map((d, i) => {
    const suma = [
      d.pliegue_tricipital,
      d.pliegue_subescapular,
      d.pliegue_bicipital,
      d.pliegue_cresta_iliaca,
      d.pliegue_supraespinal,
      d.pliegue_abdominal,
    ]
      .filter((v) => v !== null)
      .reduce((acc, val) => acc + (val || 0), 0)

    const suma_pliegues = suma > 0 ? suma : null
    const prev = i > 0 ? validData[i - 1] : null
    const prevSuma = prev
      ? [prev.pliegue_tricipital, prev.pliegue_subescapular, prev.pliegue_bicipital,
         prev.pliegue_cresta_iliaca, prev.pliegue_supraespinal, prev.pliegue_abdominal]
          .filter((v) => v !== null).reduce((acc, val) => acc + (val || 0), 0)
      : null

    return {
      ...d,
      suma_pliegues,
      delta_tricipital:   prev?.pliegue_tricipital   != null && d.pliegue_tricipital   != null ? d.pliegue_tricipital   - prev.pliegue_tricipital   : null,
      delta_subescapular: prev?.pliegue_subescapular != null && d.pliegue_subescapular != null ? d.pliegue_subescapular - prev.pliegue_subescapular : null,
      delta_bicipital:    prev?.pliegue_bicipital    != null && d.pliegue_bicipital    != null ? d.pliegue_bicipital    - prev.pliegue_bicipital    : null,
      delta_cresta:       prev?.pliegue_cresta_iliaca != null && d.pliegue_cresta_iliaca != null ? d.pliegue_cresta_iliaca - prev.pliegue_cresta_iliaca : null,
      delta_supraespinal: prev?.pliegue_supraespinal != null && d.pliegue_supraespinal != null ? d.pliegue_supraespinal - prev.pliegue_supraespinal : null,
      delta_abdominal:    prev?.pliegue_abdominal    != null && d.pliegue_abdominal    != null ? d.pliegue_abdominal    - prev.pliegue_abdominal    : null,
      delta_suma:         prevSuma != null && prevSuma > 0 && suma_pliegues != null ? suma_pliegues - prevSuma : null,
    }
  })

  // Datos vienen ordenados de más antiguo a más reciente
  const sumas = dataConSuma.filter((d) => d.suma_pliegues !== null).map((d) => d.suma_pliegues!)
  const sumaInicial = sumas.length > 0 ? sumas[0] : null
  const sumaActual = sumas.length > 0 ? sumas[sumas.length - 1] : null
  const diferenciaSuma = sumaActual && sumaInicial ? sumaActual - sumaInicial : null

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Pliegues Cutáneos (mm)</h3>
        {soloUnPunto && (
          <p className={styles.singlePointWarning}>
            Se necesitan al menos 2 consultas con datos para mostrar la evolución.
          </p>
        )}
        {sumaActual !== null && (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Suma actual:</span>
              <span className={styles.statValue}>{sumaActual!.toFixed(1)} mm</span>
            </div>
            {diferenciaSuma !== null && (
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Cambio:</span>
                <span
                  className={`${styles.statValue} ${
                    diferenciaSuma < 0 ? styles.positive : diferenciaSuma > 0 ? styles.negative : ''
                  }`}
                >
                  {diferenciaSuma > 0 ? '+' : ''}
                  {diferenciaSuma.toFixed(1)} mm
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={dataConSuma}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatearFecha}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'mm (pliegues)', angle: -90, position: 'insideLeft', offset: 10 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'mm (suma)', angle: 90, position: 'insideRight', offset: 10 }}
          />
          <Tooltip content={<SkinfoldTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pliegue_tricipital"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            name="P. Tricipital"
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pliegue_subescapular"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
            name="P. Subescapular"
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pliegue_bicipital"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            name="P. Bicipital"
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pliegue_cresta_iliaca"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="P. Cresta ilíaca"
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pliegue_supraespinal"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            name="P. Supraespinal"
            connectNulls
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pliegue_abdominal"
            stroke="#ec4899"
            strokeWidth={2}
            dot={{ fill: '#ec4899', r: 4 }}
            name="P. Abdominal"
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="suma_pliegues"
            stroke="#6b7280"
            strokeWidth={3}
            strokeDasharray="5 5"
            dot={{ fill: '#6b7280', r: 5 }}
            name="Suma Total"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
