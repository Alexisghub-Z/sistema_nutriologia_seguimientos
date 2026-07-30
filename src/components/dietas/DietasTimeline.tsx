'use client'

import styles from '@/components/dashboard/Charts.module.css'

interface ItemTimeline {
  id: string
  cuadro_id: string
  paciente_id: string
  paciente: string
  email: string
  modo: 'DIETA' | 'RECETARIO'
  estado: 'BORRADOR' | 'FINALIZADA'
  kcal_meta: number
  createdAt: string
}

interface Props {
  dietas: ItemTimeline[]
  onAbrir: (paciente: { id: string; nombre: string; email: string }, cuadroId: string) => void
}

/** Verde para las definitivas, ámbar para los borradores (misma semántica que el resto). */
const colorDe = (estado: ItemTimeline['estado']) =>
  estado === 'FINALIZADA' ? '#2d9f5d' : '#f59e0b'

/**
 * Actividad reciente de dietas, con el mismo formato de línea de tiempo que el
 * dashboard principal. Cada elemento abre su cuadro al pulsarlo.
 */
export default function DietasTimeline({ dietas, onAbrir }: Props) {
  const formatearFecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Actividad reciente</h3>
        <p className={styles.chartSubtitle}>
          {dietas.length === 0
            ? 'Sin dietas todavía'
            : `Últimas ${dietas.length === 1 ? 'dieta' : `${dietas.length} dietas`}`}
        </p>
      </div>
      <div className={styles.timelineContent}>
        {dietas.length === 0 ? (
          <div className={styles.donutEmpty}>Busca un paciente para crear la primera</div>
        ) : (
          <div className={styles.timeline}>
            {dietas.map((d, i) => {
              const color = colorDe(d.estado)
              return (
                <div
                  key={d.id}
                  className={styles.timelineItem}
                  onClick={() =>
                    onAbrir({ id: d.paciente_id, nombre: d.paciente, email: d.email }, d.cuadro_id)
                  }
                  title="Abrir esta dieta"
                >
                  <div className={styles.timelineLeft}>
                    <span className={styles.timelineDot} style={{ backgroundColor: color }} />
                    {i < dietas.length - 1 && <span className={styles.timelineLine} />}
                  </div>
                  <div className={styles.timelineBody}>
                    <span className={styles.timelineTime}>{formatearFecha(d.createdAt)}</span>
                    <span className={styles.timelineName}>{d.paciente}</span>
                    <span className={styles.timelineMotivo}>
                      {d.modo === 'RECETARIO' ? 'Recetario' : 'Dieta precisa'} · {d.kcal_meta} kcal
                    </span>
                    <span
                      className={styles.timelineStatus}
                      style={{ color, borderColor: color, backgroundColor: `${color}10` }}
                    >
                      {d.estado === 'FINALIZADA' ? 'Definitiva' : 'Borrador'}
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
