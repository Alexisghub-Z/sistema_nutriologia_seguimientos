'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import styles from './nueva.module.css'

export default function NuevaCitaPage() {
  const params = useParams()
  const router = useRouter()
  const pacienteId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fecha: '',
    hora: '',
    duracion_minutos: '60',
    motivo_consulta: '',
    tipo_cita: 'PRESENCIAL', // Por defecto, presencial
    confirmada_por_admin: true, // Por defecto, las citas del admin están pre-confirmadas
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validar que tenemos fecha y hora
      if (!formData.fecha || !formData.hora) {
        throw new Error('Fecha y hora son requeridas')
      }

      // Combinar fecha y hora
      const fecha_hora = `${formData.fecha}T${formData.hora}:00`

      // Crear cita
      const response = await fetch('/api/citas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paciente_id: pacienteId,
          fecha_hora,
          duracion_minutos: parseInt(formData.duracion_minutos),
          motivo_consulta: formData.motivo_consulta,
          tipo_cita: formData.tipo_cita,
          confirmada_por_admin: formData.confirmada_por_admin,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear cita')
      }

      await response.json()

      // Redirigir al detalle del paciente con timestamp para forzar recarga
      router.push(`/pacientes/${pacienteId}?refresh=${Date.now()}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/pacientes/${pacienteId}`)
  }

  // Obtener fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="outline"
            size="small"
            onClick={handleCancel}
            className={styles.backButton}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Volver
          </Button>
          <div>
            <h1 className={styles.title}>Nueva Cita</h1>
            <p className={styles.subtitle}>Agenda una nueva cita para el paciente</p>
          </div>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card className={styles.formCard}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Fecha */}
          <div className={styles.formGroup}>
            <label htmlFor="fecha" className={styles.label}>
              Fecha <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              className={styles.input}
              min={today}
              required
              disabled={loading}
            />
          </div>

          {/* Hora */}
          <div className={styles.formGroup}>
            <label htmlFor="hora" className={styles.label}>
              Hora <span className={styles.required}>*</span>
            </label>
            <input
              type="time"
              id="hora"
              name="hora"
              value={formData.hora}
              onChange={handleChange}
              className={styles.input}
              required
              disabled={loading}
            />
          </div>

          {/* Duración */}
          <div className={styles.formGroup}>
            <label htmlFor="duracion_minutos" className={styles.label}>
              Duración <span className={styles.required}>*</span>
            </label>
            <select
              id="duracion_minutos"
              name="duracion_minutos"
              value={formData.duracion_minutos}
              onChange={handleChange}
              className={styles.input}
              required
              disabled={loading}
            >
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">1 hora</option>
              <option value="90">1 hora 30 minutos</option>
              <option value="120">2 horas</option>
            </select>
          </div>

          {/* Tipo de Cita */}
          <div className={styles.formGroup}>
            <label htmlFor="tipo_cita" className={styles.label}>
              Tipo de Cita <span className={styles.required}>*</span>
            </label>
            <select
              id="tipo_cita"
              name="tipo_cita"
              value={formData.tipo_cita}
              onChange={handleChange}
              className={styles.input}
              required
              disabled={loading}
            >
              <option value="PRESENCIAL">🏥 Presencial</option>
              <option value="EN_LINEA">💻 En línea</option>
            </select>
          </div>

          {/* Motivo */}
          <div className={styles.formGroup}>
            <label htmlFor="motivo_consulta" className={styles.label}>
              Motivo de la Consulta <span className={styles.required}>*</span>
            </label>
            <textarea
              id="motivo_consulta"
              name="motivo_consulta"
              value={formData.motivo_consulta}
              onChange={handleChange}
              className={styles.textarea}
              rows={4}
              placeholder="Ej: Primera consulta, Control de peso, Seguimiento, etc."
              required
              disabled={loading}
            />
          </div>

          {/* Confirmación */}
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="confirmada_por_admin"
                checked={formData.confirmada_por_admin}
                onChange={handleChange}
                className={styles.checkbox}
                disabled={loading}
              />
              <span className={styles.checkboxText}>
                <strong>Cita ya confirmada</strong>
                <small className={styles.checkboxHint}>
                  Marca esta opción si ya confirmaste la cita con el paciente (por teléfono,
                  presencial, etc.). Si no la marcas, el paciente recibirá un mensaje para confirmar
                  su asistencia.
                </small>
              </span>
            </label>
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
              Después de crear la cita, podrás registrar la consulta cuando el paciente asista. Usa
              el botón &ldquo;Registrar Consulta&rdquo; que aparecerá en las citas pendientes.
            </p>
          </div>

          {/* Botones */}
          <div className={styles.formActions}>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Cita'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
