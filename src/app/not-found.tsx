import Link from 'next/link'
import styles from './error.module.css'

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Página no encontrada</h2>
        <p className={styles.description}>
          Lo sentimos, la página que buscas no existe o ha sido movida.
        </p>
        <Link href="/dashboard" className={styles.button}>
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
