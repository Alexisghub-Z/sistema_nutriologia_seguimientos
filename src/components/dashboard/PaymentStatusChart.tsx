'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import styles from './Charts.module.css'

interface PaymentStatusChartProps {
  consultasPagadas: number
  pagosPendientesCantidad: number
  pagosPendientesMonto: number
  ingresosDelRango: number
}

export default function PaymentStatusChart({
  consultasPagadas,
  pagosPendientesCantidad,
  pagosPendientesMonto,
  ingresosDelRango,
}: PaymentStatusChartProps) {
  const data = [
    {
      name: 'Pagadas',
      value: consultasPagadas,
      monto: ingresosDelRango - pagosPendientesMonto,
    },
    {
      name: 'Pendientes',
      value: pagosPendientesCantidad,
      monto: pagosPendientesMonto,
    },
  ]

  // Green color scheme
  const COLORS = ['#2d9f5d', '#f59e0b']

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{payload[0].name}</p>
          <p className={styles.tooltipValue}>
            {payload[0].value} consultas
          </p>
          <p className={styles.tooltipMonto}>
            ${payload[0].payload.monto.toLocaleString('es-MX', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
        style={{ pointerEvents: 'none' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Estado de Pagos</h3>
        <p className={styles.chartSubtitle}>Distribución de consultas por estado de pago</p>
      </div>
      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={5}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value, entry: any) => (
                <span className={styles.legendText}>
                  {value}: {entry.payload.value} ({entry.payload.monto.toLocaleString('es-MX', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })} MXN)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
