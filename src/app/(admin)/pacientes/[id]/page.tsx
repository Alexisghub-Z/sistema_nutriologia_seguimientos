'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import ModalDetalleCita from '@/components/citas/ModalDetalleCita'
import styles from './detalle.module.css'

interface Paciente {
  id: string
  nombre: string
  email: string
  telefono: string
  fecha_nacimiento: string
  createdAt: string
  citas: Array<{
    id: string
    fecha_hora: string
    estado: string
    motivo_consulta: string
    tipo_cita: string
    codigo_cita: string | null
    estado_confirmacion: string
    confirmada_por_paciente: boolean
  }>
  consultas: Array<{
    id: string
    fecha: string
    motivo: string
    peso: number | null
    talla: number | null
    imc: number | null
    grasa_corporal: number | null
    masa_muscular_kg: number | null
    diagnostico: string | null
    objetivo: string | null
    proxima_cita: string | null
    seguimiento_programado: boolean
    tipo_seguimiento: string | null
  }>
  _count: {
    citas: number
    consultas: number
    mensajes: number
  }
}

export default function DetallePacientePage() {
  const params = useParams()
  const router = useRouter()
  const pacienteId = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [citaSeleccionada, setCitaSeleccionada] = useState<any>(null)
  const [tabActiva, setTabActiva] = useState<'activas' | 'completadas' | 'canceladas'>('activas')
  const [programandoSeguimiento, setProgramandoSeguimiento] = useState(false)
  const [cancelandoSeguimiento, setCancelandoSeguimiento] = useState(false)
  const [tipoSeguimientoSeleccionado, setTipoSeguimientoSeleccionado] =
    useState<string>('SOLO_RECORDATORIO')
  const [estadisticasFinancieras, setEstadisticasFinancieras] = useState<{
    totalGastado: number
    totalPagado: number
    totalPendiente: number
    promedioConsulta: number
    consultasPagadas: number
    consultasPendientes: number
  } | null>(null)

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

    const fetchEstadisticasFinancieras = async () => {
      try {
        const response = await fetch(`/api/pacientes/${pacienteId}/estadisticas-financieras`)
        if (response.ok) {
          const data = await response.json()
          setEstadisticasFinancieras(data)
        }
      } catch (err) {
        console.error('Error al cargar estadísticas financieras:', err)
      }
    }

    fetchPaciente()
    fetchEstadisticasFinancieras()
  }, [pacienteId])

  const cargarDetalleCita = async (citaId: string) => {
    try {
      const response = await fetch(`/api/citas/${citaId}`)
      if (response.ok) {
        const data = await response.json()
        setCitaSeleccionada(data)
      }
    } catch (err) {
      console.error('Error al cargar detalle de cita:', err)
    }
  }

  const refrescarPaciente = () => {
    const fetchPaciente = async () => {
      try {
        const response = await fetch(`/api/pacientes/${pacienteId}`)
        if (response.ok) {
          const data = await response.json()
          setPaciente(data)
        }
      } catch (err) {
        console.error('Error al refrescar paciente:', err)
      }
    }
    fetchPaciente()
  }

  const cancelarCita = async (citaId: string) => {
    if (!confirm('¿Cancelar esta cita? Se eliminará del calendario de Google.')) {
      return
    }

    try {
      const response = await fetch(`/api/citas/${citaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'CANCELADA' }),
      })

      if (!response.ok) {
        throw new Error('Error al cancelar cita')
      }

      // Refrescar datos del paciente
      refrescarPaciente()
    } catch (err) {
      console.error('Error al cancelar cita:', err)
      alert('Error al cancelar la cita')
    }
  }

  // Calcular edad
  const calcularEdad = (fechaNacimiento: string) => {
    const hoy = new Date()
    const nacimiento = new Date(fechaNacimiento)
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return edad
  }

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatearFechaCorta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Filtrar citas según tab activa
  const filtrarCitas = () => {
    if (!paciente) return []

    const ahora = new Date()

    switch (tabActiva) {
      case 'activas':
        return paciente.citas.filter(
          (cita) =>
            cita.estado === 'PENDIENTE' &&
            cita.estado_confirmacion !== 'CANCELADA_PACIENTE' &&
            new Date(cita.fecha_hora) >= ahora
        )
      case 'completadas':
        return paciente.citas.filter((cita) => cita.estado === 'COMPLETADA')
      case 'canceladas':
        return paciente.citas.filter(
          (cita) =>
            cita.estado === 'CANCELADA' ||
            cita.estado_confirmacion === 'CANCELADA_PACIENTE' ||
            cita.estado === 'NO_ASISTIO'
        )
      default:
        return paciente.citas
    }
  }

  // Programar seguimiento
  const programarSeguimientoHandler = async (consultaId: string) => {
    setProgramandoSeguimiento(true)
    try {
      const response = await fetch('/api/seguimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultaId, tipoSeguimiento: tipoSeguimientoSeleccionado }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al programar seguimiento')
      }

      // Refrescar datos del paciente
      refrescarPaciente()
      alert('Seguimiento programado exitosamente')
    } catch (err) {
      console.error('Error:', err)
      alert(err instanceof Error ? err.message : 'Error al programar seguimiento')
    } finally {
      setProgramandoSeguimiento(false)
    }
  }

  // Cancelar seguimiento
  const cancelarSeguimientoHandler = async (consultaId: string) => {
    if (!confirm('¿Estás seguro de cancelar el seguimiento programado?')) {
      return
    }

    setCancelandoSeguimiento(true)
    try {
      const response = await fetch(`/api/seguimiento?consultaId=${consultaId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al cancelar seguimiento')
      }

      // Refrescar datos del paciente
      refrescarPaciente()
      alert('Seguimiento cancelado exitosamente')
    } catch (err) {
      console.error('Error:', err)
      alert(err instanceof Error ? err.message : 'Error al cancelar seguimiento')
    } finally {
      setCancelandoSeguimiento(false)
    }
  }

  // Obtener badge de estado de cita con confirmación
  const getEstadoBadge = (estado: string, estadoConfirmacion: string, confirmada: boolean) => {
    // Si está cancelada por el paciente, mostrar ese estado
    if (estadoConfirmacion === 'CANCELADA_PACIENTE') {
      return <Badge variant="error">Cancelada por paciente</Badge>
    }

    // Si está cancelada, mostrar estado general
    if (estado === 'CANCELADA') {
      return <Badge variant="error">Cancelada</Badge>
    }

    // Si está completada
    if (estado === 'COMPLETADA') {
      return <Badge variant="success">Completada</Badge>
    }

    // Si no asistió
    if (estado === 'NO_ASISTIO') {
      return <Badge variant="error">No asistió</Badge>
    }

    // Estados pendientes con confirmación
    if (estado === 'PENDIENTE') {
      if (confirmada) {
        return <Badge variant="success">Confirmada</Badge>
      }
      if (estadoConfirmacion === 'RECORDATORIO_ENVIADO') {
        return <Badge variant="info">Recordatorio enviado</Badge>
      }
      return <Badge variant="warning">Pendiente confirmación</Badge>
    }

    return <Badge variant="info">{estado}</Badge>
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Cargando información del paciente...</p>
        </div>
      </div>
    )
  }

  if (error || !paciente) {
    return (
      <div className={styles.container}>
        <Alert variant="error">{error || 'No se pudo cargar el paciente'}</Alert>
        <Button onClick={() => router.push('/pacientes')}>Volver a la lista</Button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="outline"
            size="small"
            onClick={() => router.push('/pacientes')}
            className={styles.backButton}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
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
            <h1 className={styles.title}>{paciente.nombre}</h1>
            <p className={styles.subtitle}>Registrado el {formatearFecha(paciente.createdAt)}</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            onClick={() => router.push(`/pacientes/${pacienteId}/consultas`)}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            Ver Historial
          </Button>
          <Button variant="outline" onClick={() => router.push(`/pacientes/${pacienteId}/editar`)}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Editar
          </Button>
          <Button onClick={() => router.push(`/pacientes/${pacienteId}/citas/nueva`)}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Nueva Cita
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Información Personal */}
        <Card className={styles.infoCard}>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={styles.infoIcon}
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className={styles.infoLabel}>Edad</span>
                  <span className={styles.infoValue}>
                    {calcularEdad(paciente.fecha_nacimiento)} años
                  </span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={styles.infoIcon}
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className={styles.infoLabel}>Fecha de Nacimiento</span>
                  <span className={styles.infoValue}>
                    {formatearFecha(paciente.fecha_nacimiento)}
                  </span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={styles.infoIcon}
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <div>
                  <span className={styles.infoLabel}>Email</span>
                  <a href={`mailto:${paciente.email}`} className={styles.infoLink}>
                    {paciente.email}
                  </a>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={styles.infoIcon}
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <div>
                  <span className={styles.infoLabel}>Teléfono</span>
                  <a href={`tel:${paciente.telefono}`} className={styles.infoLink}>
                    {paciente.telefono}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon} style={{ backgroundColor: '#e0f2fe' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: '#0284c7' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <span className={styles.statLabel}>Citas Completadas</span>
                <span className={styles.statValue}>{paciente._count.citas}</span>
              </div>
            </div>
          </Card>

          <Card className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon} style={{ backgroundColor: '#dcfce7' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: '#16a34a' }}
                >
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <span className={styles.statLabel}>Consultas</span>
                <span className={styles.statValue}>{paciente._count.consultas}</span>
              </div>
            </div>
          </Card>

          <Card className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: '#ca8a04' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <span className={styles.statLabel}>Mensajes</span>
                <span className={styles.statValue}>{paciente._count.mensajes}</span>
              </div>
            </div>
          </Card>

          <Card className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon} style={{ backgroundColor: '#dcfce7' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: '#16a34a' }}
                >
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <span className={styles.statLabel}>Total Gastado</span>
                <span className={styles.statValue}>
                  {estadisticasFinancieras
                    ? `$${estadisticasFinancieras.totalGastado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '-'}
                </span>
                {estadisticasFinancieras && estadisticasFinancieras.totalPendiente > 0 && (
                  <span className={styles.statSubtext}>
                    ${estadisticasFinancieras.totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pendientes
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Citas */}
        <Card>
          <CardHeader>
            <CardTitle>Citas</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${tabActiva === 'activas' ? styles.tabActive : ''}`}
                onClick={() => setTabActiva('activas')}
              >
                Activas
              </button>
              <button
                className={`${styles.tab} ${tabActiva === 'completadas' ? styles.tabActive : ''}`}
                onClick={() => setTabActiva('completadas')}
              >
                Completadas
              </button>
              <button
                className={`${styles.tab} ${tabActiva === 'canceladas' ? styles.tabActive : ''}`}
                onClick={() => setTabActiva('canceladas')}
              >
                Canceladas
              </button>
            </div>

            {/* Contenido de las tabs */}
            <div className={styles.tabContent}>
              {filtrarCitas().length === 0 ? (
                <div className={styles.emptyState}>
                  <p>
                    {tabActiva === 'activas' && 'No hay citas activas'}
                    {tabActiva === 'completadas' && 'No hay citas completadas'}
                    {tabActiva === 'canceladas' && 'No hay citas canceladas'}
                  </p>
                </div>
              ) : (
                <div className={styles.list}>
                  {filtrarCitas().map((cita) => (
                    <div
                      key={cita.id}
                      className={styles.listItem}
                      onClick={() => cargarDetalleCita(cita.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.listItemContent}>
                        <div className={styles.citaInfo}>
                          <span className={styles.listItemTitle}>
                            {cita.tipo_cita === 'PRESENCIAL' ? '🏥' : '💻'} {cita.motivo_consulta}
                          </span>
                          <div className={styles.citaMeta}>
                            <span className={styles.listItemDate}>
                              {formatearFechaCorta(cita.fecha_hora)}
                            </span>
                            <span className={styles.tipoCita}>
                              {cita.tipo_cita === 'PRESENCIAL' ? 'Presencial' : 'En línea'}
                            </span>
                            {cita.codigo_cita && (
                              <span className={styles.citaCodigo}>Código: {cita.codigo_cita}</span>
                            )}
                          </div>
                        </div>
                        <div
                          className={styles.listItemActions}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getEstadoBadge(
                            cita.estado,
                            cita.estado_confirmacion,
                            cita.confirmada_por_paciente
                          )}
                          {cita.estado === 'PENDIENTE' && tabActiva === 'activas' && (
                            <>
                              <Button
                                size="small"
                                onClick={() =>
                                  router.push(
                                    `/pacientes/${pacienteId}/citas/${cita.id}/crear-consulta`
                                  )
                                }
                              >
                                Registrar
                              </Button>
                              <Button
                                size="small"
                                variant="danger"
                                onClick={() => cancelarCita(cita.id)}
                              >
                                Cancelar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Historial de Consultas */}
        <Card className={styles.consultasCard}>
          <CardHeader>
            <CardTitle>Historial de Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            {paciente.consultas.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No hay consultas registradas</p>
              </div>
            ) : (
              <div className={styles.consultasList}>
                {paciente.consultas.map((consulta, index) => (
                  <div
                    key={consulta.id}
                    className={styles.consultaItem}
                    onClick={() => router.push(`/pacientes/${pacienteId}/consultas`)}
                  >
                    <div className={styles.consultaHeader}>
                      <div className={styles.consultaFecha}>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {formatearFecha(consulta.fecha)}
                        {index === 0 && <Badge variant="info">Más reciente</Badge>}
                      </div>
                      {consulta.motivo && (
                        <div className={styles.consultaMotivo}>{consulta.motivo}</div>
                      )}
                    </div>

                    <div className={styles.consultaBody}>
                      {/* Mediciones */}
                      {(consulta.peso || consulta.imc || consulta.grasa_corporal) && (
                        <div className={styles.consultaMediciones}>
                          {consulta.peso && (
                            <div className={styles.medicion}>
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className={styles.medicionLabel}>Peso:</span>
                              <span className={styles.medicionValor}>{consulta.peso} kg</span>
                            </div>
                          )}
                          {consulta.imc && (
                            <div className={styles.medicion}>
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path
                                  fillRule="evenodd"
                                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className={styles.medicionLabel}>IMC:</span>
                              <span className={styles.medicionValor}>
                                {consulta.imc.toFixed(1)}
                              </span>
                            </div>
                          )}
                          {consulta.grasa_corporal && (
                            <div className={styles.medicion}>
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className={styles.medicionLabel}>Grasa:</span>
                              <span className={styles.medicionValor}>
                                {consulta.grasa_corporal}%
                              </span>
                            </div>
                          )}
                          {consulta.masa_muscular_kg && (
                            <div className={styles.medicion}>
                              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                  fillRule="evenodd"
                                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className={styles.medicionLabel}>Músculo:</span>
                              <span className={styles.medicionValor}>
                                {consulta.masa_muscular_kg} kg
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Diagnóstico y Objetivo */}
                      {(consulta.diagnostico || consulta.objetivo) && (
                        <div className={styles.consultaInfo}>
                          {consulta.diagnostico && (
                            <div className={styles.consultaTexto}>
                              <span className={styles.consultaLabel}>Dx:</span>
                              <p className={styles.consultaDescripcion}>{consulta.diagnostico}</p>
                            </div>
                          )}
                          {consulta.objetivo && (
                            <div className={styles.consultaTexto}>
                              <span className={styles.consultaLabel}>Obj:</span>
                              <p className={styles.consultaDescripcion}>{consulta.objetivo}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className={styles.consultaFooter}>
                      <span className={styles.verMas}>
                        Ver detalles completos
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel de Seguimiento - Próxima Cita Sugerida */}
        {paciente.consultas.length > 0 &&
          paciente.consultas[0] &&
          paciente.consultas[0].proxima_cita &&
          (() => {
            const ultimaConsulta = paciente.consultas[0]!
            const proximaCita = ultimaConsulta.proxima_cita!
            return (
              <Card className={styles.seguimientoCard}>
                <CardHeader>
                  <CardTitle>Seguimiento Nutricional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={styles.seguimientoContent}>
                    <div className={styles.seguimientoInfo}>
                      <div className={styles.seguimientoFecha}>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={styles.seguimientoIcon}
                        >
                          <path
                            fillRule="evenodd"
                            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          Próxima cita sugerida:{' '}
                          <strong>{formatearFecha(proximaCita)}</strong>
                        </span>
                      </div>
                      <div className={styles.seguimientoMeta}>
                        {new Date(proximaCita) < new Date() ? (
                          <Badge variant="error">Fecha vencida</Badge>
                        ) : ultimaConsulta.seguimiento_programado ? (
                          <>
                            <Badge variant="success">Recordatorio programado</Badge>
                            <span className={styles.seguimientoTexto}>
                              Se enviará 1 día antes (
                              {formatearFecha(
                                new Date(
                                  new Date(proximaCita).getTime() - 24 * 60 * 60 * 1000
                                ).toISOString()
                              )}
                              )
                            </span>
                          </>
                        ) : (
                          <Badge variant="warning">Sin recordatorio</Badge>
                        )}
                      </div>
                    </div>

                    {/* Selector de tipo de seguimiento */}
                    {!ultimaConsulta.seguimiento_programado && (
                      <div className={styles.seguimientoTipo}>
                        <label className={styles.tipoLabel}>Tipo de seguimiento:</label>
                        <div className={styles.tipoOpciones}>
                          <label className={styles.radioOption}>
                            <input
                              type="radio"
                              name="tipoSeguimiento"
                              value="SOLO_RECORDATORIO"
                              checked={tipoSeguimientoSeleccionado === 'SOLO_RECORDATORIO'}
                              onChange={(e) => setTipoSeguimientoSeleccionado(e.target.value)}
                            />
                            <div className={styles.radioContent}>
                              <span className={styles.radioTitle}>Solo recordatorio</span>
                              <span className={styles.radioDescription}>
                                1 mensaje 4 días antes de la fecha sugerida
                              </span>
                            </div>
                          </label>
                          <label className={styles.radioOption}>
                            <input
                              type="radio"
                              name="tipoSeguimiento"
                              value="SOLO_SEGUIMIENTO"
                              checked={tipoSeguimientoSeleccionado === 'SOLO_SEGUIMIENTO'}
                              onChange={(e) => setTipoSeguimientoSeleccionado(e.target.value)}
                            />
                            <div className={styles.radioContent}>
                              <span className={styles.radioTitle}>Solo seguimiento</span>
                              <span className={styles.radioDescription}>
                                Hasta 3 mensajes de apoyo durante el periodo
                              </span>
                            </div>
                          </label>
                          <label className={styles.radioOption}>
                            <input
                              type="radio"
                              name="tipoSeguimiento"
                              value="RECORDATORIO_Y_SEGUIMIENTO"
                              checked={tipoSeguimientoSeleccionado === 'RECORDATORIO_Y_SEGUIMIENTO'}
                              onChange={(e) => setTipoSeguimientoSeleccionado(e.target.value)}
                            />
                            <div className={styles.radioContent}>
                              <span className={styles.radioTitle}>Seguimiento completo</span>
                              <span className={styles.radioDescription}>
                                Mensajes de apoyo + recordatorio (hasta 4 mensajes)
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Mostrar tipo actual si está programado */}
                    {ultimaConsulta.seguimiento_programado && ultimaConsulta.tipo_seguimiento && (
                      <div className={styles.seguimientoTipoActual}>
                        <span className={styles.tipoActualLabel}>Tipo programado:</span>
                        <Badge variant="info">
                          {ultimaConsulta.tipo_seguimiento === 'SOLO_RECORDATORIO' &&
                            'Solo recordatorio'}
                          {ultimaConsulta.tipo_seguimiento === 'SOLO_SEGUIMIENTO' &&
                            'Solo seguimiento'}
                          {ultimaConsulta.tipo_seguimiento === 'RECORDATORIO_Y_SEGUIMIENTO' &&
                            'Ambos'}
                        </Badge>
                      </div>
                    )}

                    <div className={styles.seguimientoActions}>
                      {ultimaConsulta.seguimiento_programado ? (
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => cancelarSeguimientoHandler(ultimaConsulta.id)}
                          disabled={cancelandoSeguimiento}
                        >
                          {cancelandoSeguimiento ? 'Cancelando...' : 'Cancelar Recordatorio'}
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          onClick={() => programarSeguimientoHandler(ultimaConsulta.id)}
                          disabled={programandoSeguimiento || new Date(proximaCita) < new Date()}
                        >
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                          </svg>
                          {programandoSeguimiento ? 'Programando...' : 'Programar Recordatorio'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })()}
      </div>

      {/* Modal de Detalles de Cita */}
      <ModalDetalleCita
        cita={citaSeleccionada}
        onClose={() => setCitaSeleccionada(null)}
        onActualizar={refrescarPaciente}
      />
    </div>
  )
}
