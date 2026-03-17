'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import styles from './Charts.module.css'

interface CitasCounts {
  completadas: number
  confirmadas: number
  pendientes: number
  canceladas: number
}

interface AppointmentStatusDonutProps {
  hoy: CitasCounts
  periodo: CitasCounts
}

const COLORS: Record<string, string> = {
  Completadas: '#2d9f5d',
  Confirmadas: '#3b82f6',
  Pendientes: '#f59e0b',
  Canceladas: '#ef4444',
}

type DonutRango = 'hoy' | 'periodo'

export default function AppointmentStatusDonut({ hoy, periodo }: AppointmentStatusDonutProps) {
  const [rango, setRango] = useState<DonutRango>('hoy')

  const source = rango === 'hoy' ? hoy : periodo

  const data = [
    { name: 'Completadas', value: source.completadas },
    { name: 'Confirmadas', value: source.confirmadas },
    { name: 'Pendientes', value: source.pendientes },
    { name: 'Canceladas', value: source.canceladas },
  ].filter((d) => d.value > 0)

  const total = source.completadas + source.confirmadas + source.pendientes + source.canceladas

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{payload[0].name}</p>
          <p className={styles.tooltipValue}>{payload[0].value} citas</p>
          <p className={styles.tooltipMonto}>
            {total > 0 ? Math.round((payload[0].value / total) * 100) : 0}% del total
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeaderWithSelect}>
        <div>
          <h3 className={styles.chartTitle}>Estado de Citas</h3>
          <p className={styles.chartSubtitle}>
            {rango === 'hoy' ? 'Distribución de citas de hoy' : 'Distribución del período seleccionado'}
          </p>
        </div>
        <select
          className={styles.chartSelect}
          value={rango}
          onChange={(e) => setRango(e.target.value as DonutRango)}
        >
          <option value="hoy">Hoy</option>
          <option value="periodo">Período</option>
        </select>
      </div>
      <div className={styles.chartContent} style={{ position: 'relative' }}>
        {total === 0 ? (
          <div className={styles.donutEmpty}>
            Sin citas {rango === 'hoy' ? 'hoy' : 'en este período'}
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className={styles.donutCenter}>
              <span className={styles.donutCenterValue}>{total}</span>
              <span className={styles.donutCenterLabel}>citas</span>
            </div>
          </>
        )}
        <div className={styles.donutLegend}>
          {[
            { name: 'Completadas', value: source.completadas },
            { name: 'Confirmadas', value: source.confirmadas },
            { name: 'Pendientes', value: source.pendientes },
            { name: 'Canceladas', value: source.canceladas },
          ].map((item) => (
            <div key={item.name} className={styles.donutLegendItem}>
              <span
                className={styles.donutLegendDot}
                style={{ backgroundColor: COLORS[item.name] }}
              />
              <span className={styles.donutLegendText}>
                {item.name}: {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
