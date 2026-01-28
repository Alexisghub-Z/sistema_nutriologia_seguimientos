'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import PaymentStatusChart from '@/components/dashboard/PaymentStatusChart'
import FinancialMetricsChart from '@/components/dashboard/FinancialMetricsChart'
import styles from './dashboard.module.css'
import chartStyles from '@/components/dashboard/Charts.module.css'

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
  finanzas: {
    rango: string
    fechaInicio: string
    fechaFin: string
    totalConsultas: number
    ingresosDelRango: number
    ingresosDeHoy: number
    promedioConsulta: number
    consultasPagadas: number
    pagosPendientes: {
      cantidad: number
      monto: number
    }
  }
}

type RangoFechas = 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio' | 'personalizado'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [rangoSeleccionado, setRangoSeleccionado] = useState<RangoFechas>('mes')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [mostrarFechasPersonalizadas, setMostrarFechasPersonalizadas] = useState(false)

  const cargarEstadisticas = async (rango: RangoFechas, inicio?: string, fin?: string) => {
    try {
      setLoading(true)
      let url = `/api/dashboard/stats?rango=${rango}`
      if (rango === 'personalizado' && inicio && fin) {
        url += `&fechaInicio=${inicio}&fechaFin=${fin}`
      }

      const res = await fetch(url)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarEstadisticas(rangoSeleccionado, fechaInicio, fechaFin)
  }, [rangoSeleccionado, fechaInicio, fechaFin])

  const handleRangoChange = (nuevoRango: RangoFechas) => {
    setRangoSeleccionado(nuevoRango)
    if (nuevoRango === 'personalizado') {
      setMostrarFechasPersonalizadas(true)
    } else {
      setMostrarFechasPersonalizadas(false)
    }
  }

  const aplicarFechasPersonalizadas = () => {
    if (fechaInicio && fechaFin) {
      cargarEstadisticas('personalizado', fechaInicio, fechaFin)
    }
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

  const formatRangoLabel = () => {
    if (!stats) return ''
    const inicio = new Date(stats.finanzas.fechaInicio)
    const fin = new Date(stats.finanzas.fechaFin)

    return `${inicio.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    })} - ${fin.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`
  }

  const getEstadoBadgeClass = (cita: any) => {
    if (cita.estado === 'CANCELADA' || cita.estado_confirmacion === 'CANCELADA_PACIENTE') {
      return styles.badgeDanger
    }
    if (cita.estado === 'COMPLETADA') {
      return styles.badgeInfo
    }
    if (cita.estado_confirmacion === 'CONFIRMADA') {
      return styles.badgeSuccess
    }
    return styles.badgeWarning
  }

  const getEstadoLabel = (cita: any) => {
    if (cita.estado === 'CANCELADA' || cita.estado_confirmacion === 'CANCELADA_PACIENTE') {
      return 'Cancelada'
    }
    if (cita.estado === 'COMPLETADA') {
      return 'Completada'
    }
    if (cita.estado_confirmacion === 'CONFIRMADA') {
      return 'Confirmada'
    }
    if (cita.estado_confirmacion === 'RECORDATORIO_ENVIADO') {
      return 'Esperando confirmación'
    }
    return 'Pendiente'
  }

  if (loading || !stats) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Cargando...</p>
        </div>
      </div>
    )
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
          <Button variant="outline" size="small" onClick={() => router.push('/pacientes/nuevo')}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
            Nuevo Paciente
          </Button>
        </div>
      </div>

      {/* Selector de Rango */}
      <div className={styles.filterSection}>
        <div className={styles.filterHeader}>
          <h3 className={styles.filterTitle}>Período de Análisis</h3>
          <span className={styles.filterSubtitle}>{formatRangoLabel()}</span>
        </div>
        <div className={styles.rangoButtons}>
          <button
            className={`${styles.rangoButton} ${rangoSeleccionado === 'hoy' ? styles.rangoButtonActive : ''}`}
            onClick={() => handleRangoChange('hoy')}
          >
            Hoy
          </button>
          <button
            className={`${styles.rangoButton} ${rangoSeleccionado === 'semana' ? styles.rangoButtonActive : ''}`}
            onClick={() => handleRangoChange('semana')}
          >
            Última Semana
          </button>
          <button
            className={`${styles.rangoButton} ${rangoSeleccionado === 'mes' ? styles.rangoButtonActive : ''}`}
            onClick={() => handleRangoChange('mes')}
          >
            Este Mes
          </button>
          <button
            className={`${styles.rangoButton} ${rangoSeleccionado === 'trimestre' ? styles.rangoButtonActive : ''}`}
            onClick={() => handleRangoChange('trimestre')}
          >
            Último Trimestre
          </button>
          <button
            className={`${styles.rangoButton} ${rangoSeleccionado === 'anio' ? styles.rangoButtonActive : ''}`}
            onClick={() => handleRangoChange('anio')}
          >
            Este Año
          </button>
          <button
            className={`${styles.rangoButton} ${rangoSeleccionado === 'personalizado' ? styles.rangoButtonActive : ''}`}
            onClick={() => handleRangoChange('personalizado')}
          >
            Personalizado
          </button>
        </div>

        {mostrarFechasPersonalizadas && (
          <div className={styles.fechasPersonalizadas}>
            <div className={styles.fechaInput}>
              <label>Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className={styles.fechaInput}>
              <label>Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <Button size="small" onClick={aplicarFechasPersonalizadas}>
              Aplicar
            </Button>
          </div>
        )}
      </div>

      {/* Stats Grid - Estadísticas Financieras */}
      <div className={styles.sectionDivider}>
        <h2 className={styles.sectionDividerTitle}>Estadísticas Financieras</h2>
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Ingresos del Período</p>
            <p className={styles.statValue}>
              ${stats.finanzas.ingresosDelRango.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={styles.statDetail}>{stats.finanzas.totalConsultas} consultas</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Promedio por Consulta</p>
            <p className={styles.statValue}>
              ${stats.finanzas.promedioConsulta.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={styles.statDetail}>{stats.finanzas.consultasPagadas} pagadas</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Ingresos de Hoy</p>
            <p className={styles.statValue}>
              ${stats.finanzas.ingresosDeHoy.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={styles.statDetail}>
              {formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>

        <div className={`${styles.statCard} ${stats.finanzas.pagosPendientes.cantidad > 0 ? styles.statCardWarning : ''}`}>
          <div className={styles.statIconContainer}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Pagos Pendientes</p>
            <p className={styles.statValue}>{stats.finanzas.pagosPendientes.cantidad}</p>
            <p className={styles.statDetail}>
              ${stats.finanzas.pagosPendientes.monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Gráficas Financieras */}
      <div className={chartStyles.chartsGrid}>
        <FinancialMetricsChart
          ingresosDelRango={stats.finanzas.ingresosDelRango}
          ingresosDeHoy={stats.finanzas.ingresosDeHoy}
          promedioConsulta={stats.finanzas.promedioConsulta}
          pagosPendientesMonto={stats.finanzas.pagosPendientes.monto}
        />
        <PaymentStatusChart
          consultasPagadas={stats.finanzas.consultasPagadas}
          pagosPendientesCantidad={stats.finanzas.pagosPendientes.cantidad}
          pagosPendientesMonto={stats.finanzas.pagosPendientes.monto}
          ingresosDelRango={stats.finanzas.ingresosDelRango}
        />
      </div>

      {/* Stats Grid - Estadísticas Generales */}
      <div className={styles.sectionDivider}>
        <h2 className={styles.sectionDividerTitle}>Estadísticas Generales</h2>
      </div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Total Pacientes</p>
            <p className={styles.statValue}>{stats.totalPacientes}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Citas Hoy</p>
            <p className={styles.statValue}>{stats.citasHoy.total}</p>
            <p className={styles.statDetail}>
              {stats.citasHoy.confirmadas} confirmadas · {stats.citasHoy.pendientes} pendientes
            </p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Consultas este Mes</p>
            <p className={styles.statValue}>{stats.consultasEsteMes}</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIconContainer}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
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
