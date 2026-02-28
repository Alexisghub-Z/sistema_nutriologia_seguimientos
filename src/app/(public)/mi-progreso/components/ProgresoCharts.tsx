'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import styles from './ProgresoCharts.module.css'

interface Consulta {
  fecha: string
  peso: number | null
  talla: number | null
  imc: number | null
  grasa_corporal: number | null
  porcentaje_agua: number | null
  masa_muscular_kg: number | null
  cintura: number | null
  cadera_maximo: number | null
}

interface ProgresoChartsProps {
  paciente: { nombre: string; email: string }
  consultas: Consulta[]
}

function clasificarIMC(imc: number): { label: string; className: string } {
  if (imc < 18.5) return { label: 'Bajo peso', className: styles.badgeBajoPeso ?? '' }
  if (imc < 25) return { label: 'Normal', className: styles.badgeNormal ?? '' }
  if (imc < 30) return { label: 'Sobrepeso', className: styles.badgeSobrepeso ?? '' }
  return { label: 'Obesidad', className: styles.badgeObesidad ?? '' }
}

function formatFecha(fechaStr: string): string {
  const date = new Date(fechaStr)
  return new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric' }).format(date)
}

function formatFechaLarga(fechaStr: string): string {
  const date = new Date(fechaStr)
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

interface CambioProps {
  cambio: number
  unidad: string
  bajarEsBueno?: boolean
}

function CambioChip({ cambio, unidad, bajarEsBueno = true }: CambioProps) {
  if (cambio === 0) {
    return <span className={`${styles.summaryChange} ${styles.summaryChangeNeutral}`}>Sin cambio</span>
  }
  const esMejora = bajarEsBueno ? cambio < 0 : cambio > 0
  const clase = esMejora ? styles.summaryChangePositive : styles.summaryChangeNegative
  const signo = cambio > 0 ? '+' : ''
  const flecha = esMejora ? '↓' : '↑'
  return (
    <span className={`${styles.summaryChange} ${clase}`}>
      {flecha} {signo}{cambio.toFixed(1)} {unidad}
    </span>
  )
}

// Tooltip personalizado minimalista
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '0.75rem 1rem',
      fontSize: '0.85rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <p style={{ margin: '0 0 0.5rem', fontWeight: 600, color: '#374151' }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ margin: '0.2rem 0', color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function ProgresoCharts({ paciente, consultas }: ProgresoChartsProps) {
  // Filtrar consultas con al menos peso o IMC
  const consultasConDatos = consultas.filter(c => c.peso || c.imc)

  // Datos para las gráficas
  const dataPesoIMC = consultasConDatos
    .filter(c => c.peso || c.imc)
    .map(c => ({
      fecha: formatFecha(c.fecha),
      fechaLarga: formatFechaLarga(c.fecha),
      'Peso (kg)': c.peso ?? undefined,
      'IMC': c.imc ?? undefined,
    }))

  const dataComposicion = consultas
    .filter(c => c.grasa_corporal !== null || c.porcentaje_agua !== null || c.masa_muscular_kg !== null)
    .map(c => ({
      fecha: formatFecha(c.fecha),
      'Grasa (%)': c.grasa_corporal ?? undefined,
      'Agua (%)': c.porcentaje_agua ?? undefined,
      'Músculo (kg)': c.masa_muscular_kg ?? undefined,
    }))

  // Valores actuales e iniciales para las tarjetas
  const primeraConsulta = consultas[0]
  const ultimaConsulta = consultas[consultas.length - 1]

  const pesoActual = ultimaConsulta?.peso
  const pesoInicial = primeraConsulta?.peso
  const cambioPeso = pesoActual != null && pesoInicial != null ? pesoActual - pesoInicial : null

  const imcActual = ultimaConsulta?.imc
  const clasificacionIMC = imcActual != null ? clasificarIMC(imcActual) : null

  const grasaActual = ultimaConsulta?.grasa_corporal
  const grasaInicial = primeraConsulta?.grasa_corporal
  const cambioGrasa = grasaActual != null && grasaInicial != null ? grasaActual - grasaInicial : null

  const cinturaActual = ultimaConsulta?.cintura
  const cinturaInicial = primeraConsulta?.cintura
  const cambioCintura = cinturaActual != null && cinturaInicial != null ? cinturaActual - cinturaInicial : null

  // Detectar mejora para mensaje motivacional
  const hayMejora =
    (cambioPeso != null && cambioPeso < -1) ||
    (cambioGrasa != null && cambioGrasa < -1) ||
    (cambioCintura != null && cambioCintura < -2)

  const primerNombre = paciente.nombre.split(' ')[0]

  if (consultas.length === 0) {
    return (
      <div className={styles.noDataCard}>
        <h3>Aún no hay consultas registradas</h3>
        <p>Cuando realices tu primera consulta, podrás ver tu progreso aquí.</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.patientHeader}>
        <h2 className={styles.patientName}>Tu progreso, {primerNombre}</h2>
        <p className={styles.patientSubtitle}>
          {consultas.length} {consultas.length === 1 ? 'consulta registrada' : 'consultas registradas'} •{' '}
          {ultimaConsulta && <>Última: {formatFechaLarga(ultimaConsulta.fecha)}</>}
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className={styles.summaryGrid}>
        {/* Peso actual */}
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Peso actual</span>
          {pesoActual != null ? (
            <>
              <span className={styles.summaryValue}>
                {pesoActual.toFixed(1)}<span className={styles.summaryUnit}> kg</span>
              </span>
              {cambioPeso != null && <CambioChip cambio={cambioPeso} unidad="kg" bajarEsBueno={true} />}
            </>
          ) : (
            <span className={styles.summaryValue} style={{ fontSize: '1.2rem', color: '#9ca3af' }}>—</span>
          )}
        </div>

        {/* IMC */}
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>IMC actual</span>
          {imcActual != null ? (
            <>
              <span className={styles.summaryValue}>
                {imcActual.toFixed(1)}
              </span>
              {clasificacionIMC && (
                <span className={`${styles.summaryBadge} ${clasificacionIMC.className}`}>
                  {clasificacionIMC.label}
                </span>
              )}
            </>
          ) : (
            <span className={styles.summaryValue} style={{ fontSize: '1.2rem', color: '#9ca3af' }}>—</span>
          )}
        </div>

        {/* Grasa corporal */}
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Grasa corporal</span>
          {grasaActual != null ? (
            <>
              <span className={styles.summaryValue}>
                {grasaActual.toFixed(1)}<span className={styles.summaryUnit}> %</span>
              </span>
              {cambioGrasa != null && <CambioChip cambio={cambioGrasa} unidad="%" bajarEsBueno={true} />}
            </>
          ) : (
            <span className={styles.summaryValue} style={{ fontSize: '1.2rem', color: '#9ca3af' }}>—</span>
          )}
        </div>

        {/* Cintura */}
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Cintura</span>
          {cinturaActual != null ? (
            <>
              <span className={styles.summaryValue}>
                {cinturaActual.toFixed(0)}<span className={styles.summaryUnit}> cm</span>
              </span>
              {cambioCintura != null && <CambioChip cambio={cambioCintura} unidad="cm" bajarEsBueno={true} />}
            </>
          ) : (
            <span className={styles.summaryValue} style={{ fontSize: '1.2rem', color: '#9ca3af' }}>—</span>
          )}
        </div>
      </div>

      {/* Gráficas */}
      <div className={styles.chartsSection}>
        {/* Gráfica 1: Peso e IMC */}
        {dataPesoIMC.length >= 2 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Peso e IMC</h3>
            <p className={styles.chartSubtitle}>Evolución a lo largo de tus consultas</p>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: '#16a34a' }} />
                Peso (kg)
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ background: '#60a5fa' }} />
                IMC
              </div>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataPesoIMC} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorIMC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="peso"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <YAxis
                    yAxisId="imc"
                    orientation="right"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    yAxisId="peso"
                    type="monotone"
                    dataKey="Peso (kg)"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fill="url(#colorPeso)"
                    dot={{ fill: '#16a34a', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                  <Area
                    yAxisId="imc"
                    type="monotone"
                    dataKey="IMC"
                    stroke="#60a5fa"
                    strokeWidth={2.5}
                    fill="url(#colorIMC)"
                    dot={{ fill: '#60a5fa', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfica 2: Composición corporal */}
        {dataComposicion.length >= 2 && (
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Composición corporal</h3>
            <p className={styles.chartSubtitle}>Grasa, agua y masa muscular</p>
            <div className={styles.chartLegend}>
              {dataComposicion.some(d => d['Grasa (%)'] !== undefined) && (
                <div className={styles.legendItem}>
                  <div className={styles.legendDot} style={{ background: '#f97316' }} />
                  Grasa (%)
                </div>
              )}
              {dataComposicion.some(d => d['Agua (%)'] !== undefined) && (
                <div className={styles.legendItem}>
                  <div className={styles.legendDot} style={{ background: '#38bdf8' }} />
                  Agua (%)
                </div>
              )}
              {dataComposicion.some(d => d['Músculo (kg)'] !== undefined) && (
                <div className={styles.legendItem}>
                  <div className={styles.legendDot} style={{ background: '#a78bfa' }} />
                  Músculo (kg)
                </div>
              )}
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataComposicion} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorGrasa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAgua" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMusculo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Grasa (%)"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fill="url(#colorGrasa)"
                    dot={{ fill: '#f97316', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="Agua (%)"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    fill="url(#colorAgua)"
                    dot={{ fill: '#38bdf8', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="Músculo (kg)"
                    stroke="#a78bfa"
                    strokeWidth={2.5}
                    fill="url(#colorMusculo)"
                    dot={{ fill: '#a78bfa', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Sin datos suficientes para gráficas */}
        {dataPesoIMC.length < 2 && dataComposicion.length < 2 && (
          <div className={styles.noDataCard}>
            <h3>Necesitas más consultas para ver gráficas</h3>
            <p>Las gráficas aparecerán cuando tengas al menos 2 consultas con mediciones registradas.</p>
          </div>
        )}
      </div>

      {/* Mensaje motivacional */}
      {hayMejora && (
        <div className={styles.motivationalCard}>
          <div className={styles.motivationalContent}>
            <h3>¡Vas muy bien, {primerNombre}!</h3>
            <p>
              Tu progreso muestra resultados positivos. Sigue con tu plan nutricional y
              continúa trabajando con tu nutriólogo para alcanzar tus objetivos.
            </p>
          </div>
        </div>
      )}

      <p className={styles.consultasCount}>
        Mostrando datos de {consultas.length} {consultas.length === 1 ? 'consulta' : 'consultas'}
      </p>
    </div>
  )
}
