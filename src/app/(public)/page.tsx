'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import ChatFAQ from '@/components/chat/ChatFAQ'
import WhatsAppButton from '@/components/chat/WhatsAppButton'
import styles from './page.module.css'

export default function Home() {
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Activar animaciones de scroll
  useScrollReveal()

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
            <span className={styles.logoText}>Nutriólogo Paul</span>
          </div>
          <nav className={styles.nav}>
            <button onClick={() => scrollToSection('sobre-mi')} className={styles.navLink}>
              Sobre Mí
            </button>
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
            <button onClick={() => router.push('/agendar')} className={styles.ctaHeaderButton}>
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
            Planes alimenticios personalizados basados en ciencia. Mejora tu salud con seguimiento
            profesional continuo.
          </p>
          <div className={styles.ctaGroup}>
            <button onClick={() => router.push('/agendar')} className={styles.ctaPrimary}>
              Agendar Primera Consulta
            </button>
            <button onClick={() => scrollToSection('servicios')} className={styles.ctaSecondary}>
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

      {/* Sobre Mí Section */}
      <section id="sobre-mi" className={styles.sobreMiSection}>
        <div className={styles.sobreMiGrid}>
          {/* Columna Izquierda - Información */}
          <div className={`${styles.sobreMiContent} fade-in-left`} data-scroll-reveal>
            <h2 className={styles.sobreMiTitle}>Sobre Mí</h2>
            <h3 className={styles.sobreMiSubtitle}>Lic. Eder Paúl Alavez Cortés</h3>

            <p className={styles.sobreMiDescription}>
              Soy nutriólogo clínico con más de 10 años de experiencia ayudando a personas a mejorar su salud, su composición corporal y su calidad de vida a través de planes de alimentación personalizados, basados en ciencia y adaptados a cada estilo de vida.
            </p>

            <p className={styles.sobreMiDescription}>
              Trabajo tanto en consulta privada como en el ámbito hospitalario en Red OSMO, lo que me permite ofrecer un enfoque integral, seguro y profesional.
            </p>

            {/* Credenciales */}
            <div className={styles.credencialesContainer}>
              <div className={styles.credencialItem}>
                <h4 className={styles.credencialTitulo}>Formación Académica</h4>
                <ul className={styles.credencialLista}>
                  <li>Licenciatura en Nutrición</li>
                  <li>Maestro en Nutrición y Dietética</li>
                </ul>
              </div>

              <div className={styles.credencialItem}>
                <h4 className={styles.credencialTitulo}>Experiencia Profesional</h4>
                <ul className={styles.credencialLista}>
                  <li>Nutriólogo Clínico – Red OSMO (2018 – Actualidad)</li>
                  <li>Consulta privada en Oaxaca (10+ años)</li>
                  <li>Experiencia en investigación clínica</li>
                </ul>
              </div>

              <div className={styles.credencialItem}>
                <h4 className={styles.credencialTitulo}>Especialidades</h4>
                <ul className={styles.credencialLista}>
                  <li>Control de peso y composición corporal</li>
                  <li>Enfermedades crónicas (diabetes, hipertensión, cáncer)</li>
                  <li>Nutrición deportiva y rendimiento físico</li>
                </ul>
              </div>
            </div>

            <button onClick={() => router.push('/agendar')} className={styles.sobreMiCtaButton}>
              Agendar Consulta
            </button>
          </div>

          {/* Columna Derecha - Foto */}
          <div className={`${styles.sobreMiFotoContainer} fade-in-right`} data-scroll-reveal>
            <div className={styles.sobreMiFotoWrapper}>
              <div className={styles.sobreMiFotoInner}>
                <div className={styles.fotoDecoracion}></div>
                <img
                  src="/images/foto-perfil.png"
                  alt="Nutriólogo Paul - Nutriólogo Profesional"
                  className={styles.sobreMiFoto}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Preview Section */}
      <section className={styles.videoSection}>
        <div className={styles.container}>
          <div className={styles.videoGrid}>
            <div className={`${styles.videoTextContent} fade-in-left`} data-scroll-reveal>
              <h2 className={styles.videoTitle}>Participación en Cortv Oaxaca</h2>
              <p className={styles.videoDescription}>
                Mira mi participación en el programa de cocina de Cortv Oaxaca, donde comparto
                recetas saludables y consejos nutricionales para cocinar de forma balanceada y
                deliciosa.
              </p>
              <p className={styles.videoDescription}>
                Descubre cómo la buena alimentación no tiene que ser aburrida. Aprende técnicas y
                preparaciones que puedes aplicar en tu día a día para mantener una nutrición óptima
                sin sacrificar el sabor.
              </p>
              <button onClick={() => router.push('/agendar')} className={styles.videoCtaButton}>
                Agendar Primera Consulta
              </button>
            </div>
            <div className={`${styles.videoContainer} scale-in`} data-scroll-reveal>
              <div className={styles.videoWrapper}>
                <iframe
                  className={styles.videoIframe}
                  src="https://www.youtube-nocookie.com/embed/CWVptmWn31w?start=33&rel=0&modestbranding=1"
                  title="Video de presentación"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Servicios Section */}
      <section id="servicios" className={styles.serviciosSection}>
        <div className={styles.container}>
          <h2 className={`${styles.sectionTitle} fade-in`} data-scroll-reveal>
            ¿Cómo te ayudo?
          </h2>
          <p className={`${styles.sectionDescription} fade-in`} data-scroll-reveal>
            Durante la consulta realizo una evaluación completa y personalizada
          </p>
          <div className={styles.serviciosGrid}>
            <div className={`${styles.servicioCard} slide-up`} data-scroll-reveal>
              <div className={styles.servicioIcono}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3>Evaluación Nutricional</h3>
              <p>
                Evaluación nutricional completa y personalizada con análisis de composición corporal para conocer tu estado actual.
              </p>
            </div>
            <div className={`${styles.servicioCard} slide-up`} data-scroll-reveal>
              <div className={styles.servicioIcono}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </div>
              <h3>Plan Personalizado</h3>
              <p>
                Plan de alimentación adaptado a tus objetivos, gustos y rutina diaria. Sin dietas genéricas, todo es personalizado.
              </p>
            </div>
            <div className={`${styles.servicioCard} slide-up`} data-scroll-reveal>
              <div className={styles.servicioIcono}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <h3>Seguimiento Continuo</h3>
              <p>
                Acompañamiento y seguimiento continuo para asegurar que logres tus objetivos de forma sostenible.
              </p>
            </div>
            <div className={`${styles.servicioCard} slide-up`} data-scroll-reveal>
              <div className={styles.servicioIcono}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="7" />
                  <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                </svg>
              </div>
              <h3>Educación Nutricional</h3>
              <p>
                Educación nutricional para lograr cambios reales y duraderos. Aprenderás a tomar mejores decisiones alimentarias.
              </p>
            </div>
            <div className={`${styles.servicioCard} slide-up`} data-scroll-reveal>
              <div className={styles.servicioIcono}>
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Atención Hospitalaria</h3>
              <p>
                Experiencia en atención nutricional hospitalaria y ambulatoria para pacientes con enfermedades crónicas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Beneficios Section */}
      <section id="beneficios" className={styles.beneficiosSection}>
        <div className={styles.container}>
          <h2 className={`${styles.sectionTitle} fade-in`} data-scroll-reveal>
            ¿Por qué confiar en mí?
          </h2>
          <div className={styles.beneficiosGrid}>
            <div className={`${styles.beneficioCard} fade-in`} data-scroll-reveal>
              <div className={styles.beneficioNumber}>01</div>
              <h3>Formación Completa</h3>
              <p>
                Formación universitaria y de posgrado en nutrición. Maestro en Nutrición y Dietética con educación continua y especializada.
              </p>
            </div>
            <div className={`${styles.beneficioCard} fade-in`} data-scroll-reveal>
              <div className={styles.beneficioNumber}>02</div>
              <h3>Experiencia Clínica Real</h3>
              <p>
                Más de 10 años de experiencia clínica real en hospital y consulta privada. Atención nutricional a pacientes hospitalizados y ambulatorios.
              </p>
            </div>
            <div className={`${styles.beneficioCard} fade-in`} data-scroll-reveal>
              <div className={styles.beneficioNumber}>03</div>
              <h3>Actualización Constante</h3>
              <p>
                Actualización constante y participación en congresos nacionales e internacionales. Experiencia en investigación clínica.
              </p>
            </div>
            <div className={`${styles.beneficioCard} fade-in`} data-scroll-reveal>
              <div className={styles.beneficioNumber}>04</div>
              <h3>Trato Profesional</h3>
              <p>
                Trato cercano, profesional y centrado en el paciente. Planes personalizados, no dietas genéricas. Enfoque integral y seguro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Buscar Cita por Código */}
      <section id="buscar-cita" className={styles.buscarSection}>
        <div className={styles.container}>
          <h2 className={`${styles.sectionTitle} fade-in`} data-scroll-reveal>
            Consultar mi Cita
          </h2>
          <p className={`${styles.sectionDescription} fade-in`} data-scroll-reveal>
            Ingresa tu código único para ver detalles, cancelar o reagendar
          </p>

          <div className={`${styles.codigoCard} scale-in`} data-scroll-reveal>
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
              <button onClick={() => router.push('/mis-citas')} className={styles.emailButton}>
                Ver mi cita con email
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Medios y Presencia */}
      <section className={styles.mediosSection}>
        <div className={styles.mediosContainer}>
          <h2 className={styles.sectionTitle}>Visto en los principales medios</h2>
          <p className={styles.sectionDescription}>
            Presencia en radio, televisión y medios digitales de Oaxaca
          </p>

          <div className={styles.sliderWrapper}>
            <div className={styles.sliderContent}>
              {/* Primera ronda de fotos */}
              <div className={styles.logoItem}>
                <img src="/logos/foto1.jpg" alt="Foto 1" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto2.jpg" alt="Foto 2" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto3.jpg" alt="Foto 3" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto4.jpg" alt="Foto 4" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto5.jpg" alt="Foto 5" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto6.jpg" alt="Foto 6" />
              </div>

              {/* Segunda ronda (duplicada para loop infinito) */}
              <div className={styles.logoItem}>
                <img src="/logos/foto1.jpg" alt="Foto 1" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto2.jpg" alt="Foto 2" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto3.jpg" alt="Foto 3" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto4.jpg" alt="Foto 4" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto5.jpg" alt="Foto 5" />
              </div>
              <div className={styles.logoItem}>
                <img src="/logos/foto6.jpg" alt="Foto 6" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={`${styles.ctaContent} scale-in`} data-scroll-reveal>
          <h2 className={styles.ctaSectionTitle}>Comienza tu transformación hoy</h2>
          <p className={styles.ctaSectionSubtitle}>
            Agenda tu primera consulta y recibe un plan nutricional personalizado
          </p>
          <button onClick={() => router.push('/agendar')} className={styles.ctaSectionButton}>
            Agendar Consulta
          </button>
        </div>
      </section>

      {/* Contacto Section */}
      <section id="contacto" className={styles.contactoSection}>
        <div className={styles.container}>
          <h2 className={`${styles.sectionTitle} fade-in`} data-scroll-reveal>
            Contacto
          </h2>
          <p className={`${styles.sectionDescription} fade-in`} data-scroll-reveal>
            Visítanos en nuestro consultorio o contáctanos por teléfono y email
          </p>

          {/* Mapa */}
          <div className={`${styles.mapaContainer} fade-in`} data-scroll-reveal>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30559.437524935!2d-96.72633484999999!3d17.0731842!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85c7220a2b7e0d85%3A0x3c0f3e2b7e0d85c7!2sOaxaca%20de%20Ju%C3%A1rez%2C%20Oax.!5e0!3m2!1ses!2smx!4v1234567890123!5m2!1ses!2smx"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className={styles.mapa}
            ></iframe>
          </div>

          <div className={styles.contactoGrid}>
            <div className={styles.contactoCard}>
              <h3>Ubicación</h3>
              <p>
                Oaxaca de Juárez
                <br />
                Oaxaca, México
                <br />
                Consulta privada y Red OSMO
              </p>
            </div>
            <div className={styles.contactoCard}>
              <h3>Teléfono</h3>
              <p>
                Citas disponibles
                <br />
                Agenda tu consulta
                <br />
                Lun - Vie: 9:00 - 18:00
              </p>
            </div>
            <div className={styles.contactoCard}>
              <h3>Email</h3>
              <p>
                paul_nutricion@hotmail.com
                <br />
                paul.alavez@redosmo.com
                <br />
                Respuesta en 24h
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerGrid}>
            <div className={styles.footerColumn}>
              <div className={styles.footerLogo}>Nutriólogo Paul</div>
              <p className={styles.footerDescription}>
                Lic. Eder Paúl Alavez Cortés - Nutriólogo Clínico | Maestro en Nutrición y Dietética. Consultorio de nutrición profesional dedicado a mejorar tu salud y bienestar.
              </p>
            </div>

            <div className={styles.footerColumn}>
              <h4 className={styles.footerTitle}>Servicios</h4>
              <ul className={styles.footerList}>
                <li>
                  <a href="#servicios">Control de Peso</a>
                </li>
                <li>
                  <a href="#servicios">Composición Corporal</a>
                </li>
                <li>
                  <a href="#servicios">Nutrición Clínica</a>
                </li>
                <li>
                  <a href="#servicios">Enfermedades Crónicas</a>
                </li>
              </ul>
            </div>

            <div className={styles.footerColumn}>
              <h4 className={styles.footerTitle}>Enlaces</h4>
              <ul className={styles.footerList}>
                <li>
                  <a href="/agendar">Agendar Cita</a>
                </li>
                <li>
                  <a href="#buscar-cita">Buscar Cita</a>
                </li>
                <li>
                  <a href="#contacto">Contacto</a>
                </li>
                <li>
                  <a href="/login">Acceso Pacientes</a>
                </li>
              </ul>
            </div>

            <div className={styles.footerColumn}>
              <h4 className={styles.footerTitle}>Horarios</h4>
              <ul className={styles.footerList}>
                <li>Lunes - Viernes</li>
                <li>4:00 PM - 8:00 PM</li>
                <li>Sábado</li>
                <li>8:00 AM - 7:00 PM</li>
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <p>© 2026 Nutriólogo Paul. Todos los derechos reservados.</p>
            <div className={styles.footerLinks}>
              <a href="#">Privacidad</a>
              <span>·</span>
              <a href="#">Términos</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Chat FAQ flotante */}
      <ChatFAQ />

      {/* Botón de WhatsApp */}
      <WhatsAppButton />
    </main>
  )
}
