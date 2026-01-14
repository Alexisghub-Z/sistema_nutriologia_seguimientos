import Link from 'next/link'
import styles from './PublicFooter.module.css'

export default function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.info}>
            <p className={styles.copyright}>
              © {new Date().getFullYear()} Sistema de Nutrición. Todos los derechos reservados.
            </p>
          </div>

          <div className={styles.links}>
            <Link href="/login" className={styles.adminLink}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M5 11.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5zm-2-3a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zm-2-3a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9a.5.5 0 01-.5-.5zm0-3a.5.5 0 01.5-.5h9a.5.5 0 010 1h-9a.5.5 0 01-.5-.5zM13 1a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2h10z"
                  clipRule="evenodd"
                />
              </svg>
              Acceso Profesional
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
