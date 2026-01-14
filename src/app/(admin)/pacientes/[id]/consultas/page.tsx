'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import ConsultaHistory from '@/components/consultas/ConsultaHistory'
import styles from './consultas.module.css'

export default function ConsultasPage() {
  const params = useParams()
  const router = useRouter()
  const pacienteId = params.id as string

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
              Todas las consultas registradas del paciente
            </p>
          </div>
        </div>
      </div>

      {/* Historial */}
      <ConsultaHistory pacienteId={pacienteId} />
    </div>
  )
}
