'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import styles from './cita.module.css'

interface Paciente {
  id: string
  nombre: string
  email: string | null
  telefono: string
  fecha_nacimiento: string
}

interface Cita {
  id: string
  codigo_cita: string
  fecha_hora: string
  duracion_minutos: number
  motivo: string
  motivo_consulta: string
  estado: string
  estado_confirmacion: string
  confirmada_por_paciente: boolean
  fecha_confirmacion: string | null
  paciente: Paciente
  notas?: string | null
}

export default function CitaPage({ params }: { params: Promise<{ codigo: string }> }) {
  const resolvedParams = use(params)
  const codigo = resolvedParams.codigo

  const [cita, setCita] = useState<Cita | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [reagendando, setReagendando] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [mostrarConfirmacionAsistencia, setMostrarConfirmacionAsistencia] = useState(false)
  const [mostrarConfirmacionReagendar, setMostrarConfirmacionReagendar] = useState(false)
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

  const confirmarAsistencia = async () => {
    if (!cita || confirmando) return // Prevenir doble envío

    try {
      setConfirmando(true)
      setError('') // Limpiar errores previos

      const response = await fetch(`/api/citas/codigo/${codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'confirmar' }),
      })

      if (response.ok) {
        await cargarCita()
        setMostrarConfirmacionAsistencia(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Error al confirmar la cita')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setConfirmando(false)
    }
  }

  const cancelarCita = async () => {
    if (!cita || cancelando) return // Prevenir doble envío

    try {
      setCancelando(true)
      setError('') // Limpiar errores previos

      const response = await fetch(`/api/citas/codigo/${codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'cancelar' }),
      })

      if (response.ok) {
        await cargarCita()
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

  const validarReagendar = () => {
    if (!cita) return false

    // No se puede reagendar una cita cancelada
    if (cita.estado === 'CANCELADA' || cita.estado_confirmacion === 'CANCELADA_PACIENTE') {
      setError('No puedes reagendar una cita cancelada. Por favor, agenda una nueva cita.')
      return false
    }

    // No se puede reagendar una cita completada
    if (cita.estado === 'COMPLETADA') {
      setError('No puedes reagendar una cita ya completada. Por favor, agenda una nueva cita.')
      return false
    }

    // No se puede reagendar si el paciente no asistió
    if (cita.estado === 'NO_ASISTIO') {
      setError('No puedes reagendar esta cita. Por favor, agenda una nueva cita.')
      return false
    }

    const fechaCita = new Date(cita.fecha_hora)
    const ahora = new Date()

    // No se puede reagendar una cita pasada (con margen de 2 horas)
    const dosMasAtras = new Date(ahora.getTime() - 2 * 60 * 60 * 1000)
    if (fechaCita < dosMasAtras) {
      setError('No puedes reagendar una cita pasada. Por favor, agenda una nueva cita.')
      return false
    }

    return true
  }

  const reagendarCita = async () => {
    if (!cita || reagendando) return // Prevenir doble envío

    try {
      setReagendando(true)
      setError('') // Limpiar errores previos

      // Guardar datos en localStorage ANTES de cancelar (si falla, no se cancela la cita)
      const datosReagendar = {
        nombre: cita.paciente.nombre,
        email: cita.paciente.email || '',
        telefono: cita.paciente.telefono,
        fecha_nacimiento: cita.paciente.fecha_nacimiento,
        motivo: cita.motivo_consulta || cita.motivo,
        reagendando: true,
        citaOriginal: codigo,
      }

      try {
        localStorage.setItem('datosReagendar', JSON.stringify(datosReagendar))
      } catch {
        setError('No se puede reagendar en modo privado. Por favor, usa un navegador sin modo incógnito.')
        return
      }

      // Cancelar la cita actual
      const response = await fetch(`/api/citas/codigo/${codigo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'cancelar' }),
      })

      if (!response.ok) {
        setError('Error al cancelar la cita actual')
        return
      }

      // Redirigir a agendar
      router.push('/agendar?reagendar=true')
    } catch (err) {
      setError('Error de conexión al reagendar')
    } finally {
      setReagendando(false)
      setMostrarConfirmacionReagendar(false)
    }
  }

  const iniciarReagendar = () => {
    if (validarReagendar()) {
      setMostrarConfirmacionReagendar(true)
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

  const getEstadoTexto = (estado: string, estadoConfirmacion: string, confirmada: boolean) => {
    if (estadoConfirmacion === 'CANCELADA_PACIENTE') return 'Cancelada'
    if (estado === 'CANCELADA') return 'Cancelada'
    if (estado === 'COMPLETADA') return 'Completada'
    if (estado === 'NO_ASISTIO') return 'No asistió'
    if (estado === 'PENDIENTE') {
      if (confirmada) return 'Confirmada'
      return 'Pendiente'
    }
    return estado
  }

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <p>Cargando información...</p>
        </div>
      </main>
    )
  }

  if (error || !cita) {
    return (
      <main className={styles.main}>
        <div className={styles.errorCard}>
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
          <button onClick={() => router.push('/')} className={styles.backButton}>
            ← Volver
          </button>
          <h1>Nutriólogo Paul</h1>
        </div>

        <div className={styles.citaCard}>
          <div className={styles.statusHeader}>
            <h2>Tu Cita</h2>
            <div className={styles.statusBadge}>
              {getEstadoTexto(cita.estado, cita.estado_confirmacion, cita.confirmada_por_paciente)}
            </div>
          </div>

          {/* Información principal */}
          <div className={styles.mainInfo}>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Fecha</span>
              <span className={styles.infoValue}>{formatearFecha(cita.fecha_hora)}</span>
            </div>
            <div className={styles.infoDivider}></div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Hora</span>
              <span className={styles.infoValue}>{formatearHora(cita.fecha_hora)}</span>
            </div>
            <div className={styles.infoDivider}></div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Duración</span>
              <span className={styles.infoValue}>{cita.duracion_minutos} min</span>
            </div>
          </div>

          {/* Detalles */}
          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Paciente</span>
              <span className={styles.detailValue}>{cita.paciente.nombre}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Teléfono</span>
              <span className={styles.detailValue}>{cita.paciente.telefono}</span>
            </div>
            {cita.paciente.email && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailValue}>{cita.paciente.email}</span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Motivo</span>
              <span className={styles.detailValue}>{cita.motivo_consulta || cita.motivo}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Código</span>
              <span className={styles.detailValueBold}>{cita.codigo_cita}</span>
            </div>
          </div>

          {/* Notas */}
          {cita.notas && (
            <div className={styles.notes}>
              <span className={styles.notesLabel}>Notas</span>
              <p>{cita.notas}</p>
            </div>
          )}

          {/* Acciones */}
          {!citaCancelada && !citaPasada && (
            <div className={styles.actions}>
              {cita.confirmada_por_paciente ? (
                <>
                  <div className={styles.alertSuccess}>
                    Asistencia confirmada
                    {cita.fecha_confirmacion && (
                      <span>
                        {' '}
                        el {new Date(cita.fecha_confirmacion).toLocaleDateString('es-MX')}
                      </span>
                    )}
                  </div>
                  <div className={styles.actionsConfirmada}>
                    <button
                      onClick={iniciarReagendar}
                      className={styles.rescheduleButton}
                      disabled={reagendando}
                    >
                      {reagendando ? 'Reagendando...' : 'Reagendar'}
                    </button>
                    <button
                      onClick={() => setMostrarConfirmacion(true)}
                      className={styles.cancelButton}
                      disabled={cancelando}
                    >
                      {cancelando ? 'Cancelando...' : 'Cancelar Cita'}
                    </button>
                    <button onClick={() => router.push('/')} className={styles.doneButton}>
                      Listo
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setMostrarConfirmacionAsistencia(true)}
                    className={styles.confirmButton}
                    disabled={confirmando}
                  >
                    {confirmando ? 'Confirmando...' : 'Confirmar Asistencia'}
                  </button>

                  <button
                    onClick={iniciarReagendar}
                    className={styles.rescheduleButton}
                    disabled={reagendando}
                  >
                    {reagendando ? 'Reagendando...' : 'Reagendar'}
                  </button>

                  <button
                    onClick={() => setMostrarConfirmacion(true)}
                    className={styles.cancelButton}
                    disabled={cancelando}
                  >
                    {cancelando ? 'Cancelando...' : 'Cancelar Cita'}
                  </button>
                </>
              )}
            </div>
          )}

          {citaCancelada && <div className={styles.alert}>Esta cita ha sido cancelada</div>}

          {citaPasada && !citaCancelada && (
            <div className={styles.alert}>Esta cita ya fue realizada</div>
          )}
        </div>
      </div>

      {/* Modal confirmar asistencia */}
      {mostrarConfirmacionAsistencia && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Confirmar Asistencia</h3>
            <p>¿Confirmas que asistirás a esta cita?</p>
            <div className={styles.modalInfo}>
              <p>
                <strong>Fecha:</strong> {formatearFecha(cita.fecha_hora)}
              </p>
              <p>
                <strong>Hora:</strong> {formatearHora(cita.fecha_hora)}
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setMostrarConfirmacionAsistencia(false)}
                className={styles.modalCancelButton}
                disabled={confirmando}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAsistencia}
                className={styles.modalConfirmButton}
                disabled={confirmando}
              >
                {confirmando ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reagendar */}
      {mostrarConfirmacionReagendar && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Reagendar Cita</h3>
            <p>¿Deseas reagendar esta cita?</p>
            <div className={styles.modalInfo}>
              <p>
                <strong>Cita actual:</strong>
              </p>
              <p>
                {formatearFecha(cita.fecha_hora)} a las {formatearHora(cita.fecha_hora)}
              </p>
            </div>
            <p>Tu cita actual será cancelada y podrás seleccionar una nueva fecha y hora.</p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setMostrarConfirmacionReagendar(false)}
                className={styles.modalCancelButton}
                disabled={reagendando}
              >
                Cancelar
              </button>
              <button
                onClick={reagendarCita}
                className={styles.modalConfirmButton}
                disabled={reagendando}
              >
                {reagendando ? 'Reagendando...' : 'Sí, reagendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cancelar */}
      {mostrarConfirmacion && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Cancelar Cita</h3>
            <p>¿Estás seguro de que deseas cancelar esta cita?</p>
            <p className={styles.modalWarning}>Esta acción no se puede deshacer.</p>
            <div className={styles.modalActions}>
              <button
                onClick={() => setMostrarConfirmacion(false)}
                className={styles.modalCancelButton}
                disabled={cancelando}
              >
                No, mantener
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
    </main>
  )
}
