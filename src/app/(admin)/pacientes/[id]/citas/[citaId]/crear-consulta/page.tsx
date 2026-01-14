'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import ConsultaForm from '@/components/forms/ConsultaForm'
import styles from './crear-consulta.module.css'

interface Cita {
  id: string
  fecha_hora: string
  motivo_consulta: string
  estado: string
  paciente: {
    id: string
    nombre: string
  }
}

export default function CrearConsultaPage() {
  const params = useParams()
  const router = useRouter()
  const pacienteId = params.id as string
  const citaId = params.citaId as string

  const [cita, setCita] = useState<Cita | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchCita()
  }, [citaId])

  const fetchCita = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/citas/${citaId}`)

      if (!response.ok) {
        throw new Error('Error al cargar cita')
      }

      const data = await response.json()

      // Verificar si ya tiene consulta
      if (data.consulta) {
        setError('Esta cita ya tiene una consulta registrada')
        return
      }

      setCita(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = async () => {
    // Actualizar estado de la cita a COMPLETADA
    await fetch(`/api/citas/${citaId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estado: 'COMPLETADA' }),
    })

    // Redirigir al historial de consultas
    router.push(`/pacientes/${pacienteId}/consultas`)
    router.refresh()
  }

  const handleCancel = () => {
    router.push(`/pacientes/${pacienteId}`)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Cargando información de la cita...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Alert variant="error">{error}</Alert>
        <Button onClick={() => router.push(`/pacientes/${pacienteId}`)}>
          Volver al paciente
        </Button>
      </div>
    )
  }

  if (!cita) {
    return (
      <div className={styles.container}>
        <Alert variant="error">No se encontró la cita</Alert>
        <Button onClick={() => router.push(`/pacientes/${pacienteId}`)}>
          Volver al paciente
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Registrar Consulta</h1>
          <p className={styles.subtitle}>
            Paciente: <strong>{cita.paciente.nombre}</strong>
          </p>
          <p className={styles.citaInfo}>
            Cita: {new Date(cita.fecha_hora).toLocaleString('es-MX', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        </div>
      </div>

      {/* Info */}
      <div className={styles.infoBox}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={styles.infoIcon}
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <p>
          Completa los datos de la consulta. Puedes agregar mediciones, notas
          clínicas y archivos adjuntos. Todos los datos se guardarán en el
          historial del paciente.
        </p>
      </div>

      {/* Formulario */}
      <ConsultaForm
        pacienteId={pacienteId}
        citaId={citaId}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}
