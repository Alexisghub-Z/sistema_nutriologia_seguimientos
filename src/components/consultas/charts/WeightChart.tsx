'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import styles from './Charts.module.css'

interface DataPoint {
  fecha: string
  peso: number | null
  imc: number | null
}

interface WeightChartProps {
  data: DataPoint[]
}

export default function WeightChart({ data }: WeightChartProps) {
  // Filtrar datos válidos
  const validData = data.filter(d => d.peso !== null || d.imc !== null)

  if (validData.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>No hay datos de peso e IMC para mostrar</p>
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
  const pesos = validData.filter(d => d.peso !== null).map(d => d.peso!)
  const pesoInicial = pesos[0] // Primer elemento = más antiguo
  const pesoActual = pesos[pesos.length - 1] // Último elemento = más reciente
  const diferenciaPeso = pesoActual - pesoInicial

  const imcs = validData.filter(d => d.imc !== null).map(d => d.imc!)
  const imcInicial = imcs[0]
  const imcActual = imcs[imcs.length - 1]

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Evolución de Peso e IMC</h3>
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
                  diferenciaPeso > 0 ? styles.positive : diferenciaPeso < 0 ? styles.negative : ''
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
