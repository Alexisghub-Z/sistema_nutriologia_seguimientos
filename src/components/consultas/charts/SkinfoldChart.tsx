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

  // Formatear fecha para el eje X
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    })
  }

  // Calcular suma de pliegues (útil para evaluación antropométrica)
  const dataConSuma = validData.map((d) => {
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

    return {
      ...d,
      suma_pliegues: suma > 0 ? suma : null,
    }
  })

  const sumas = dataConSuma.filter((d) => d.suma_pliegues !== null).map((d) => d.suma_pliegues!)
  const sumaInicial = sumas.length > 0 ? sumas[sumas.length - 1] : null
  const sumaActual = sumas.length > 0 ? sumas[0] : null
  const diferenciaSuma = sumaActual && sumaInicial ? sumaActual - sumaInicial : null

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Pliegues Cutáneos (mm)</h3>
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
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: 'mm', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: any) => value?.toFixed(1) + ' mm'}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="pliegue_tricipital"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            name="P. Tricipital"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pliegue_subescapular"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
            name="P. Subescapular"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pliegue_bicipital"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            name="P. Bicipital"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pliegue_cresta_iliaca"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="P. Cresta ilíaca"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pliegue_supraespinal"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            name="P. Supraespinal"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pliegue_abdominal"
            stroke="#ec4899"
            strokeWidth={2}
            dot={{ fill: '#ec4899', r: 4 }}
            name="P. Abdominal"
            connectNulls
          />
          <Line
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
