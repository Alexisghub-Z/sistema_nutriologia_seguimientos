'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './mis-citas.module.css'

export default function MisCitasPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const buscarCita = async (e: React.FormEvent) => {
    e.preventDefault()

    // Normalizar email: minúsculas y trim
    const emailNormalizado = email.toLowerCase().trim()

    if (!emailNormalizado || !emailNormalizado.includes('@')) {
      setError('Por favor, ingresa un email válido')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/pacientes/cita-activa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNormalizado }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.existe && data.cita) {
          // Tiene cita activa - redirigir
          router.push(`/cita/${data.cita.codigo_cita}`)
        } else {
          // No tiene cita activa
          setError(
            'No tienes citas pendientes. ¿Quieres agendar una nueva cita?'
          )
        }
      } else {
        setError(data.mensaje || data.error || 'Error al buscar tu cita')
      }
    } catch (err) {
      setError('Error de conexión. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.main}>
      {/* Top Header */}
      <div className={styles.topHeader}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Dr. Paul</span>
        </div>
        <button onClick={() => router.push('/')} className={styles.backButton}>
          Volver
        </button>
      </div>

      {/* Hero Section */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Ver Mi Cita</h1>
        <p className={styles.heroSubtitle}>
          Ingresa tu email para acceder a tu cita pendiente
        </p>
      </div>

      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Buscar por Email</h2>
            <p>Usa el email con el que agendaste tu cita</p>
          </div>

          <form onSubmit={buscarCita} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                placeholder="tu@email.com"
                required
                autoFocus
                className={styles.emailInput}
              />
              <small>Este es el email que usaste para agendar tu cita</small>
            </div>

            {error && (
              <div className={styles.error}>
                <p>{error}</p>
                {error.includes('¿Quieres agendar') && (
                  <button
                    type="button"
                    onClick={() => router.push('/agendar')}
                    className={styles.btnLink}
                  >
                    Agendar nueva cita →
                  </button>
                )}
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => router.push('/')}
                className={styles.btnSecondary}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={loading || !email}
              >
                {loading ? 'Buscando...' : 'Buscar Mi Cita'}
              </button>
            </div>
          </form>

          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>✓</span>
              <span>Solo puedes tener una cita activa a la vez</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>✓</span>
              <span>Si tienes el código de tu cita, búscala desde la página principal</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
