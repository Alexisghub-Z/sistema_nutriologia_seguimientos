'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import styles from '@/components/dashboard/Charts.module.css'

interface PuntoMes {
  label: string
  dietas: number
  cuadros: number
}

interface Props {
  data: PuntoMes[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ payload: PuntoMes }>
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  if (!p) return null
  return (
    <div className={styles.customTooltip}>
      <p className={styles.tooltipLabel}>{p.label}</p>
      <p className={styles.tooltipValue}>
        {p.dietas} {p.dietas === 1 ? 'dieta' : 'dietas'}
      </p>
      <p className={styles.tooltipMonto}>
        {p.cuadros} {p.cuadros === 1 ? 'cuadro' : 'cuadros'}
      </p>
    </div>
  )
}

/**
 * Dietas creadas por mes (últimos 6 meses). Mismo lenguaje visual que la
 * gráfica de ingresos del dashboard principal.
 */
export default function DietasAreaChart({ data }: Props) {
  const total = data.reduce((s, d) => s + d.dietas, 0)

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <div>
          <h3 className={styles.chartTitle}>Dietas por mes</h3>
          <p className={styles.chartSubtitle}>
            {total === 0 ? 'Aún sin actividad' : `${total} en los últimos 6 meses`}
          </p>
        </div>
      </div>

      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorDietas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2d9f5d" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2d9f5d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f0f1f3" strokeDasharray="none" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="dietas"
              stroke="#2d9f5d"
              strokeWidth={2}
              fill="url(#colorDietas)"
              dot={{ fill: '#2d9f5d', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
