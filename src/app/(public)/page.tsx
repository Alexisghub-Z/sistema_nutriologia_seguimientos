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

    // Normalizar código: mayúsculas y sin espacios
    const codigoNormalizado = codigo.toUpperCase().trim().replace(/\s/g, '')

    try {
      const response = await fetch(`/api/citas/codigo/${codigoNormalizado}`)

      if (response.ok) {
        router.push(`/cita/${codigoNormalizado}`)
      } else {
        setError('Código de cita no encontrado')
      }
    } catch (err) {
      setError('Error al buscar la cita')
    } finally {
      setLoading(false)
    }
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className={styles.main}>
      {/* Header/Navbar */}
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.logo}>
            <span className={styles.logoText}>Dr. Paul</span>
          </div>
          <nav className={styles.nav}>
            <button onClick={() => scrollToSection('servicios')} className={styles.navLink}>
              Servicios
            </button>
            <button onClick={() => scrollToSection('beneficios')} className={styles.navLink}>
              Beneficios
            </button>
            <button onClick={() => scrollToSection('buscar-cita')} className={styles.navLink}>
              Mi Cita
            </button>
            <button onClick={() => scrollToSection('contacto')} className={styles.navLink}>
              Contacto
            </button>
            <button
              onClick={() => router.push('/agendar')}
              className={styles.ctaHeaderButton}
            >
              Agendar Cita
            </button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Nutrición Profesional
            <span className={styles.titleAccent}>Resultados Reales</span>
          </h1>
          <p className={styles.subtitle}>
            Planes alimenticios personalizados basados en ciencia.
            Mejora tu salud con seguimiento profesional continuo.
          </p>
          <div className={styles.ctaGroup}>
            <button
              onClick={() => router.push('/agendar')}
              className={styles.ctaPrimary}
            >
              Agendar Primera Consulta
            </button>
            <button
              onClick={() => scrollToSection('servicios')}
              className={styles.ctaSecondary}
            >
              Conocer Servicios
            </button>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>500+</span>
              <span className={styles.statLabel}>Pacientes</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>95%</span>
              <span className={styles.statLabel}>Éxito</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statNumber}>10+</span>
              <span className={styles.statLabel}>Años</span>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Section */}
      <section id="servicios" className={styles.serviciosSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Servicios Especializados</h2>
          <p className={styles.sectionDescription}>
            Programas nutricionales diseñados para tus objetivos específicos
          </p>
          <div className={styles.serviciosGrid}>
            <div className={styles.servicioCard}>
              <h3>Control de Peso</h3>
              <p>Pérdida o ganancia de peso saludable con planes personalizados basados en tu metabolismo y estilo de vida.</p>
            </div>
            <div className={styles.servicioCard}>
              <h3>Nutrición Deportiva</h3>
              <p>Optimiza tu rendimiento físico con estrategias nutricionales diseñadas para atletas y deportistas.</p>
            </div>
            <div className={styles.servicioCard}>
              <h3>Nutrición Clínica</h3>
              <p>Manejo nutricional de diabetes, hipertensión, colesterol alto y otras condiciones médicas crónicas.</p>
            </div>
            <div className={styles.servicioCard}>
              <h3>Embarazo y Lactancia</h3>
              <p>Nutrición especializada para mamás, asegurando una alimentación óptima para ti y tu bebé.</p>
            </div>
            <div className={styles.servicioCard}>
              <h3>Nutrición Infantil</h3>
              <p>Alimentación balanceada para el crecimiento y desarrollo óptimo de niños y adolescentes.</p>
            </div>
            <div className={styles.servicioCard}>
              <h3>Reeducación Alimentaria</h3>
              <p>Aprende a comer bien sin dietas restrictivas, creando hábitos alimenticios sostenibles a largo plazo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios Section */}
      <section id="beneficios" className={styles.beneficiosSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>¿Por qué elegir Dr. Paul?</h2>
          <div className={styles.beneficiosGrid}>
            <div className={styles.beneficioCard}>
              <div className={styles.beneficioNumber}>01</div>
              <h3>Atención Personalizada</h3>
              <p>Cada plan nutricional es único, diseñado específicamente para tus necesidades, objetivos y estilo de vida.</p>
            </div>
            <div className={styles.beneficioCard}>
              <div className={styles.beneficioNumber}>02</div>
              <h3>Seguimiento Continuo</h3>
              <p>Monitoreo constante de tu progreso con ajustes en tiempo real para garantizar resultados sostenibles.</p>
            </div>
            <div className={styles.beneficioCard}>
              <div className={styles.beneficioNumber}>03</div>
              <h3>Enfoque Científico</h3>
              <p>Estrategias basadas en evidencia científica y las últimas investigaciones en nutrición y salud.</p>
            </div>
            <div className={styles.beneficioCard}>
              <div className={styles.beneficioNumber}>04</div>
              <h3>Resultados Medibles</h3>
              <p>Cambios reales y cuantificables en tu salud, energía, composición corporal y bienestar general.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Buscar Cita por Código */}
      <section id="buscar-cita" className={styles.buscarSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Consultar mi Cita</h2>
          <p className={styles.sectionDescription}>
            Ingresa tu código único para ver detalles, cancelar o reagendar
          </p>

          <div className={styles.codigoCard}>
            <form onSubmit={buscarCita} className={styles.codigoForm}>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ''))}
                placeholder="ABC123DE"
                className={styles.codigoInput}
                maxLength={8}
                required
              />
              <button
                type="submit"
                className={styles.codigoButton}
                disabled={loading || codigo.length < 6}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.divider}>
              <span>o</span>
            </div>

            <div className={styles.emailOption}>
              <p className={styles.emailOptionText}>¿No tienes el código?</p>
              <button
                onClick={() => router.push('/mis-citas')}
                className={styles.emailButton}
              >
                Ver mi cita con email
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaSectionTitle}>Comienza tu transformación hoy</h2>
          <p className={styles.ctaSectionSubtitle}>
            Agenda tu primera consulta y recibe un plan nutricional personalizado
          </p>
          <button
            onClick={() => router.push('/agendar')}
            className={styles.ctaSectionButton}
          >
            Agendar Consulta
          </button>
        </div>
      </section>

      {/* Contacto Section */}
      <section id="contacto" className={styles.contactoSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Contacto</h2>
          <div className={styles.contactoGrid}>
            <div className={styles.contactoCard}>
              <h3>Ubicación</h3>
              <p>Calle Principal #123<br />Oaxaca de Juárez<br />Oaxaca, México 68000</p>
            </div>
            <div className={styles.contactoCard}>
              <h3>Teléfono</h3>
              <p>(951) 123-4567<br />(951) 765-4321<br />Lun - Vie: 9:00 - 18:00</p>
            </div>
            <div className={styles.contactoCard}>
              <h3>Email</h3>
              <p>consultas@drpaul.com<br />info@drpaul.com<br />Respuesta en 24h</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerGrid}>
            <div className={styles.footerColumn}>
              <div className={styles.footerLogo}>Dr. Paul</div>
              <p className={styles.footerDescription}>
                Consultorio de nutrición profesional dedicado a mejorar tu salud y bienestar.
              </p>
            </div>

            <div className={styles.footerColumn}>
              <h4 className={styles.footerTitle}>Servicios</h4>
              <ul className={styles.footerList}>
                <li><a href="#servicios">Control de Peso</a></li>
                <li><a href="#servicios">Nutrición Deportiva</a></li>
                <li><a href="#servicios">Nutrición Clínica</a></li>
                <li><a href="#servicios">Embarazo y Lactancia</a></li>
              </ul>
            </div>

            <div className={styles.footerColumn}>
              <h4 className={styles.footerTitle}>Enlaces</h4>
              <ul className={styles.footerList}>
                <li><a href="/agendar">Agendar Cita</a></li>
                <li><a href="#buscar-cita">Buscar Cita</a></li>
                <li><a href="#contacto">Contacto</a></li>
                <li><a href="/login">Acceso Pacientes</a></li>
              </ul>
            </div>

            <div className={styles.footerColumn}>
              <h4 className={styles.footerTitle}>Horarios</h4>
              <ul className={styles.footerList}>
                <li>Lunes - Viernes</li>
                <li>9:00 AM - 6:00 PM</li>
                <li>Sábado</li>
                <li>10:00 AM - 2:00 PM</li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>© 2026 Dr. Paul. Todos los derechos reservados.</p>
            <div className={styles.footerLinks}>
              <a href="#">Privacidad</a>
              <span>·</span>
              <a href="#">Términos</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
