'use client'

import { useRouter } from 'next/navigation'
import styles from './Charts.module.css'

interface CitaHoy {
  id: string
  paciente: string
  paciente_id: string
  fecha_hora: string
  estado: string
  estado_confirmacion: string
  motivo_consulta: string
}

interface TodayTimelineProps {
  citas: CitaHoy[]
}

const getStatusColor = (cita: CitaHoy) => {
  if (cita.estado === 'CANCELADA' || cita.estado_confirmacion === 'CANCELADA_PACIENTE')
    return '#ef4444'
  if (cita.estado === 'COMPLETADA') return '#2d9f5d'
  if (cita.estado_confirmacion === 'CONFIRMADA') return '#3b82f6'
  return '#f59e0b'
}

const getStatusLabel = (cita: CitaHoy) => {
  if (cita.estado === 'CANCELADA' || cita.estado_confirmacion === 'CANCELADA_PACIENTE')
    return 'Cancelada'
  if (cita.estado === 'COMPLETADA') return 'Completada'
  if (cita.estado_confirmacion === 'CONFIRMADA') return 'Confirmada'
  if (cita.estado_confirmacion === 'RECORDATORIO_ENVIADO') return 'Esperando'
  return 'Pendiente'
}

export default function TodayTimeline({ citas }: TodayTimelineProps) {
  const router = useRouter()

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Timeline de Hoy</h3>
        <p className={styles.chartSubtitle}>{citas.length} citas programadas</p>
      </div>
      <div className={styles.timelineContent}>
        {citas.length === 0 ? (
          <div className={styles.donutEmpty}>Sin citas programadas hoy</div>
        ) : (
          <div className={styles.timeline}>
            {citas.map((cita, i) => {
              const color = getStatusColor(cita)
              return (
                <div
                  key={cita.id}
                  className={styles.timelineItem}
                  onClick={() => router.push(`/pacientes/${cita.paciente_id}`)}
                >
                  <div className={styles.timelineLeft}>
                    <span
                      className={styles.timelineDot}
                      style={{ backgroundColor: color }}
                    />
                    {i < citas.length - 1 && <span className={styles.timelineLine} />}
                  </div>
                  <div className={styles.timelineBody}>
                    <span className={styles.timelineTime}>{formatTime(cita.fecha_hora)}</span>
                    <span className={styles.timelineName}>{cita.paciente}</span>
                    <span className={styles.timelineMotivo}>{cita.motivo_consulta}</span>
                    <span
                      className={styles.timelineStatus}
                      style={{ color, borderColor: color, backgroundColor: `${color}10` }}
                    >
                      {getStatusLabel(cita)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
