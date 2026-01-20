'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import ConsultaHistory from '@/components/consultas/ConsultaHistory'
import ProgressCharts from '@/components/consultas/ProgressCharts'
import styles from './consultas.module.css'

type Tab = 'historial' | 'graficas'

export default function ConsultasPage() {
  const params = useParams()
  const router = useRouter()
  const pacienteId = params.id as string
  const [activeTab, setActiveTab] = useState<Tab>('historial')

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="outline"
            size="small"
            onClick={() => router.push(`/pacientes/${pacienteId}`)}
            className={styles.backButton}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Volver
          </Button>
          <div>
            <h1 className={styles.title}>Historial de Consultas</h1>
            <p className={styles.subtitle}>
              Consultas registradas y progreso del paciente
            </p>
          </div>
        </div>
      </div>

      {/* Tabs y Botón de Agregar */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'historial' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('historial')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={styles.tabIcon}
            >
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            Historial Detallado
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'graficas' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('graficas')}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={styles.tabIcon}
            >
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Gráficas de Progreso
          </button>
        </div>

        <Button
          variant="primary"
          size="small"
          onClick={() => router.push(`/pacientes/${pacienteId}/consultas/agregar-historica`)}
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Agregar Consulta Anterior
        </Button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeTab === 'historial' && <ConsultaHistory pacienteId={pacienteId} />}
        {activeTab === 'graficas' && <ProgressCharts pacienteId={pacienteId} />}
      </div>
    </div>
  )
}
