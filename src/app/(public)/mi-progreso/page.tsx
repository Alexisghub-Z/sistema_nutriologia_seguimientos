'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './mi-progreso.module.css'
import ProgresoCharts from './components/ProgresoCharts'

interface Consulta {
  fecha: string
  peso: number | null
  talla: number | null
  imc: number | null
  grasa_corporal: number | null
  porcentaje_agua: number | null
  masa_muscular_kg: number | null
  cintura: number | null
  cadera_maximo: number | null
}

interface ProgresoData {
  paciente: { nombre: string; email: string }
  consultas: Consulta[]
}

type Vista = 'entrada' | 'cargando' | 'progreso' | 'no_encontrado'

export default function MiProgresoPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [vista, setVista] = useState<Vista>('entrada')
  const [progresoData, setProgresoData] = useState<ProgresoData | null>(null)

  const buscarProgreso = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailNormalizado = email.toLowerCase().trim()
    if (!emailNormalizado || !emailNormalizado.includes('@')) {
      setError('Por favor, ingresa un email válido')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/pacientes/progreso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailNormalizado }),
      })

      if (response.status === 429) {
        setError('Demasiados intentos. Por favor espera un momento.')
        setLoading(false)
        return
      }

      const data = await response.json()

      if (response.ok) {
        if (!data.existe) {
          setError('No encontramos ningún paciente con ese email. Verifica que sea el mismo que usaste en tu consulta.')
        } else {
          setProgresoData({ paciente: data.paciente, consultas: data.consultas })
          setVista('progreso')
        }
      } else {
        setError(data.error || 'Error al buscar tu información')
      }
    } catch {
      setError('Error de conexión. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // --- Vista: cargando ---
  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.topHeader}>
          <div className={styles.logo}>
            <span className={styles.logoText}>Nutriólogo Paul</span>
          </div>
          <button onClick={() => router.push('/')} className={styles.backButton}>
            Volver
          </button>
        </div>
        <div className={styles.loader}>
          <div className={styles.spinner} />
          <p>Buscando tu progreso...</p>
        </div>
      </main>
    )
  }

  // --- Vista: progreso ---
  if (vista === 'progreso' && progresoData) {
    return (
      <main className={styles.main}>
        <div className={styles.topHeader}>
          <div className={styles.logo}>
            <span className={styles.logoText}>Nutriólogo Paul</span>
          </div>
          <button onClick={() => { setVista('entrada'); setProgresoData(null) }} className={styles.backButton}>
            Cambiar email
          </button>
        </div>
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Mi Progreso</h1>
          <p className={styles.heroSubtitle}>Tu evolución de peso y composición corporal</p>
        </div>
        <div className={styles.containerWide}>
          <ProgresoCharts
            paciente={progresoData.paciente}
            consultas={progresoData.consultas}
          />
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <button onClick={() => router.push('/')} className={styles.btnSecondary}>
              Volver al inicio
            </button>
          </div>
        </div>
      </main>
    )
  }

  // --- Vista: entrada ---
  return (
    <main className={styles.main}>
      <div className={styles.topHeader}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Nutriólogo Paul</span>
        </div>
        <button onClick={() => router.push('/')} className={styles.backButton}>
          Volver
        </button>
      </div>

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Mi Progreso</h1>
        <p className={styles.heroSubtitle}>Ingresa tu email para ver tu evolución de peso y medidas</p>
      </div>

      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Consultar mi Progreso</h2>
            <p>Usa el email con el que te registraste en tu consulta</p>
          </div>

          <form onSubmit={buscarProgreso} className={styles.form}>
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
              <small>Este es el email que proporcionaste en tu primera consulta</small>
            </div>

            {error && (
              <div className={styles.error}>
                <p>{error}</p>
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
              <button type="submit" className={styles.btnPrimary} disabled={loading || !email}>
                {loading ? 'Buscando...' : 'Ver Mi Progreso'}
              </button>
            </div>
          </form>

          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>✓</span>
              <span>Solo se muestran tus mediciones: peso, IMC y composición corporal</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoIcon}>✓</span>
              <span>Tus notas clínicas y datos de pago nunca son visibles aquí</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
