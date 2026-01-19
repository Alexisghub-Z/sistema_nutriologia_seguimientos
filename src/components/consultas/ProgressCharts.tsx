'use client'

import { useState, useEffect, useMemo } from 'react'
import WeightChart from './charts/WeightChart'
import BodyCompositionChart from './charts/BodyCompositionChart'
import PerimetersChart from './charts/PerimetersChart'
import SkinfoldChart from './charts/SkinfoldChart'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import styles from './ProgressCharts.module.css'

interface Consulta {
  id: string
  fecha: string
  peso: number | null
  talla: number | null
  imc: number | null
  grasa_corporal: number | null
  porcentaje_agua: number | null
  masa_muscular_kg: number | null
  grasa_visceral: number | null
  brazo_relajado: number | null
  brazo_flexionado: number | null
  cintura: number | null
  cadera_maximo: number | null
  muslo_maximo: number | null
  muslo_medio: number | null
  pantorrilla_maximo: number | null
  pliegue_tricipital: number | null
  pliegue_subescapular: number | null
  pliegue_bicipital: number | null
  pliegue_cresta_iliaca: number | null
  pliegue_supraespinal: number | null
  pliegue_abdominal: number | null
}

interface ProgressChartsProps {
  pacienteId: string
}

type FilterType = '30d' | '3m' | '6m' | '1y' | 'all' | 'custom'

export default function ProgressCharts({ pacienteId }: ProgressChartsProps) {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // Preparar datos ordenados por fecha (más antiguo a más reciente para las gráficas)
  const consultasOrdenadas = useMemo(() => {
    return [...consultas].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    )
  }, [consultas])

  // Obtener lista de fechas únicas para el filtro personalizado
  const fechasDisponibles = useMemo(() => {
    return consultasOrdenadas.map((c) => ({
      fecha: c.fecha,
      label: new Date(c.fecha).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    }))
  }, [consultasOrdenadas])

  // Filtrar fechas para "Desde" - solo fechas <= fecha fin seleccionada
  const fechasDisponiblesDesde = useMemo(() => {
    if (!customEndDate) return fechasDisponibles
    const fechaFin = new Date(customEndDate).getTime()
    return fechasDisponibles.filter((f) => new Date(f.fecha).getTime() <= fechaFin)
  }, [fechasDisponibles, customEndDate])

  // Filtrar fechas para "Hasta" - solo fechas >= fecha inicio seleccionada
  const fechasDisponiblesHasta = useMemo(() => {
    if (!customStartDate) return fechasDisponibles
    const fechaInicio = new Date(customStartDate).getTime()
    return fechasDisponibles.filter((f) => new Date(f.fecha).getTime() >= fechaInicio)
  }, [fechasDisponibles, customStartDate])

  // Filtrar consultas según el rango seleccionado
  const consultasFiltradas = useMemo(() => {
    if (filterType === 'all') {
      return consultasOrdenadas
    }

    const hoy = new Date()
    let fechaInicio: Date

    if (filterType === 'custom') {
      if (!customStartDate || !customEndDate) return consultasOrdenadas

      const inicio = new Date(customStartDate)
      const fin = new Date(customEndDate)

      return consultasOrdenadas.filter((c) => {
        const fecha = new Date(c.fecha)
        return fecha >= inicio && fecha <= fin
      })
    }

    // Filtros predefinidos
    switch (filterType) {
      case '30d':
        fechaInicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '3m':
        fechaInicio = new Date(hoy.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '6m':
        fechaInicio = new Date(hoy.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        fechaInicio = new Date(hoy.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        return consultasOrdenadas
    }

    return consultasOrdenadas.filter((c) => new Date(c.fecha) >= fechaInicio)
  }, [consultasOrdenadas, filterType, customStartDate, customEndDate])

  useEffect(() => {
    fetchConsultas()
  }, [pacienteId])

  // Inicializar fechas personalizadas con la primera y última consulta
  useEffect(() => {
    if (consultasOrdenadas.length > 0 && !customStartDate && !customEndDate) {
      setCustomStartDate(consultasOrdenadas[0].fecha)
      setCustomEndDate(consultasOrdenadas[consultasOrdenadas.length - 1].fecha)
    }
  }, [consultasOrdenadas, customStartDate, customEndDate])

  const fetchConsultas = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener TODAS las consultas para las gráficas (sin paginación)
      const response = await fetch(`/api/consultas?paciente_id=${pacienteId}&all=true`)

      if (!response.ok) {
        throw new Error('Error al cargar datos de progreso')
      }

      const data = await response.json()
      setConsultas(data.consultas || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilter: FilterType) => {
    setFilterType(newFilter)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" />
        <p>Cargando gráficas de progreso...</p>
      </div>
    )
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>
  }

  if (consultas.length === 0) {
    return (
      <div className={styles.emptyState}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3>No hay datos suficientes para mostrar gráficas</h3>
        <p>Se necesitan al menos 2 consultas con mediciones para ver el progreso</p>
      </div>
    )
  }

  if (consultas.length === 1) {
    return (
      <div className={styles.emptyState}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3>Se necesitan más consultas</h3>
        <p>Agrega al menos una consulta más para ver el progreso del paciente</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Progreso Visual del Paciente</h2>
        <p className={styles.subtitle}>
          {consultasFiltradas.length} de {consultasOrdenadas.length} consultas en el rango seleccionado
        </p>
      </div>

      {/* Filtros de Rango */}
      <div className={styles.filters}>
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${filterType === '30d' ? styles.filterActive : ''}`}
            onClick={() => handleFilterChange('30d')}
          >
            Últimos 30 días
          </button>
          <button
            className={`${styles.filterButton} ${filterType === '3m' ? styles.filterActive : ''}`}
            onClick={() => handleFilterChange('3m')}
          >
            Últimos 3 meses
          </button>
          <button
            className={`${styles.filterButton} ${filterType === '6m' ? styles.filterActive : ''}`}
            onClick={() => handleFilterChange('6m')}
          >
            Últimos 6 meses
          </button>
          <button
            className={`${styles.filterButton} ${filterType === '1y' ? styles.filterActive : ''}`}
            onClick={() => handleFilterChange('1y')}
          >
            Último año
          </button>
          <button
            className={`${styles.filterButton} ${filterType === 'all' ? styles.filterActive : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            Todo el historial
          </button>
          <button
            className={`${styles.filterButton} ${styles.filterCustom} ${filterType === 'custom' ? styles.filterActive : ''}`}
            onClick={() => handleFilterChange('custom')}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            Personalizado
          </button>
        </div>

        {/* Filtro Personalizado */}
        {filterType === 'custom' && (
          <div className={styles.customFilter}>
            <div className={styles.customFilterRow}>
              <div className={styles.customFilterGroup}>
                <label className={styles.customFilterLabel}>Desde:</label>
                <select
                  className={styles.customFilterSelect}
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                >
                  {fechasDisponiblesDesde.map((fecha) => (
                    <option key={`start-${fecha.fecha}`} value={fecha.fecha}>
                      {fecha.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.customFilterGroup}>
                <label className={styles.customFilterLabel}>Hasta:</label>
                <select
                  className={styles.customFilterSelect}
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                >
                  {fechasDisponiblesHasta.map((fecha) => (
                    <option key={`end-${fecha.fecha}`} value={fecha.fecha}>
                      {fecha.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {consultasFiltradas.length === 0 && (
              <p className={styles.customFilterWarning}>
                No hay consultas en el rango seleccionado. Ajusta las fechas.
              </p>
            )}
          </div>
        )}
      </div>

      <div className={styles.charts}>
        {/* Peso e IMC */}
        <WeightChart data={consultasFiltradas} />

        {/* Composición Corporal */}
        <BodyCompositionChart data={consultasFiltradas} />

        {/* Perímetros */}
        <PerimetersChart data={consultasFiltradas} />

        {/* Pliegues Cutáneos */}
        <SkinfoldChart data={consultasFiltradas} />
      </div>

      <div className={styles.footer}>
        <p className={styles.footerText}>
          Las gráficas muestran la evolución de las mediciones a lo largo del tiempo.
          Los cambios negativos en grasa corporal, perímetros y pliegues generalmente indican progreso positivo.
        </p>
      </div>
    </div>
  )
}
