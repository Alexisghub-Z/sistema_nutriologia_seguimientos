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
  peso: number | null
  imc: number | null
}

interface WeightChartProps {
  data: DataPoint[]
}

interface DataPointConDelta extends DataPoint {
  delta_peso: number | null
  delta_imc: number | null
}

function formatearFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  })
}

function formatearFechaTooltip(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function colorDelta(delta: number, bajarEsBueno: boolean): string {
  if (delta === 0) return '#6b7280'
  const esMejora = bajarEsBueno ? delta < 0 : delta > 0
  return esMejora ? '#16a34a' : '#dc2626'
}

function WeightTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null

  const punto: DataPointConDelta = payload[0]?.payload
  const fecha = formatearFechaTooltip(label)

  type FilaCfg = { name: string; valor: number | null; unit: string; color: string; delta: number | null; bajarEsBueno: boolean }
  const filas: FilaCfg[] = []

  for (const p of payload) {
    if (p.dataKey === 'peso') {
      filas.push({ name: p.name, valor: p.value, unit: ' kg', color: p.color, delta: punto.delta_peso, bajarEsBueno: true })
    } else if (p.dataKey === 'imc') {
      filas.push({ name: p.name, valor: p.value, unit: '', color: p.color, delta: punto.delta_imc, bajarEsBueno: true })
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

export default function WeightChart({ data }: WeightChartProps) {
  const validData = data.filter((d) => d.peso !== null || d.imc !== null)

  if (validData.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>No hay datos de peso e IMC para mostrar</p>
      </div>
    )
  }

  const soloUnPunto = validData.length === 1

  // Pre-calcular deltas respecto al punto anterior
  const dataConDelta: DataPointConDelta[] = validData.map((d, i) => {
    const prev = i > 0 ? validData[i - 1] : null
    return {
      ...d,
      delta_peso: prev?.peso != null && d.peso != null ? d.peso - prev.peso : null,
      delta_imc: prev?.imc != null && d.imc != null ? d.imc - prev.imc : null,
    }
  })

  const pesos = validData.filter((d) => d.peso !== null).map((d) => d.peso!)
  const pesoInicial = pesos[0]!
  const pesoActual = pesos[pesos.length - 1]!
  const diferenciaPeso = pesoActual - pesoInicial

  const imcs = validData.filter((d) => d.imc !== null).map((d) => d.imc!)
  const imcActual = imcs[imcs.length - 1]!

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Evolución de Peso e IMC</h3>
        {soloUnPunto && (
          <p className={styles.singlePointWarning}>
            Se necesitan al menos 2 consultas con datos para mostrar la evolución.
          </p>
        )}
        {pesos.length > 0 && (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Peso inicial:</span>
              <span className={styles.statValue}>{pesoInicial.toFixed(1)} kg</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Peso actual:</span>
              <span className={styles.statValue}>{pesoActual.toFixed(1)} kg</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Cambio:</span>
              <span
                className={`${styles.statValue} ${
                  diferenciaPeso < 0 ? styles.positive : diferenciaPeso > 0 ? styles.negative : ''
                }`}
              >
                {diferenciaPeso > 0 ? '+' : ''}
                {diferenciaPeso.toFixed(1)} kg
              </span>
            </div>
            {imcs.length > 0 && (
              <div className={styles.statItem}>
                <span className={styles.statLabel}>IMC actual:</span>
                <span className={styles.statValue}>{imcActual.toFixed(1)}</span>
              </div>
            )}
          </div>
        )}
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
            stroke="#2d9f5d"
            style={{ fontSize: '12px' }}
            label={{ value: 'Peso (kg)', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#3b82f6"
            style={{ fontSize: '12px' }}
            label={{ value: 'IMC', angle: 90, position: 'insideRight' }}
          />
          <Tooltip content={<WeightTooltip />} />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="peso"
            stroke="#2d9f5d"
            strokeWidth={2}
            dot={{ fill: '#2d9f5d', r: 4 }}
            name="Peso (kg)"
            connectNulls
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="imc"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="IMC"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
