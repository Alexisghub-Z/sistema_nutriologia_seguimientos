'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import PacienteForm from '@/components/forms/PacienteForm'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import styles from './editar.module.css'

interface Paciente {
  id: string
  nombre: string
  email: string
  telefono: string
  fecha_nacimiento: string
}

export default function EditarPacientePage() {
  const params = useParams()
  const pacienteId = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        const response = await fetch(`/api/pacientes/${pacienteId}`)

        if (!response.ok) {
          throw new Error('Error al cargar paciente')
        }

        const data = await response.json()
        setPaciente(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchPaciente()
  }, [pacienteId])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Cargando datos del paciente...</p>
        </div>
      </div>
    )
  }

  if (error || !paciente) {
    return (
      <div className={styles.container}>
        <Alert variant="error">{error || 'No se pudo cargar el paciente'}</Alert>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Editar Paciente</h1>
        <p className={styles.subtitle}>Actualiza la información de {paciente.nombre}</p>
      </div>

      <PacienteForm pacienteId={pacienteId} initialData={paciente} />
    </div>
  )
}
