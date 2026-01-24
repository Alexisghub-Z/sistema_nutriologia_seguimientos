'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import styles from './dashboard.module.css'

interface DashboardStats {
  totalPacientes: number
  citasHoy: {
    total: number
    confirmadas: number
    pendientes: number
    completadas: number
    canceladas: number
    detalles: Array<{
      id: string
      paciente: string
      telefono: string
      fecha_hora: string
      estado: string
      estado_confirmacion: string
      motivo_consulta: string
    }>
  }
  consultasEsteMes: number
  tasaAsistencia: number
  mensajesPendientes: number
  ultimasConsultas: Array<{
    id: string
    paciente: string
    paciente_id: string
    fecha: string
    peso: number | null
    imc: number | null
  }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error al cargar estadísticas:', error)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Error al cargar datos</p>
        </div>
      </div>
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getEstadoBadgeClass = (cita: any) => {
    // Si está cancelada
    if (cita.estado === 'CANCELADA' || cita.estado_confirmacion === 'CANCELADA_PACIENTE') {
      return styles.badgeDanger
    }
    // Si está completada
    if (cita.estado === 'COMPLETADA') {
      return styles.badgeInfo
    }
    // Si está confirmada
    if (cita.estado_confirmacion === 'CONFIRMADA') {
      return styles.badgeSuccess
    }
    // Si está pendiente o con recordatorio enviado
    return styles.badgeWarning
  }

  const getEstadoLabel = (cita: any) => {
    // Si está cancelada
    if (cita.estado === 'CANCELADA' || cita.estado_confirmacion === 'CANCELADA_PACIENTE') {
      return 'Cancelada'
    }
    // Si está completada
    if (cita.estado === 'COMPLETADA') {
      return 'Completada'
    }
    // Si está confirmada
    if (cita.estado_confirmacion === 'CONFIRMADA') {
      return 'Confirmada'
    }
    // Si recordatorio enviado
    if (cita.estado_confirmacion === 'RECORDATORIO_ENVIADO') {
      return 'Esperando confirmación'
    }
    // Pendiente
    return 'Pendiente'
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Resumen general de tu práctica nutricional</p>
        </div>
        <div className={styles.quickActions}>
          <Button variant="primary" size="small" onClick={() => router.push('/agendar')}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Nueva Cita
          </Button>
          <Button variant="outline" size="small" onClick={() => router.push('/pacientes/nuevo')}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
            Nuevo Paciente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Total Pacientes</p>
            <p className={styles.statValue}>{stats.totalPacientes}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📅</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Citas Hoy</p>
            <p className={styles.statValue}>{stats.citasHoy.total}</p>
            <p className={styles.statDetail}>
              {stats.citasHoy.confirmadas} confirmadas · {stats.citasHoy.pendientes} pendientes
            </p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📋</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Consultas este Mes</p>
            <p className={styles.statValue}>{stats.consultasEsteMes}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>📊</div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Tasa de Asistencia</p>
            <p className={styles.statValue}>{stats.tasaAsistencia}%</p>
            <p className={styles.statDetail}>Últimos 30 días</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.contentGrid}>
        {/* Citas de Hoy */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Citas de Hoy</h2>
            <Button variant="outline" size="small" onClick={() => router.push('/citas')}>
              Ver todas
            </Button>
          </div>
          <div className={styles.sectionContent}>
            {stats.citasHoy.detalles.length === 0 ? (
              <div className={styles.emptyState}>
                <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" opacity="0.3">
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                <p>No hay citas programadas para hoy</p>
              </div>
            ) : (
              <div className={styles.citasList}>
                {stats.citasHoy.detalles.map((cita) => (
                  <div
                    key={cita.id}
                    className={styles.citaItem}
                    onClick={() => router.push(`/citas/${cita.id}`)}
                  >
                    <div className={styles.citaTime}>{formatTime(cita.fecha_hora)}</div>
                    <div className={styles.citaInfo}>
                      <p className={styles.citaPaciente}>{cita.paciente}</p>
                      <p className={styles.citaTipo}>{cita.motivo_consulta}</p>
                    </div>
                    <div className={styles.citaEstado}>
                      <span className={getEstadoBadgeClass(cita)}>{getEstadoLabel(cita)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Últimas Consultas */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Últimas Consultas</h2>
            <Button variant="outline" size="small" onClick={() => router.push('/pacientes')}>
              Ver pacientes
            </Button>
          </div>
          <div className={styles.sectionContent}>
            {stats.ultimasConsultas.length === 0 ? (
              <div className={styles.emptyState}>
                <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor" opacity="0.3">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clipRule="evenodd"
                  />
                </svg>
                <p>No hay consultas registradas</p>
              </div>
            ) : (
              <div className={styles.consultasList}>
                {stats.ultimasConsultas.map((consulta) => (
                  <div
                    key={consulta.id}
                    className={styles.consultaItem}
                    onClick={() => router.push(`/pacientes/${consulta.paciente_id}`)}
                  >
                    <div className={styles.consultaInfo}>
                      <p className={styles.consultaPaciente}>{consulta.paciente}</p>
                      <p className={styles.consultaFecha}>{formatDate(consulta.fecha)}</p>
                    </div>
                    <div className={styles.consultaStats}>
                      {consulta.peso && (
                        <span className={styles.consultaStat}>{consulta.peso} kg</span>
                      )}
                      {consulta.imc && (
                        <span className={styles.consultaStat}>IMC: {consulta.imc}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mensajes Pendientes Alert */}
      {stats.mensajesPendientes > 0 && (
        <div className={styles.alertBox}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={styles.alertIcon}
          >
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          <div>
            <p className={styles.alertTitle}>
              {stats.mensajesPendientes} mensaje(s) de confirmación pendiente(s)
            </p>
            <p className={styles.alertText}>
              Hay pacientes que aún no han confirmado su asistencia
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
