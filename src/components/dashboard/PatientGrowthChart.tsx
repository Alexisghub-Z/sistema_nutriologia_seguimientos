'use client'

import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import styles from './Charts.module.css'

interface PatientGrowthChartProps {
  data: Array<{ mes: string; nuevos: number; total: number }>
}

const MESES_CORTO: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}

type ChartRango = '6' | '12'

export default function PatientGrowthChart({ data }: PatientGrowthChartProps) {
  const [rango, setRango] = useState<ChartRango>('6')

  const filteredData = useMemo(() => {
    const sliced = rango === '6' ? data.slice(-6) : data.slice(-12)
    return sliced.map((d) => {
      const mesNum = d.mes.split('-')[1] ?? ''
      return { ...d, label: MESES_CORTO[mesNum] || d.mes }
    })
  }, [data, rango])

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
      <div className={styles.chartHeaderWithSelect}>
        <div>
          <h3 className={styles.chartTitle}>Crecimiento de Pacientes</h3>
          <p className={styles.chartSubtitle}>Últimos {rango} meses</p>
        </div>
        <select
          className={styles.chartSelect}
          value={rango}
          onChange={(e) => setRango(e.target.value as ChartRango)}
        >
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
        </select>
      </div>
      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#f0f1f3" strokeDasharray="none" />
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
            <Line
              type="monotone"
              dataKey="total"
              name="Total acumulado"
              stroke="#2d9f5d"
              strokeWidth={2}
              dot={{ fill: '#2d9f5d', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="nuevos"
              name="Nuevos"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#3b82f6', r: 2.5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
