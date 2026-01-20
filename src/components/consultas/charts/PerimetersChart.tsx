'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import styles from './Charts.module.css'

interface DataPoint {
  fecha: string
  brazo_relajado: number | null
  brazo_flexionado: number | null
  cintura: number | null
  cadera_maximo: number | null
  muslo_maximo: number | null
  muslo_medio: number | null
  pantorrilla_maximo: number | null
}

interface PerimetersChartProps {
  data: DataPoint[]
}

export default function PerimetersChart({ data }: PerimetersChartProps) {
  // Filtrar datos válidos
  const validData = data.filter(
    d =>
      d.brazo_relajado !== null ||
      d.brazo_flexionado !== null ||
      d.cintura !== null ||
      d.cadera_maximo !== null ||
      d.muslo_maximo !== null ||
      d.muslo_medio !== null ||
      d.pantorrilla_maximo !== null
  )

  if (validData.length === 0) {
    return (
      <div className={styles.emptyChart}>
        <p>No hay datos de perímetros para mostrar</p>
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

  // Calcular estadísticas de cintura y cadera
  const cinturas = validData.filter(d => d.cintura !== null).map(d => d.cintura!)
  const cinturaInicial = cinturas.length > 0 ? cinturas[cinturas.length - 1] : null
  const cinturaActual = cinturas.length > 0 ? cinturas[0] : null
  const diferenciaCintura = cinturaActual && cinturaInicial ? cinturaActual - cinturaInicial : null

  const caderas = validData.filter(d => d.cadera_maximo !== null).map(d => d.cadera_maximo!)
  const caderaInicial = caderas.length > 0 ? caderas[caderas.length - 1] : null
  const caderaActual = caderas.length > 0 ? caderas[0] : null
  const diferenciaCadera = caderaActual && caderaInicial ? caderaActual - caderaInicial : null

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Perímetros Corporales (cm)</h3>
        <div className={styles.stats}>
          {cinturaActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Cintura actual:</span>
                <span className={styles.statValue}>{cinturaActual.toFixed(1)} cm</span>
              </div>
              {diferenciaCintura !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaCintura < 0 ? styles.positive : diferenciaCintura > 0 ? styles.negative : ''
                    }`}
                  >
                    {diferenciaCintura > 0 ? '+' : ''}
                    {diferenciaCintura.toFixed(1)} cm
                  </span>
                </div>
              )}
            </>
          )}
          {caderaActual !== null && (
            <>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Cadera actual:</span>
                <span className={styles.statValue}>{caderaActual.toFixed(1)} cm</span>
              </div>
              {diferenciaCadera !== null && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Cambio:</span>
                  <span
                    className={`${styles.statValue} ${
                      diferenciaCadera < 0 ? styles.positive : diferenciaCadera > 0 ? styles.negative : ''
                    }`}
                  >
                    {diferenciaCadera > 0 ? '+' : ''}
                    {diferenciaCadera.toFixed(1)} cm
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
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'cm', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: any) => value?.toFixed(1) + ' cm'}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="cintura"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
            name="Cintura"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="cadera_maximo"
            stroke="#ec4899"
            strokeWidth={2}
            dot={{ fill: '#ec4899', r: 4 }}
            name="Cadera"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="brazo_relajado"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            name="Brazo relajado"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="brazo_flexionado"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            name="Brazo flexionado"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="muslo_maximo"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            name="Muslo máximo"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="muslo_medio"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={{ fill: '#14b8a6', r: 4 }}
            name="Muslo medio"
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="pantorrilla_maximo"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: '#6366f1', r: 4 }}
            name="Pantorrilla"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
