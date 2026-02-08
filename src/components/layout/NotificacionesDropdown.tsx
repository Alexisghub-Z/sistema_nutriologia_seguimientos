'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './NotificacionesDropdown.module.css'

interface CitaProxima {
  id: string
  tipo: 'cita'
  pacienteId: string
  pacienteNombre: string
  fechaHora: string
  tipoCita: string
  minutosRestantes: number
}

interface NuevoProspecto {
  id: string
  tipo: 'prospecto'
  telefono: string
  nombre: string
  createdAt: string
  totalMensajes: number
}

interface Notificaciones {
  citasProximas: CitaProxima[]
  nuevosProspectos: NuevoProspecto[]
  total: number
}

export default function NotificacionesDropdown() {
  const [notificaciones, setNotificaciones] = useState<Notificaciones>({
    citasProximas: [],
    nuevosProspectos: [],
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    cargarNotificaciones()
    // Recargar cada 2 minutos
    const intervalo = setInterval(cargarNotificaciones, 2 * 60 * 1000)
    return () => clearInterval(intervalo)
  }, [])

  const cargarNotificaciones = async () => {
    try {
      const response = await fetch('/api/notificaciones')
      if (response.ok) {
        const data = await response.json()
        setNotificaciones(data)
      }
    } catch (error) {
      console.error('Error al cargar notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCitaClick = (pacienteId: string) => {
    setIsOpen(false)
    router.push(`/pacientes/${pacienteId}`)
  }

  const handleProspectoClick = () => {
    setIsOpen(false)
    router.push('/mensajes')
  }

  const formatearTiempoRestante = (minutos: number) => {
    if (minutos < 60) {
      return `en ${minutos} min`
    }
    const horas = Math.floor(minutos / 60)
    const mins = minutos % 60
    return mins > 0 ? `en ${horas}h ${mins}min` : `en ${horas}h`
  }

  const formatearHora = (fechaHora: string) => {
    return new Date(fechaHora).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatearTiempoRelativo = (fecha: string) => {
    const ahora = new Date()
    const fechaCreacion = new Date(fecha)
    const diffMs = ahora.getTime() - fechaCreacion.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 60) {
      return `Hace ${diffMins} min`
    }
    const diffHoras = Math.floor(diffMins / 60)
    if (diffHoras < 24) {
      return `Hace ${diffHoras}h`
    }
    return 'Hace 1 día'
  }

  return (
    <div className={styles.container}>
      <button
        className={styles.notificationButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificaciones"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {notificaciones.total > 0 && (
          <span className={styles.badge}>{notificaciones.total}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <div className={styles.dropdown}>
            <div className={styles.header}>
              <h3 className={styles.title}>Notificaciones</h3>
              {notificaciones.total > 0 && (
                <span className={styles.count}>({notificaciones.total})</span>
              )}
            </div>

            <div className={styles.content}>
              {loading ? (
                <div className={styles.loading}>
                  <div className={styles.spinner}></div>
                  <p>Cargando...</p>
                </div>
              ) : notificaciones.total === 0 ? (
                <div className={styles.empty}>
                  <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                  </svg>
                  <p>No hay notificaciones</p>
                </div>
              ) : (
                <>
                  {/* Citas Próximas */}
                  {notificaciones.citasProximas.length > 0 && (
                    <>
                      <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>Citas Próximas</h4>
                        {notificaciones.citasProximas.map((cita) => (
                          <button
                            key={cita.id}
                            className={styles.notificationItem}
                            onClick={() => handleCitaClick(cita.pacienteId)}
                          >
                            <div className={styles.iconContainer}>
                              <span className={styles.iconCita}>⏰</span>
                            </div>
                            <div className={styles.notificationContent}>
                              <p className={styles.notificationText}>
                                <strong>{cita.pacienteNombre}</strong>
                              </p>
                              <p className={styles.notificationMeta}>
                                {formatearHora(cita.fechaHora)} •{' '}
                                {formatearTiempoRestante(cita.minutosRestantes)} •{' '}
                                {cita.tipoCita === 'PRESENCIAL' ? '🏥 Presencial' : '💻 En línea'}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {notificaciones.nuevosProspectos.length > 0 && (
                        <div className={styles.divider}></div>
                      )}
                    </>
                  )}

                  {/* Nuevos Prospectos */}
                  {notificaciones.nuevosProspectos.length > 0 && (
                    <div className={styles.section}>
                      <h4 className={styles.sectionTitle}>Nuevos Prospectos</h4>
                      {notificaciones.nuevosProspectos.map((prospecto) => (
                        <button
                          key={prospecto.id}
                          className={styles.notificationItem}
                          onClick={handleProspectoClick}
                        >
                          <div className={styles.iconContainer}>
                            <span className={styles.iconProspecto}>🆕</span>
                          </div>
                          <div className={styles.notificationContent}>
                            <p className={styles.notificationText}>
                              <strong>{prospecto.nombre}</strong>
                            </p>
                            <p className={styles.notificationMeta}>
                              {prospecto.telefono} • {formatearTiempoRelativo(prospecto.createdAt)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
