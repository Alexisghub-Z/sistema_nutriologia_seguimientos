'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CalendarioCitas from '@/components/calendario/CalendarioCitas'
import styles from './agendar.module.css'

export default function AgendarCitaPage() {
  const router = useRouter()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Datos del formulario
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [horaSeleccionada, setHoraSeleccionada] = useState('')
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    motivo: '',
  })

  const handleSeleccionarFechaHora = (fecha: string, hora: string) => {
    setFechaSeleccionada(fecha)
    setHoraSeleccionada(hora)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const continuarAPaso2 = () => {
    if (!fechaSeleccionada || !horaSeleccionada) {
      setError('Por favor, selecciona una fecha y hora')
      return
    }
    setError('')
    setPaso(2)
  }

  const volverAPaso1 = () => {
    setPaso(1)
    setError('')
  }

  const agendarCita = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/citas/publica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fecha_cita: fechaSeleccionada,
          hora_cita: horaSeleccionada,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Redirigir a la página de confirmación
        router.push(`/cita/${data.cita.codigo_cita}?nuevo=true`)
      } else {
        setError(data.error || 'Error al agendar la cita')
      }
    } catch (err) {
      setError('Error de conexión. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha)
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Agendar Cita</h1>
          <p className={styles.subtitle}>
            Consultorio Dr. Paul - Nutrición y Salud
          </p>
        </div>

        {/* Progress bar */}
        <div className={styles.progress}>
          <div className={`${styles.step} ${paso >= 1 ? styles.stepActive : ''}`}>
            <div className={styles.stepNumber}>1</div>
            <span>Fecha y hora</span>
          </div>
          <div className={styles.progressLine}></div>
          <div className={`${styles.step} ${paso >= 2 ? styles.stepActive : ''}`}>
            <div className={styles.stepNumber}>2</div>
            <span>Tus datos</span>
          </div>
        </div>

        {/* Paso 1: Seleccionar fecha y hora */}
        {paso === 1 && (
          <div className={styles.paso}>
            <h2 className={styles.pasoTitle}>Selecciona fecha y hora</h2>

            <CalendarioCitas
              onSeleccionarFechaHora={handleSeleccionarFechaHora}
              fechaSeleccionada={fechaSeleccionada}
              horaSeleccionada={horaSeleccionada}
            />

            {error && <div className={styles.error}>{error}</div>}

            {fechaSeleccionada && horaSeleccionada && (
              <div className={styles.resumen}>
                <p>✅ Seleccionaste:</p>
                <p className={styles.resumenFecha}>
                  {formatearFecha(fechaSeleccionada)} a las {horaSeleccionada}
                </p>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => router.push('/')}
                className={styles.btnSecondary}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={continuarAPaso2}
                className={styles.btnPrimary}
                disabled={!fechaSeleccionada || !horaSeleccionada}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Formulario de datos */}
        {paso === 2 && (
          <div className={styles.paso}>
            <h2 className={styles.pasoTitle}>Completa tus datos</h2>

            <div className={styles.resumenCompacto}>
              <span>📅 {formatearFecha(fechaSeleccionada)}</span>
              <span>🕐 {horaSeleccionada}</span>
            </div>

            <form onSubmit={agendarCita} className={styles.form}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="nombre">Nombre completo *</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                    minLength={3}
                    placeholder="Ej: Juan Pérez García"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="tu@email.com"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="telefono">Teléfono (WhatsApp) *</label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    required
                    placeholder="9511234567"
                    pattern="[0-9+\-\s()]+"
                    minLength={10}
                  />
                  <small>Recibirás confirmación por WhatsApp</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fecha_nacimiento">Fecha de nacimiento *</label>
                  <input
                    type="date"
                    id="fecha_nacimiento"
                    name="fecha_nacimiento"
                    value={formData.fecha_nacimiento}
                    onChange={handleInputChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="motivo">Motivo de la consulta *</label>
                <textarea
                  id="motivo"
                  name="motivo"
                  value={formData.motivo}
                  onChange={handleInputChange}
                  required
                  minLength={10}
                  rows={4}
                  placeholder="Describe brevemente el motivo de tu consulta..."
                />
                <small>Mínimo 10 caracteres</small>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={volverAPaso1}
                  className={styles.btnSecondary}
                  disabled={loading}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading ? 'Agendando...' : 'Agendar Cita'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
