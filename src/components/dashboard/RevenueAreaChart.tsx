'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import styles from './Charts.module.css'

interface DataPoint {
  mes: string
  ingresos: number
  consultas: number
}

interface RevenueAreaChartProps {
  data: DataPoint[]
}

const MESES_CORTO: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
}

const MESES_NOMBRE = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

type ChartRango = '6' | '12' | 'anio' | 'custom'

const ANIO_MIN = 2025

function formatLabel(d: DataPoint) {
  const mesNum = d.mes.split('-')[1] ?? ''
  const year = d.mes.split('-')[0]?.slice(2) ?? ''
  return { ...d, label: `${MESES_CORTO[mesNum] || d.mes} ${year}` }
}

export default function RevenueAreaChart({ data }: RevenueAreaChartProps) {
  const now = new Date()
  const mesActual = now.getMonth() + 1
  const anioActual = now.getFullYear()

  const [rango, setRango] = useState<ChartRango>('6')
  const [desdeMes, setDesdeMes] = useState(1)
  const [desdeAnio, setDesdeAnio] = useState(anioActual)
  const [hastaMes, setHastaMes] = useState(mesActual)
  const [hastaAnio, setHastaAnio] = useState(anioActual)
  const [customData, setCustomData] = useState<DataPoint[] | null>(null)
  const [loadingCustom, setLoadingCustom] = useState(false)

  // Opciones de año: 2025 hasta año actual
  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let y = ANIO_MIN; y <= anioActual; y++) years.push(y)
    return years
  }, [anioActual])

  // Meses disponibles para "desde" (si año == actual, solo hasta mes actual)
  const mesesDesdeMax = desdeAnio === anioActual ? mesActual : 12
  // Meses disponibles para "hasta" (si año == actual, solo hasta mes actual)
  const mesesHastaMax = hastaAnio === anioActual ? mesActual : 12

  // Ajustar mes si cambió el año y el mes queda fuera de rango
  const handleDesdeAnioChange = (y: number) => {
    setDesdeAnio(y)
    const max = y === anioActual ? mesActual : 12
    if (desdeMes > max) setDesdeMes(max)
  }
  const handleHastaAnioChange = (y: number) => {
    setHastaAnio(y)
    const max = y === anioActual ? mesActual : 12
    if (hastaMes > max) setHastaMes(max)
  }

  const filteredData = useMemo(() => {
    if (rango === 'custom' && customData) {
      return customData.map(formatLabel)
    }
    let sliced = data
    if (rango === '6') {
      sliced = data.slice(-6)
    } else if (rango === '12') {
      sliced = data.slice(-12)
    } else if (rango === 'anio') {
      const year = anioActual.toString()
      sliced = data.filter(d => d.mes.startsWith(year))
    }
    return sliced.map(formatLabel)
  }, [data, rango, customData, anioActual])

  const fetchCustomData = useCallback(async () => {
    setLoadingCustom(true)
    try {
      const desde = `${desdeAnio}-${String(desdeMes).padStart(2, '0')}-01`
      const lastDay = new Date(hastaAnio, hastaMes, 0).getDate()
      const hasta = `${hastaAnio}-${String(hastaMes).padStart(2, '0')}-${lastDay}`
      const res = await fetch(`/api/dashboard/stats/ingresos-mensual?desde=${desde}&hasta=${hasta}`)
      const json = await res.json()
      if (json.data) setCustomData(json.data)
    } catch (err) {
      console.error('Error cargando ingresos personalizados:', err)
    } finally {
      setLoadingCustom(false)
    }
  }, [desdeMes, desdeAnio, hastaMes, hastaAnio])

  const handleRangoChange = (val: ChartRango) => {
    setRango(val)
    if (val !== 'custom') setCustomData(null)
  }

  // Validar que desde <= hasta
  const desdeValido = desdeAnio < hastaAnio || (desdeAnio === hastaAnio && desdeMes <= hastaMes)

  const formatYAxis = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`
    return `$${value}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{label}</p>
          <p className={styles.tooltipValue}>
            ${payload[0].value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={styles.tooltipMonto}>{payload[0].payload.consultas} consultas</p>
        </div>
      )
    }
    return null
  }

  const subtitulos: Record<ChartRango, string> = {
    '6': 'Últimos 6 meses',
    '12': 'Últimos 12 meses',
    'anio': `Año ${anioActual}`,
    'custom': customData
      ? `${MESES_NOMBRE[desdeMes - 1]} ${desdeAnio} — ${MESES_NOMBRE[hastaMes - 1]} ${hastaAnio}`
      : 'Selecciona rango',
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeaderWithSelect}>
        <div>
          <h3 className={styles.chartTitle}>Ingresos Mensuales</h3>
          <p className={styles.chartSubtitle}>{subtitulos[rango]}</p>
        </div>
        <select
          className={styles.chartSelect}
          value={rango}
          onChange={(e) => handleRangoChange(e.target.value as ChartRango)}
        >
          <option value="6">6 meses</option>
          <option value="12">12 meses</option>
          <option value="anio">Este año</option>
          <option value="custom">Personalizado</option>
        </select>
      </div>

      {rango === 'custom' && (
        <div className={styles.chartCustomRange}>
          <select className={styles.chartSmallSelect} value={desdeMes} onChange={(e) => setDesdeMes(Number(e.target.value))}>
            {MESES_NOMBRE.map((m, i) => (
              <option key={i} value={i + 1} disabled={i + 1 > mesesDesdeMax}>{m}</option>
            ))}
          </select>
          <select className={styles.chartSmallSelect} value={desdeAnio} onChange={(e) => handleDesdeAnioChange(Number(e.target.value))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className={styles.chartRangeSep}>a</span>
          <select className={styles.chartSmallSelect} value={hastaMes} onChange={(e) => setHastaMes(Number(e.target.value))}>
            {MESES_NOMBRE.map((m, i) => (
              <option key={i} value={i + 1} disabled={i + 1 > mesesHastaMax}>{m}</option>
            ))}
          </select>
          <select className={styles.chartSmallSelect} value={hastaAnio} onChange={(e) => handleHastaAnioChange(Number(e.target.value))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            className={styles.chartApplyBtn}
            onClick={fetchCustomData}
            disabled={!desdeValido || loadingCustom}
          >
            {loadingCustom ? '...' : 'Aplicar'}
          </button>
        </div>
      )}

      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2d9f5d" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2d9f5d" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f0f1f3" strokeDasharray="none" />
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
            <YAxis tickFormatter={formatYAxis} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="ingresos"
              stroke="#2d9f5d"
              strokeWidth={2}
              fill="url(#colorIngresos)"
              dot={{ fill: '#2d9f5d', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
