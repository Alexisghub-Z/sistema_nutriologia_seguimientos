'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import styles from './Charts.module.css'

interface FinancialMetricsChartProps {
  ingresosDelRango: number
  ingresosDeHoy: number
  promedioConsulta: number
  pagosPendientesMonto: number
}

export default function FinancialMetricsChart({
  ingresosDelRango,
  ingresosDeHoy,
  promedioConsulta,
  pagosPendientesMonto,
}: FinancialMetricsChartProps) {
  const data = [
    {
      name: 'Ingresos del Período',
      monto: ingresosDelRango,
      fill: '#2d9f5d',
    },
    {
      name: 'Ingresos de Hoy',
      monto: ingresosDeHoy,
      fill: '#4db87a',
    },
    {
      name: 'Promedio por Consulta',
      monto: promedioConsulta,
      fill: '#247a47',
    },
    {
      name: 'Pagos Pendientes',
      monto: pagosPendientesMonto,
      fill: '#f59e0b',
    },
  ]

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{payload[0].payload.name}</p>
          <p className={styles.tooltipValue}>
            ${payload[0].value.toLocaleString('es-MX', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      )
    }
    return null
  }

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`
    }
    return `$${value}`
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Métricas Financieras</h3>
        <p className={styles.chartSubtitle}>Comparación de indicadores financieros clave</p>
      </div>
      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              angle={-15}
              textAnchor="end"
              height={80}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: '#6b7280', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="monto" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
