'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Charts.module.css'

interface Deudor {
  nombre: string
  paciente_id: string
  monto: number
  consultas: number
}

interface PagosPendientesCardProps {
  cantidad: number
  monto: number
  deudores: Deudor[]
  flashKey?: number
}

const MAX_VISIBLE = 2

export default function PagosPendientesCard({ cantidad, monto, deudores, flashKey }: PagosPendientesCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [flashing, setFlashing] = useState(false)
  const prevFlashKey = useRef(flashKey)

  useEffect(() => {
    if (flashKey !== undefined && prevFlashKey.current !== undefined && flashKey !== prevFlashKey.current) {
      setFlashing(true)
      const timer = setTimeout(() => setFlashing(false), 600)
      return () => clearTimeout(timer)
    }
    prevFlashKey.current = flashKey
  }, [flashKey])

  const formatMoney = (n: number) =>
    '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const color = cantidad > 0 ? '#f59e0b' : '#2d9f5d'
  const visibles = deudores.slice(0, MAX_VISIBLE)
  const restantes = deudores.length - MAX_VISIBLE

  return (
    <div className={`${styles.kpiCard} ${flashing ? styles.kpiCardFlash : ''}`}>
      <p className={styles.kpiLabel}>Pagos Pendientes</p>
      <div className={styles.kpiBody}>
        <p className={styles.kpiValue}>{cantidad}</p>
      </div>
      <div className={styles.kpiSeparator} />
      <div className={styles.kpiFooter}>
        <span className={styles.kpiDetail}>{formatMoney(monto)}</span>
        <span className={styles.kpiTrend} style={{ color }}>
          <span className={styles.kpiTrendDot} style={{ backgroundColor: color }} />
          {cantidad === 0 ? 'Al día' : `${cantidad} consulta${cantidad > 1 ? 's' : ''}`}
        </span>
      </div>

      {deudores.length > 0 && (
        <>
          <div className={styles.kpiSeparator} />
          <div className={styles.deudoresList}>
            {visibles.map((d) => (
              <div
                key={d.paciente_id}
                className={styles.deudorItem}
                onClick={() => router.push(`/pacientes/${d.paciente_id}`)}
              >
                <span className={styles.deudorNombre}>{d.nombre}</span>
                <span className={styles.deudorMonto}>{formatMoney(d.monto)}</span>
              </div>
            ))}
            {restantes > 0 && !expanded && (
              <button
                className={styles.deudorVerMas}
                onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
              >
                +{restantes} más
              </button>
            )}
            {expanded && deudores.slice(MAX_VISIBLE).map((d) => (
              <div
                key={d.paciente_id}
                className={styles.deudorItem}
                onClick={() => router.push(`/pacientes/${d.paciente_id}`)}
              >
                <span className={styles.deudorNombre}>{d.nombre}</span>
                <span className={styles.deudorMonto}>{formatMoney(d.monto)}</span>
              </div>
            ))}
            {expanded && (
              <button
                className={styles.deudorVerMas}
                onClick={(e) => { e.stopPropagation(); setExpanded(false) }}
              >
                Ver menos
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
