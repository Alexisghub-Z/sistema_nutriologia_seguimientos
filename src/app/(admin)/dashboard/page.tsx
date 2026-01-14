import { requireAuth } from '@/lib/auth-utils'
import { Card, CardHeader, CardTitle, CardDescription, CardBody, Badge } from '@/components/ui'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  const user = await requireAuth()

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Bienvenido de nuevo, {user.name}</p>
      </div>

      <div className={styles.welcomeCard}>
        <div className={styles.welcomeIcon}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="32" fill="var(--color-primary)" opacity="0.1" />
            <path
              d="M32 28C35.3137 28 38 25.3137 38 22C38 18.6863 35.3137 16 32 16C28.6863 16 26 18.6863 26 22C26 25.3137 28.6863 28 32 28Z"
              fill="var(--color-primary)"
            />
            <path
              d="M32 32C23.1634 32 16 34.6863 16 38V42C16 43.1046 16.8954 44 18 44H46C47.1046 44 48 43.1046 48 42V38C48 34.6863 40.8366 32 32 32Z"
              fill="var(--color-primary)"
            />
          </svg>
        </div>
        <div>
          <h2 className={styles.welcomeTitle}>Bienvenido, {user.name}</h2>
          <p className={styles.welcomeText}>{user.email}</p>
          <span className={styles.badge}>{user.rol}</span>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>📅</div>
          <h3 className={styles.cardTitle}>Citas</h3>
          <p className={styles.cardDescription}>
            Gestiona las citas de tus pacientes
          </p>
          <p className={styles.cardStatus}>Próximamente</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>👥</div>
          <h3 className={styles.cardTitle}>Pacientes</h3>
          <p className={styles.cardDescription}>
            Administra expedientes digitales
          </p>
          <p className={styles.cardStatus}>Próximamente</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>💬</div>
          <h3 className={styles.cardTitle}>Mensajes</h3>
          <p className={styles.cardDescription}>
            Conversaciones de WhatsApp
          </p>
          <p className={styles.cardStatus}>Próximamente</p>
        </div>

        <div className={styles.card}>
          <div className={styles.cardIcon}>⚙️</div>
          <h3 className={styles.cardTitle}>Configuración</h3>
          <p className={styles.cardDescription}>
            Ajustes del sistema
          </p>
          <p className={styles.cardStatus}>Próximamente</p>
        </div>
      </div>

      <div className={styles.infoBox}>
        <h3 className={styles.infoTitle}>✅ Sistema de Autenticación Completado</h3>
        <ul className={styles.infoList}>
          <li>✓ NextAuth v5 (Auth.js) configurado</li>
          <li>✓ Página de login funcional</li>
          <li>✓ Middleware de protección de rutas</li>
          <li>✓ Session management activo</li>
          <li>✓ Rutas protegidas (/dashboard requiere autenticación)</li>
          <li>✓ Logout funcional</li>
        </ul>
      </div>
    </div>
  )
}
