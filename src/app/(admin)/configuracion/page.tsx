'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, ReactElement } from 'react'
import styles from './configuracion.module.css'

interface ConfigSection {
  title: string
  description: string
  icon: ReactElement
  href: string
}

interface RecursosData {
  disco: { total: number; usado: number; libre: number; porcentaje: number }
  ram: { total: number; usado: number; libre: number; porcentaje: number }
  cpu: { carga1m: number; carga5m: number; carga15m: number }
}

function BarraUso({ porcentaje }: { porcentaje: number }) {
  const color =
    porcentaje >= 85 ? styles.barraRoja : porcentaje >= 60 ? styles.barraAmarilla : styles.barraVerde
  return (
    <div className={styles.barraFondo}>
      <div className={`${styles.barraRelleno} ${color}`} style={{ width: `${Math.min(porcentaje, 100)}%` }} />
    </div>
  )
}

export default function ConfiguracionPage() {
  const [recursos, setRecursos] = useState<RecursosData | null>(null)
  const [loadingRecursos, setLoadingRecursos] = useState(true)

  const cargarRecursos = useCallback(() => {
    setLoadingRecursos(true)
    fetch('/api/sistema/recursos')
      .then((r) => r.json())
      .then((data) => { setRecursos(data); setLoadingRecursos(false) })
      .catch(() => setLoadingRecursos(false))
  }, [])

  useEffect(() => { cargarRecursos() }, [cargarRecursos])

  const sections: ConfigSection[] = [
    {
      title: 'Configuración del Calendario',
      description:
        'Configura horarios de atención, días laborales y disponibilidad para agendar citas',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      href: '/configuracion/calendario',
    },
    {
      title: 'Google Calendar',
      description:
        'Sincroniza automáticamente tus citas con Google Calendar para tener recordatorios personales',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
        </svg>
      ),
      href: '/configuracion/google-calendar',
    },
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Configuración</h1>
        <p className={styles.subtitle}>
          Personaliza y configura los diferentes aspectos de tu sistema de gestión
        </p>
      </div>

      <div className={styles.grid}>
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className={styles.configCard}>
            <div className={styles.cardIcon}>{section.icon}</div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{section.title}</h3>
              <p className={styles.cardDescription}>{section.description}</p>
            </div>
            <div className={styles.cardArrow}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 4l6 6-6 6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* Recursos del Servidor */}
      <div className={styles.recursosCard}>
        <div className={styles.recursosHeader}>
          <div className={styles.recursosTitulo}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <h3>Recursos del Servidor</h3>
          </div>
          <button onClick={cargarRecursos} className={styles.recursosRefresh} disabled={loadingRecursos} title="Actualizar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loadingRecursos ? styles.girando : ''}>
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
          </button>
        </div>

        {loadingRecursos ? (
          <div className={styles.recursosLoading}>Cargando...</div>
        ) : recursos && !('error' in recursos) ? (
          <div className={styles.recursosGrid}>
            <div className={styles.metrica}>
              <div className={styles.metricaHeader}>
                <span className={styles.metricaLabel}>Almacenamiento</span>
                <span className={styles.metricaPct}>{recursos.disco.porcentaje}%</span>
              </div>
              <BarraUso porcentaje={recursos.disco.porcentaje} />
              <span className={styles.metricaValor}>{recursos.disco.usado} GB usados de {recursos.disco.total} GB</span>
            </div>

            <div className={styles.metrica}>
              <div className={styles.metricaHeader}>
                <span className={styles.metricaLabel}>Memoria RAM</span>
                <span className={styles.metricaPct}>{recursos.ram.porcentaje}%</span>
              </div>
              <BarraUso porcentaje={recursos.ram.porcentaje} />
              <span className={styles.metricaValor}>{recursos.ram.usado} MB usados de {recursos.ram.total} MB</span>
            </div>

            <div className={styles.metrica}>
              <div className={styles.metricaHeader}>
                <span className={styles.metricaLabel}>Carga CPU</span>
                <span className={styles.metricaPct}>{recursos.cpu.carga1m.toFixed(2)}</span>
              </div>
              <BarraUso porcentaje={Math.min(recursos.cpu.carga1m * 100, 100)} />
              <span className={styles.metricaValor}>1 min · 5 min: {recursos.cpu.carga5m.toFixed(2)} · 15 min: {recursos.cpu.carga15m.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className={styles.recursosError}>No se pudo obtener información del servidor</div>
        )}
      </div>
    </div>
  )
}
