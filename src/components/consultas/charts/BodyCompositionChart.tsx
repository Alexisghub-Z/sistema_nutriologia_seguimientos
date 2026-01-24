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

export default function BodyCompositionChart({ data }: BodyCompositionChartProps) {
  // Filtrar datos válidos
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

  // Formatear fecha para el eje X
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    })
  }

  // Calcular estadísticas (datos vienen ordenados de más antiguo a más reciente)
  const grasas = validData.filter((d) => d.grasa_corporal !== null).map((d) => d.grasa_corporal!)
  const grasaInicial = grasas.length > 0 ? grasas[0] : null // Primer elemento = más antiguo
  const grasaActual = grasas.length > 0 ? grasas[grasas.length - 1] : null // Último = más reciente
  const diferenciaGrasa = grasaActual && grasaInicial ? grasaActual - grasaInicial : null

  const musculos = validData
    .filter((d) => d.masa_muscular_kg !== null)
    .map((d) => d.masa_muscular_kg!)
  const musculoInicial = musculos.length > 0 ? musculos[0] : null
  const musculoActual = musculos.length > 0 ? musculos[musculos.length - 1] : null
  const diferenciaMusculo = musculoActual && musculoInicial ? musculoActual - musculoInicial : null

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Composición Corporal</h3>
        <div className={styles.stats}>
          {grasaActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>% Grasa actual:</span>
                <span className={styles.statValue}>{grasaActual.toFixed(1)}%</span>
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
                <span className={styles.statValue}>{musculoActual.toFixed(1)} kg</span>
              </div>
              {diferenciaMusculo !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio:</span>
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
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={validData}>
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
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: any) => value?.toFixed(1)}
          />
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
