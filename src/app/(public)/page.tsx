'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function Home() {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const buscarCita = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/citas/codigo/${codigo}`)

      if (response.ok) {
        router.push(`/cita/${codigo}`)
      } else {
        setError('Código de cita no encontrado')
      }
    } catch (err) {
      setError('Error al buscar la cita')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.title}>Consultorio Dr. Paul</h1>
        <p className={styles.subtitle}>Tu salud nutricional es nuestra prioridad</p>
      </section>

      {/* Calendario Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Agenda tu Cita</h2>
          <div className={styles.calendarCard}>
            <p className={styles.comingSoon}>
              📅 Reserva tu cita en línea
            </p>
            <p className={styles.contactInfo}>
              Elige fecha y hora disponible de forma rápida y segura
            </p>
            <button
              onClick={() => router.push('/agendar')}
              className={styles.agendarButton}
            >
              Agendar Ahora
            </button>
          </div>
        </div>
      </section>

      {/* Buscar Cita por Código */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>¿Ya tienes una cita?</h2>
          <div className={styles.codigoCard}>
            <p className={styles.codigoDescription}>
              Ingresa tu código de cita para ver detalles, cancelar o reagendar
            </p>

            <form onSubmit={buscarCita} className={styles.codigoForm}>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ej: ABC123DE"
                className={styles.codigoInput}
                maxLength={8}
                required
              />
              <button
                type="submit"
                className={styles.codigoButton}
                disabled={loading || codigo.length < 6}
              >
                {loading ? 'Buscando...' : 'Buscar Cita'}
              </button>
            </form>

            {error && <p className={styles.error}>{error}</p>}
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className={styles.infoSection}>
        <div className={styles.container}>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <span className={styles.icon}>📍</span>
              <h3>Ubicación</h3>
              <p>Oaxaca, México</p>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.icon}>📞</span>
              <h3>Contacto</h3>
              <p>(951) 123-4567</p>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.icon}>⏰</span>
              <h3>Horario</h3>
              <p>Lun - Vie: 9:00 - 18:00</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
