'use client'

import { useState, useEffect } from 'react'
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

export default function ProgressCharts({ pacienteId }: ProgressChartsProps) {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchConsultas()
  }, [pacienteId])

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

  // Preparar datos ordenados por fecha (más reciente primero)
  const consultasOrdenadas = [...consultas].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Progreso Visual del Paciente</h2>
        <p className={styles.subtitle}>
          Gráficas basadas en {consultasOrdenadas.length} consultas registradas
        </p>
      </div>

      <div className={styles.charts}>
        {/* Peso e IMC */}
        <WeightChart data={consultasOrdenadas} />

        {/* Composición Corporal */}
        <BodyCompositionChart data={consultasOrdenadas} />

        {/* Perímetros */}
        <PerimetersChart data={consultasOrdenadas} />

        {/* Pliegues Cutáneos */}
        <SkinfoldChart data={consultasOrdenadas} />
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
