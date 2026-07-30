'use client'

import { useEffect, useState } from 'react'
import KpiCard from '@/components/dashboard/KpiCard'
import chartStyles from '@/components/dashboard/Charts.module.css'
import DietasAreaChart from './DietasAreaChart'
import DietasTimeline from './DietasTimeline'
import styles from './ResumenDietas.module.css'

/** Una fila de las tablas del resumen. */
export interface FilaResumen {
  id: string
  cuadro_id: string
  paciente_id: string
  paciente: string
  email: string
  modo: 'DIETA' | 'RECETARIO'
  estado: 'BORRADOR' | 'FINALIZADA'
  kcal_meta: number
  objetivo: string
  createdAt: string
  updatedAt: string
  dias_sin_tocar: number
}

export interface PuntoMes {
  label: string
  dietas: number
  cuadros: number
}

export interface ResumenDietasData {
  metricas: {
    dietasEsteMes: number
    dietasDelta: number | null
    pacientesConDieta: number
    totalPacientes: number
    dietasFinalizadas: number
    dietasBorrador: number
    kcalPromedio: number | null
    imcPromedio: number | null
  }
  serieMensual: PuntoMes[]
  ultimasDietas: FilaResumen[]
  borradores: FilaResumen[]
}

interface Props {
  /** Abre el cuadro de esa dieta: selecciona al paciente y repuebla la pantalla. */
  onAbrir: (paciente: { id: string; nombre: string; email: string }, cuadroId: string) => void
}

/**
 * Panel de resumen de la sección de dietas: se muestra al entrar, mientras no
 * hay un paciente seleccionado. Carga sus propios datos al montarse, así que
 * al volver del trabajo con un paciente se refresca solo.
 */
export default function ResumenDietas({ onAbrir }: Props) {
  const [datos, setDatos] = useState<ResumenDietasData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let vigente = true
    fetch('/api/dietas/resumen')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('fallo'))))
      .then((data: ResumenDietasData) => {
        if (vigente) setDatos(data)
      })
      .catch(() => {
        if (vigente) setError(true)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  if (cargando) return <Esqueleto />
  // El resumen es informativo: si falla, mejor no mostrar nada que un error.
  if (error || !datos) return null

  const m = datos.metricas
  const abrir = (f: FilaResumen) =>
    onAbrir({ id: f.paciente_id, nombre: f.paciente, email: f.email }, f.cuadro_id)

  // Series para los sparklines de las tarjetas (últimos 6 meses).
  const serieDietas = datos.serieMensual.map((s) => s.dietas)
  const serieCuadros = datos.serieMensual.map((s) => s.cuadros)

  return (
    <div className={styles.resumen}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Resumen de dietas</h2>
        <p className={styles.subtitulo}>Tu trabajo de un vistazo</p>
      </div>

      <div className={chartStyles.kpiRow}>
        <KpiCard
          accent
          label="Dietas este mes"
          value={String(m.dietasEsteMes)}
          detail={m.dietasEsteMes === 0 ? 'Ninguna todavía' : 'Creadas en el mes en curso'}
          delta={m.dietasDelta}
          color="#2d9f5d"
          sparklineData={serieDietas}
        />
        <KpiCard
          accent
          label="Pacientes con dieta"
          value={String(m.pacientesConDieta)}
          detail={`de ${m.totalPacientes} pacientes`}
          color="#3b82f6"
          sparklineData={serieCuadros}
        />
        <KpiCard
          accent
          label="Dietas definitivas"
          value={String(m.dietasFinalizadas)}
          detail={
            m.dietasBorrador === 0
              ? 'Sin borradores pendientes'
              : `${m.dietasBorrador} ${m.dietasBorrador === 1 ? 'borrador' : 'borradores'} por cerrar`
          }
          color="#f59e0b"
        />
        <KpiCard
          accent
          label="Kcal meta promedio"
          value={m.kcalPromedio != null ? m.kcalPromedio.toLocaleString('es-MX') : '—'}
          detail={
            m.imcPromedio != null ? `IMC promedio ${m.imcPromedio}` : 'Sin cuadros registrados'
          }
          color="#8b5cf6"
        />
      </div>

      {/* Gráfica principal + actividad reciente, como en el dashboard */}
      <div className={chartStyles.mainChartsRow}>
        <DietasAreaChart data={datos.serieMensual} />
        <DietasTimeline dietas={datos.ultimasDietas} onAbrir={onAbrir} />
      </div>

      <div className={styles.panelAncho}>
        {/* Borradores pendientes de cerrar */}
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitulo}>Borradores por cerrar</h3>
            {datos.borradores.length > 0 && (
              <span className={styles.panelConteo}>{m.dietasBorrador} en total</span>
            )}
          </div>
          {datos.borradores.length === 0 ? (
            <div className={styles.vacio}>
              <svg
                className={styles.vacioIconoOk}
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className={styles.vacioTexto}>Sin borradores pendientes</p>
              <p className={styles.vacioPista}>Todas tus dietas están finalizadas</p>
            </div>
          ) : (
            <div className={styles.tablaWrap}>
              <table className={chartStyles.dashTable}>
                <thead className={chartStyles.dashTableHead}>
                  <tr>
                    <th>Paciente</th>
                    <th>Kcal</th>
                    <th>Sin tocar</th>
                  </tr>
                </thead>
                <tbody className={chartStyles.dashTableBody}>
                  {datos.borradores.map((d) => (
                    <tr
                      key={d.id}
                      className={styles.filaClicable}
                      onClick={() => abrir(d)}
                      title="Retomar este borrador"
                    >
                      <td className={styles.paciente}>{d.paciente}</td>
                      <td className={chartStyles.dashTableMuted}>{d.kcal_meta}</td>
                      <td
                        className={
                          d.dias_sin_tocar >= 7 ? styles.diasAlerta : chartStyles.dashTableMuted
                        }
                      >
                        {d.dias_sin_tocar === 0 ? 'Hoy' : `${d.dias_sin_tocar} d`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/** Esqueleto de carga con la misma geometría que el resumen ya cargado. */
function Esqueleto() {
  return (
    <div className={styles.resumen} aria-hidden>
      <div className={styles.header}>
        <h2 className={styles.titulo}>Resumen de dietas</h2>
      </div>
      <div className={chartStyles.kpiRow}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.skelCard}>
            <div className={`${styles.skelLinea} ${styles.skelCorta}`} />
            <div className={`${styles.skelLinea} ${styles.skelMedia}`} />
            <div className={`${styles.skelLinea} ${styles.skelCorta}`} />
          </div>
        ))}
      </div>
      {/* Fila de gráficas: la grande y la de actividad */}
      <div className={chartStyles.mainChartsRow}>
        {[0, 1].map((i) => (
          <div key={i} className={`${styles.skelPanel} ${styles.skelGrafica}`}>
            <div className={`${styles.skelLinea} ${styles.skelCorta}`} />
            <div className={styles.skelBloque} />
          </div>
        ))}
      </div>
      <div className={styles.panelAncho}>
        <div className={styles.skelPanel}>
          <div className={`${styles.skelLinea} ${styles.skelCorta}`} />
          <div className={styles.skelLinea} />
          <div className={`${styles.skelLinea} ${styles.skelMedia}`} />
        </div>
      </div>
    </div>
  )
}
