'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import styles from './cita.module.css'

interface Paciente {
  id: string
  nombre: string
  email: string | null
  telefono: string
}

interface Cita {
  id: string
  codigo_cita: string
  fecha_hora: string
  duracion_minutos: number
  motivo: string
  estado: string
  estado_confirmacion: string
  confirmada_por_paciente: boolean
  fecha_confirmacion: string | null
  paciente: Paciente
  notas?: string | null
}

export default function CitaPage({ params }: { params: Promise<{ codigo: string }> | { codigo: string } }) {
  // Unwrap params usando React.use()
  const resolvedParams = params instanceof Promise ? use(params) : params
  const codigo = resolvedParams.codigo

  const [cita, setCita] = useState<Cita | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const router = useRouter()

  useEffect(() => {
    cargarCita()
  }, [codigo])

  const cargarCita = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/citas/codigo/${codigo}`)

      if (response.ok) {
        const data = await response.json()
        setCita(data)
      } else if (response.status === 404) {
        setError('No se encontró ninguna cita con este código')
      } else {
        setError('Error al cargar la cita')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const cancelarCita = async () => {
    if (!cita) return

    try {
      setCancelando(true)

      const response = await fetch(`/api/citas/codigo/${codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'cancelar' }),
      })

      if (response.ok) {
        await cargarCita() // Recargar para mostrar estado actualizado
        setMostrarConfirmacion(false)
      } else {
        setError('Error al cancelar la cita')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setCancelando(false)
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

  const formatearHora = (fecha: string) => {
    const date = new Date(fecha)
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'warning'
      case 'CONFIRMADA':
        return 'success'
      case 'COMPLETADA':
        return 'info'
      case 'CANCELADA':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getEstadoTexto = (estado: string, estadoConfirmacion: string, confirmada: boolean) => {
    // Estados de cancelación
    if (estadoConfirmacion === 'CANCELADA_PACIENTE') return 'Cancelada por ti'
    if (estado === 'CANCELADA') return 'Cancelada'

    // Estado completada
    if (estado === 'COMPLETADA') return 'Completada'

    // Estado no asistió
    if (estado === 'NO_ASISTIO') return 'No asistió'

    // Estados pendientes
    if (estado === 'PENDIENTE') {
      if (confirmada) return 'Confirmada'
      if (estadoConfirmacion === 'RECORDATORIO_ENVIADO') return 'Recordatorio enviado'
      if (estadoConfirmacion === 'NO_CONFIRMADA') return 'No confirmada'
      return 'Pendiente de confirmación'
    }

    return estado
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <p>Cargando información de la cita...</p>
        </div>
      </main>
    )
  }

  if (error || !cita) {
    return (
      <main className={styles.main}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}>⚠️</span>
          <h2>Error</h2>
          <p>{error || 'No se pudo cargar la cita'}</p>
          <button onClick={() => router.push('/')} className={styles.backButton}>
            Volver al inicio
          </button>
        </div>
      </main>
    )
  }

  const citaCancelada = cita.estado === 'CANCELADA'
  const citaPasada = new Date(cita.fecha_hora) < new Date()

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Detalles de tu Cita</h1>
          <div className={`${styles.badge} ${styles[getEstadoColor(cita.estado)]}`}>
            {getEstadoTexto(cita.estado, cita.estado_confirmacion, cita.confirmada_por_paciente)}
          </div>
        </div>

        <div className={styles.citaCard}>
          {/* Información del paciente */}
          <section className={styles.section}>
            <h2>Paciente</h2>
            <div className={styles.info}>
              <div className={styles.infoRow}>
                <span className={styles.icon}>👤</span>
                <div>
                  <p className={styles.label}>Nombre</p>
                  <p className={styles.value}>{cita.paciente.nombre}</p>
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.icon}>📱</span>
                <div>
                  <p className={styles.label}>Teléfono</p>
                  <p className={styles.value}>{cita.paciente.telefono}</p>
                </div>
              </div>
              {cita.paciente.email && (
                <div className={styles.infoRow}>
                  <span className={styles.icon}>📧</span>
                  <div>
                    <p className={styles.label}>Email</p>
                    <p className={styles.value}>{cita.paciente.email}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Información de la cita */}
          <section className={styles.section}>
            <h2>Información de la Cita</h2>
            <div className={styles.info}>
              <div className={styles.infoRow}>
                <span className={styles.icon}>📅</span>
                <div>
                  <p className={styles.label}>Fecha</p>
                  <p className={styles.value}>{formatearFecha(cita.fecha_hora)}</p>
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.icon}>🕐</span>
                <div>
                  <p className={styles.label}>Hora</p>
                  <p className={styles.value}>{formatearHora(cita.fecha_hora)}</p>
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.icon}>⏱️</span>
                <div>
                  <p className={styles.label}>Duración</p>
                  <p className={styles.value}>{cita.duracion_minutos} minutos</p>
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.icon}>📝</span>
                <div>
                  <p className={styles.label}>Motivo</p>
                  <p className={styles.value}>{cita.motivo}</p>
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.icon}>🔑</span>
                <div>
                  <p className={styles.label}>Código de cita</p>
                  <p className={styles.valueBold}>{cita.codigo_cita}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Notas adicionales */}
          {cita.notas && (
            <section className={styles.section}>
              <h2>Notas</h2>
              <p className={styles.notas}>{cita.notas}</p>
            </section>
          )}

          {/* Acciones */}
          {!citaCancelada && !citaPasada && (
            <section className={styles.actions}>
              <button
                onClick={() => setMostrarConfirmacion(true)}
                className={styles.cancelButton}
                disabled={cancelando}
              >
                {cancelando ? 'Cancelando...' : 'Cancelar Cita'}
              </button>
              <button
                onClick={() => router.push('/')}
                className={styles.rescheduleButton}
              >
                Reagendar Cita
              </button>
            </section>
          )}

          {citaCancelada && (
            <div className={styles.alertDanger}>
              ⚠️ Esta cita ha sido cancelada
            </div>
          )}

          {citaPasada && !citaCancelada && (
            <div className={styles.alertInfo}>
              ℹ️ Esta cita ya fue realizada
            </div>
          )}
        </div>

        <button onClick={() => router.push('/')} className={styles.backLink}>
          ← Volver al inicio
        </button>

        {/* Modal de confirmación */}
        {mostrarConfirmacion && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <h3>¿Estás seguro?</h3>
              <p>¿Deseas cancelar esta cita?</p>
              <p className={styles.modalWarning}>
                Esta acción no se puede deshacer.
              </p>
              <div className={styles.modalActions}>
                <button
                  onClick={() => setMostrarConfirmacion(false)}
                  className={styles.modalCancelButton}
                  disabled={cancelando}
                >
                  No, mantener cita
                </button>
                <button
                  onClick={cancelarCita}
                  className={styles.modalConfirmButton}
                  disabled={cancelando}
                >
                  {cancelando ? 'Cancelando...' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
