'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './ModalDetalleCita.module.css'

interface Cita {
  id: string
  fecha_hora: string
  duracion_minutos: number
  motivo_consulta: string
  tipo_cita: 'PRESENCIAL' | 'EN_LINEA'
  estado: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA' | 'NO_ASISTIO'
  estado_confirmacion: string
  confirmada_por_paciente: boolean
  fecha_confirmacion: string | null
  google_event_id: string | null
  paciente: {
    id: string
    nombre: string
    email: string
    telefono: string
  }
  consulta?: {
    id: string
  } | null
}

interface ModalDetalleCitaProps {
  cita: Cita | null
  onClose: () => void
  onActualizar: () => void
}

export default function ModalDetalleCita({ cita, onClose, onActualizar }: ModalDetalleCitaProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!cita || !mounted) return null

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatearHora = (fecha: string) => {
    return new Date(fecha).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return styles.estadoPendiente
      case 'COMPLETADA':
        return styles.estadoCompletada
      case 'CANCELADA':
        return styles.estadoCancelada
      case 'NO_ASISTIO':
        return styles.estadoNoAsistio
      default:
        return ''
    }
  }

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente'
      case 'COMPLETADA':
        return 'Completada'
      case 'CANCELADA':
        return 'Cancelada'
      case 'NO_ASISTIO':
        return 'No asistió'
      default:
        return estado
    }
  }

  const cambiarEstado = async (nuevoEstado: string) => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/citas/${cita.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar estado')
      }

      onActualizar()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  const confirmarCambioEstado = (nuevoEstado: string, mensaje: string) => {
    if (confirm(mensaje)) {
      cambiarEstado(nuevoEstado)
    }
  }

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      {/* Modal */}
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Detalles de la Cita</h2>
            <p className={styles.citaId}>ID: {cita.id.slice(0, 8)}...</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            ×
          </button>
        </div>

        {/* Contenido */}
        <div className={styles.content}>
          {/* Estado */}
          <div className={styles.section}>
            <div className={styles.estadoContainer}>
              <span className={`${styles.badge} ${getEstadoColor(cita.estado)}`}>
                {getEstadoTexto(cita.estado)}
              </span>
              {cita.confirmada_por_paciente && cita.fecha_confirmacion && (
                <span
                  className={styles.badgeConfirmada}
                  title={`Confirmada el ${new Date(cita.fecha_confirmacion).toLocaleString('es-MX')}`}
                >
                  ✓ Confirmada por paciente
                </span>
              )}
              {!cita.confirmada_por_paciente && cita.estado === 'PENDIENTE' && (
                <span className={styles.badgePendiente}>⏳ Pendiente de confirmación</span>
              )}
              {cita.google_event_id && (
                <span className={styles.badgeGoogle}>📅 En Google Calendar</span>
              )}
            </div>
          </div>

          {/* Información del Paciente */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Paciente</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                <div>
                  <p className={styles.infoLabel}>Nombre</p>
                  <p className={styles.infoValue}>{cita.paciente.nombre}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <div>
                  <p className={styles.infoLabel}>Email</p>
                  <p className={styles.infoValue}>{cita.paciente.email}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <div>
                  <p className={styles.infoLabel}>Teléfono</p>
                  <p className={styles.infoValue}>{cita.paciente.telefono}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Información de la Cita */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Detalles de la Cita</h3>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className={styles.infoLabel}>Fecha</p>
                  <p className={styles.infoValue}>{formatearFecha(cita.fecha_hora)}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className={styles.infoLabel}>Hora</p>
                  <p className={styles.infoValue}>{formatearHora(cita.fecha_hora)}</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className={styles.infoLabel}>Duración</p>
                  <p className={styles.infoValue}>{cita.duracion_minutos} minutos</p>
                </div>
              </div>

              <div className={styles.infoItem}>
                <span style={{ fontSize: '20px' }}>
                  {cita.tipo_cita === 'PRESENCIAL' ? '🏥' : '💻'}
                </span>
                <div>
                  <p className={styles.infoLabel}>Tipo de Cita</p>
                  <p className={styles.infoValue}>
                    {cita.tipo_cita === 'PRESENCIAL' ? 'Presencial' : 'En línea'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Motivo de Consulta */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Motivo de Consulta</h3>
            <p className={styles.motivo}>{cita.motivo_consulta}</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        {/* Footer - Acciones */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {/* Solo mostrar opciones de consulta si la cita está completada */}
            {cita.estado === 'COMPLETADA' && (
              <>
                {cita.consulta ? (
                  <a
                    href={`/pacientes/${cita.paciente.id}/consultas/${cita.consulta.id}/archivos`}
                    className={styles.btnSecondary}
                  >
                    Ver Consulta
                  </a>
                ) : (
                  <a
                    href={`/pacientes/${cita.paciente.id}/citas/${cita.id}/crear-consulta`}
                    className={styles.btnSecondary}
                  >
                    Crear Consulta
                  </a>
                )}
              </>
            )}

            {/* Mostrar mensaje informativo para citas canceladas o no asistidas */}
            {(cita.estado === 'CANCELADA' || cita.estado === 'NO_ASISTIO') && (
              <span className={styles.textMuted}>
                {cita.estado === 'CANCELADA'
                  ? 'Cita cancelada - No se puede crear consulta'
                  : 'Paciente no asistió - No se puede crear consulta'}
              </span>
            )}

            {/* Mostrar mensaje para citas pendientes */}
            {cita.estado === 'PENDIENTE' && !cita.consulta && (
              <span className={styles.textMuted}>
                Crea la consulta para registrar datos del paciente
              </span>
            )}

            <a href={`/pacientes/${cita.paciente.id}`} className={styles.btnSecondary}>
              Ver Paciente
            </a>
          </div>

          <div className={styles.footerRight}>
            {cita.estado === 'PENDIENTE' && (
              <>
                <button
                  onClick={() =>
                    confirmarCambioEstado('NO_ASISTIO', '¿Marcar que el paciente no asistió?')
                  }
                  className={styles.btnWarning}
                  disabled={loading}
                >
                  No Asistió
                </button>
                <button
                  onClick={() =>
                    confirmarCambioEstado(
                      'CANCELADA',
                      '¿Cancelar esta cita? Se eliminará del calendario de Google.'
                    )
                  }
                  className={styles.btnDanger}
                  disabled={loading}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
