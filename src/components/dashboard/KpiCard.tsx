'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './Charts.module.css'

interface KpiCardProps {
  label: string
  value: string
  detail?: string
  delta?: number | null
  color: string
  sparklineData?: number[]
  flashKey?: number
}

export default function KpiCard({ label, value, detail, delta, color, sparklineData, flashKey }: KpiCardProps) {
  const showDelta = delta !== null && delta !== undefined
  const maxSparkline = sparklineData ? Math.max(...sparklineData, 1) : 1
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

  return (
    <div className={`${styles.kpiCard} ${flashing ? styles.kpiCardFlash : ''}`}>
      <p className={styles.kpiLabel}>{label}</p>
      <div className={styles.kpiBody}>
        <p className={styles.kpiValue}>{value}</p>
        {sparklineData && sparklineData.length > 0 && (
          <div className={styles.sparkline}>
            {sparklineData.map((val, i) => {
              const height = Math.max((val / maxSparkline) * 36, 4)
              const opacity = 0.3 + (i / (sparklineData.length - 1 || 1)) * 0.7
              return (
                <div
                  key={i}
                  className={styles.sparklineBar}
                  style={{
                    height: `${height}px`,
                    backgroundColor: color,
                    opacity,
                  }}
                />
              )
            })}
          </div>
        )}
      </div>
      <div className={styles.kpiSeparator} />
      <div className={styles.kpiFooter}>
        {detail && <span className={styles.kpiDetail}>{detail}</span>}
        {showDelta && (
          <span
            className={`${styles.kpiTrend} ${
              delta > 0 ? styles.kpiTrendUp : delta < 0 ? styles.kpiTrendDown : styles.kpiTrendNeutral
            }`}
          >
            <span className={styles.kpiTrendDot} />
            {delta > 0 ? '+' : ''}{delta}%
          </span>
        )}
      </div>
    </div>
  )
}
