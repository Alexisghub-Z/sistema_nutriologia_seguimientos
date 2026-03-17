'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import styles from './Charts.module.css'

interface ConsultationsBarChartProps {
  data: Array<{ semana: string; total: number; completadas: number; canceladas: number }>
}

export default function ConsultationsBarChart({ data }: ConsultationsBarChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    otras: d.total - d.completadas - d.canceladas,
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          {payload.map((p: any) => (
            <p key={p.dataKey} className={styles.tooltipMonto} style={{ color: p.color }}>
              {p.name}: {p.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Citas Semanales</h3>
        <p className={styles.chartSubtitle}>Últimas 4 semanas</p>
      </div>
      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#f0f1f3" strokeDasharray="none" />
            <XAxis dataKey="semana" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={6}
              wrapperStyle={{ fontSize: 11, color: '#6b7280' }}
            />
            <Bar dataKey="completadas" name="Completadas" fill="#2d9f5d" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="canceladas" name="Canceladas" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="otras" name="Otras" fill="#d1d5db" stackId="a" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
