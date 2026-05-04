'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'
import KpiCard from '@/components/dashboard/KpiCard'
import RevenueAreaChart from '@/components/dashboard/RevenueAreaChart'
import AppointmentStatusDonut from '@/components/dashboard/AppointmentStatusDonut'
import ConsultationsBarChart from '@/components/dashboard/ConsultationsBarChart'
import PatientGrowthChart from '@/components/dashboard/PatientGrowthChart'
import TodayTimeline from '@/components/dashboard/TodayTimeline'
import PagosPendientesCard from '@/components/dashboard/PagosPendientesCard'
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
      paciente_id: string
      telefono: string
      fecha_hora: string
      estado: string
      estado_confirmacion: string
      motivo_consulta: string
    }>
  }
  citasPeriodo: {
    total: number
    completadas: number
    confirmadas: number
    pendientes: number
    canceladas: number
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
    estado_pago: string | null
    monto_consulta: number | null
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
      deudores: Array<{
        nombre: string
        paciente_id: string
        monto: number
        consultas: number
      }>
    }
  }
  tendenciaIngresosMensual: Array<{ mes: string; ingresos: number; consultas: number }>
  tendenciaCitasSemanal: Array<{ semana: string; total: number; completadas: number; canceladas: number }>
  crecimientoPacientes: Array<{ mes: string; nuevos: number; total: number }>
  comparacion: {
    ingresosDelta: number
    consultasDelta: number
    asistenciaDelta: number
  }
  pacientesInactivos: {
    dias: number
    lista: Array<{
      id: string
      nombre: string
      telefono: string
      ultima_consulta: string | null
      dias_inactivo: number
      nunca_ha_venido: boolean
    }>
  }
}

type RangoFechas = 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio' | 'personalizado'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [rangoSeleccionado, setRangoSeleccionado] = useState<RangoFechas>('mes')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [mostrarFechasPersonalizadas, setMostrarFechasPersonalizadas] = useState(false)
  const [googleCalendarDesconectado, setGoogleCalendarDesconectado] = useState(false)
  const [flashKey, setFlashKey] = useState(0)
  const [diasInactividad, setDiasInactividad] = useState(180)

  useEffect(() => {
    fetch('/api/google-calendar/status')
      .then(res => res.json())
      .then(data => {
        if (!data.configured) setGoogleCalendarDesconectado(true)
      })
      .catch(() => setGoogleCalendarDesconectado(true))
  }, [])

  const cargarEstadisticas = async (rango: RangoFechas, inicio?: string, fin?: string, dias?: number) => {
    try {
      let url = `/api/dashboard/stats?rango=${rango}&diasInactividad=${dias ?? diasInactividad}`
      if (rango === 'personalizado' && inicio && fin) {
        url += `&fechaInicio=${inicio}&fechaFin=${fin}`
      }
      const res = await fetch(url)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  useEffect(() => {
    cargarEstadisticas('mes')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDiasInactividadChange = async (dias: number) => {
    setDiasInactividad(dias)
    await cargarEstadisticas(
      rangoSeleccionado,
      rangoSeleccionado === 'personalizado' ? fechaInicio : undefined,
      rangoSeleccionado === 'personalizado' ? fechaFin : undefined,
      dias
    )
  }

  const handleRangoChange = async (nuevoRango: RangoFechas) => {
    setRangoSeleccionado(nuevoRango)
    if (nuevoRango === 'personalizado') {
      setMostrarFechasPersonalizadas(true)
    } else {
      setMostrarFechasPersonalizadas(false)
      await cargarEstadisticas(nuevoRango)
      setFlashKey(k => k + 1)
    }
  }

  const aplicarFechasPersonalizadas = async () => {
    if (fechaInicio && fechaFin) {
      await cargarEstadisticas('personalizado', fechaInicio, fechaFin)
      setFlashKey(k => k + 1)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }

  const formatRangoLabel = () => {
    if (!stats) return ''
    const inicio = new Date(stats.finanzas.fechaInicio)
    const fin = new Date(stats.finanzas.fechaFin)
    return `${inicio.toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', timeZone: 'UTC',
    })} - ${fin.toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    })}`
  }

  const formatMoney = (n: number) =>
    '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const getEstadoBadgeClass = (cita: any) => {
    if (cita.estado === 'CANCELADA' || cita.estado_confirmacion === 'CANCELADA_PACIENTE')
      return styles.badgeDanger
    if (cita.estado === 'COMPLETADA') return styles.badgeInfo
    if (cita.estado_confirmacion === 'CONFIRMADA') return styles.badgeSuccess
    return styles.badgeWarning
  }

  const getEstadoLabel = (cita: any) => {
    if (cita.estado === 'CANCELADA' || cita.estado_confirmacion === 'CANCELADA_PACIENTE')
      return 'Cancelada'
    if (cita.estado === 'COMPLETADA') return 'Completada'
    if (cita.estado_confirmacion === 'CONFIRMADA') return 'Confirmada'
    if (cita.estado_confirmacion === 'RECORDATORIO_ENVIADO') return 'Esperando confirmación'
    return 'Pendiente'
  }

  const getPaymentBadgeClass = (estado: string | null) => {
    if (estado === 'PAGADO') return chartStyles.paymentBadgePagado
    if (estado === 'PARCIAL') return chartStyles.paymentBadgeParcial
    return chartStyles.paymentBadgePendiente
  }

  const getPaymentLabel = (estado: string | null) => {
    if (estado === 'PAGADO') return 'Pagado'
    if (estado === 'PARCIAL') return 'Parcial'
    return 'Pendiente'
  }

  if (!stats) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <p className={styles.greeting}>Bienvenido, <span className={styles.greetingName}>{session?.user?.name || 'Doctor'}</span></p>
        </div>
      </div>
    )
  }

  const ingresosSparkline = stats.tendenciaIngresosMensual.map(d => d.ingresos)
  const consultasSparkline = stats.tendenciaCitasSemanal.map(d => d.total)
  const pacientesSparkline = stats.crecimientoPacientes.map(d => d.nuevos)

  return (
    <div className={styles.container}>
      {/* Header — Breadcrumb style */}
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.greeting}>Bienvenido, <span className={styles.greetingName}>{session?.user?.name || 'Doctor'}</span></p>
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

      {/* Alerta Google Calendar desconectado */}
      {googleCalendarDesconectado && (
        <div className={styles.gcalAlert} onClick={() => router.push('/configuracion/google-calendar')}>
          <div className={styles.gcalAlertContent}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className={styles.gcalAlertTitle}>Google Calendar desconectado</p>
              <p className={styles.gcalAlertText}>Las citas no se están sincronizando. Haz clic aquí para reconectar.</p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}

      {/* Selector de Rango */}
      <div className={styles.filterRow}>
        <div className={styles.filterLeft}>
          <label className={styles.filterLabel}>Período</label>
          <select
            className={styles.rangoSelect}
            value={rangoSeleccionado}
            onChange={(e) => handleRangoChange(e.target.value as RangoFechas)}
          >
            <option value="hoy">Hoy</option>
            <option value="semana">Última Semana</option>
            <option value="mes">Este Mes</option>
            <option value="trimestre">Último Trimestre</option>
            <option value="anio">Este Año</option>
            <option value="personalizado">Personalizado</option>
          </select>
          <span className={styles.filterSubtitle}>{formatRangoLabel()}</span>
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

      {/* Fila KPI — dependen del período seleccionado */}
      <div className={chartStyles.kpiRow}>
        <KpiCard
          label="Ingresos del Período"
          value={formatMoney(stats.finanzas.ingresosDelRango)}
          detail={`${stats.finanzas.totalConsultas} consultas`}
          delta={stats.comparacion.ingresosDelta}
          color="#2d9f5d"
          sparklineData={ingresosSparkline}
          flashKey={flashKey}
        />
        <KpiCard
          label="Consultas del Período"
          value={stats.finanzas.totalConsultas.toString()}
          detail="En el rango seleccionado"
          delta={stats.comparacion.consultasDelta}
          color="#2d9f5d"
          flashKey={flashKey}
        />
        <KpiCard
          label="Promedio/Consulta"
          value={formatMoney(stats.finanzas.promedioConsulta)}
          detail={`${stats.finanzas.consultasPagadas} pagadas`}
          delta={null}
          color="#247a47"
          flashKey={flashKey}
        />
        <PagosPendientesCard
          cantidad={stats.finanzas.pagosPendientes.cantidad}
          monto={stats.finanzas.pagosPendientes.monto}
          deudores={stats.finanzas.pagosPendientes.deudores}
          flashKey={flashKey}
        />
      </div>

      {/* Fila KPI — datos generales (no dependen del período) */}
      <div className={chartStyles.kpiRow}>
        <KpiCard
          label="Ingresos de Hoy"
          value={formatMoney(stats.finanzas.ingresosDeHoy)}
          detail={formatDate(new Date().toISOString())}
          delta={null}
          color="#4db87a"
        />
        <KpiCard
          label="Total Pacientes"
          value={stats.totalPacientes.toString()}
          detail={`${stats.consultasEsteMes} consultas este mes`}
          delta={null}
          color="#3b82f6"
          sparklineData={pacientesSparkline}
        />
        <KpiCard
          label="Tasa de Asistencia"
          value={`${stats.tasaAsistencia}%`}
          detail="Últimos 30 días"
          delta={stats.comparacion.asistenciaDelta}
          color="#2d9f5d"
          sparklineData={consultasSparkline}
        />
      </div>

      {/* Gráficas principales: Area chart + Donut */}
      <div className={chartStyles.mainChartsRow}>
        <RevenueAreaChart data={stats.tendenciaIngresosMensual} />
        <AppointmentStatusDonut
          hoy={{
            completadas: stats.citasHoy.completadas,
            confirmadas: stats.citasHoy.confirmadas,
            pendientes: stats.citasHoy.pendientes,
            canceladas: stats.citasHoy.canceladas,
          }}
          periodo={{
            completadas: stats.citasPeriodo.completadas,
            confirmadas: stats.citasPeriodo.confirmadas,
            pendientes: stats.citasPeriodo.pendientes,
            canceladas: stats.citasPeriodo.canceladas,
          }}
        />
      </div>

      {/* Gráficas secundarias + Timeline */}
      <div className={chartStyles.secondaryRow}>
        <ConsultationsBarChart data={stats.tendenciaCitasSemanal} />
        <PatientGrowthChart data={stats.crecimientoPacientes} />
        <TodayTimeline citas={stats.citasHoy.detalles} />
      </div>

      {/* Tablas enterprise: Últimas consultas + Citas de hoy */}
      <div className={chartStyles.tablesRow}>
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
                <p>No hay consultas registradas</p>
              </div>
            ) : (
              <table className={chartStyles.dashTable}>
                <thead className={chartStyles.dashTableHead}>
                  <tr>
                    <th>Paciente</th>
                    <th>Fecha</th>
                    <th>Peso</th>
                    <th>Monto</th>
                    <th>Pago</th>
                  </tr>
                </thead>
                <tbody className={chartStyles.dashTableBody}>
                  {stats.ultimasConsultas.map((consulta) => (
                    <tr
                      key={consulta.id}
                      onClick={() => router.push(`/pacientes/${consulta.paciente_id}`)}
                    >
                      <td>{consulta.paciente}</td>
                      <td className={chartStyles.dashTableMuted}>{formatDate(consulta.fecha)}</td>
                      <td>{consulta.peso != null && consulta.peso > 0 ? `${consulta.peso} kg` : '—'}</td>
                      <td>{consulta.monto_consulta != null ? formatMoney(consulta.monto_consulta) : '—'}</td>
                      <td>
                        <span className={getPaymentBadgeClass(consulta.estado_pago)}>
                          {getPaymentLabel(consulta.estado_pago)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

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
                <p>No hay citas programadas para hoy</p>
              </div>
            ) : (
              <table className={chartStyles.dashTable}>
                <thead className={chartStyles.dashTableHead}>
                  <tr>
                    <th>Hora</th>
                    <th>Paciente</th>
                    <th>Motivo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody className={chartStyles.dashTableBody}>
                  {stats.citasHoy.detalles.map((cita) => (
                    <tr
                      key={cita.id}
                      onClick={() => router.push(`/pacientes/${cita.paciente_id}`)}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{formatTime(cita.fecha_hora)}</td>
                      <td>{cita.paciente}</td>
                      <td className={chartStyles.dashTableMuted}>{cita.motivo_consulta}</td>
                      <td>
                        <span className={getEstadoBadgeClass(cita)}>{getEstadoLabel(cita)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Pacientes Inactivos */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Pacientes Inactivos
            {stats.pacientesInactivos.lista.length > 0 && (
              <span className={styles.sectionBadge}>{stats.pacientesInactivos.lista.length}</span>
            )}
          </h2>
          <div className={styles.sectionHeaderActions}>
            <select
              className={styles.rangoSelect}
              value={diasInactividad}
              onChange={(e) => handleDiasInactividadChange(Number(e.target.value))}
            >
              <option value={30}>Sin consulta +30 días</option>
              <option value={60}>Sin consulta +60 días</option>
              <option value={90}>Sin consulta +90 días</option>
              <option value={180}>Sin consulta +6 meses</option>
            </select>
          </div>
        </div>
        <div className={styles.sectionContent}>
          {stats.pacientesInactivos.lista.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Todos los pacientes han tenido consulta reciente</p>
            </div>
          ) : (
            <table className={chartStyles.dashTable}>
              <thead className={chartStyles.dashTableHead}>
                <tr>
                  <th>Paciente</th>
                  <th>Última consulta</th>
                  <th>Días inactivo</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody className={chartStyles.dashTableBody}>
                {stats.pacientesInactivos.lista.map((p) => {
                  const urgencia =
                    p.dias_inactivo >= 90
                      ? styles.diasBadgeDanger
                      : p.dias_inactivo >= 60
                      ? styles.diasBadgeWarning
                      : styles.diasBadgeInfo
                  const telefonoDigits = (p.telefono || '').replace(/\D/g, '')
                  const waHref = telefonoDigits
                    ? `https://wa.me/${telefonoDigits.startsWith('52') ? telefonoDigits : '52' + telefonoDigits}`
                    : '#'
                  return (
                    <tr key={p.id}>
                      <td>
                        <span
                          className={styles.pacienteLink}
                          onClick={() => router.push(`/pacientes/${p.id}`)}
                        >
                          {p.nombre}
                        </span>
                      </td>
                      <td className={chartStyles.dashTableMuted}>
                        {p.nunca_ha_venido ? 'Nunca ha asistido' : p.ultima_consulta ? formatDate(p.ultima_consulta) : '—'}
                      </td>
                      <td>
                        <span className={`${styles.diasBadge} ${urgencia}`}>
                          {p.dias_inactivo} días
                        </span>
                      </td>
                      <td>
                        <div className={styles.inactiveActions}>
                          <button
                            className={styles.actionBtn}
                            onClick={() => router.push(`/pacientes/${p.id}`)}
                            title="Ver expediente"
                          >
                            Expediente
                          </button>
                          <a
                            className={`${styles.actionBtn} ${styles.actionBtnWa}`}
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enviar WhatsApp"
                          >
                            WhatsApp
                          </a>
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                            onClick={() => router.push(`/pacientes/${p.id}?accion=agendar`)}
                            title="Agendar cita"
                          >
                            Agendar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
