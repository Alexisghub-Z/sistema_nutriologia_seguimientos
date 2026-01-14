'use client'

import { useEffect } from 'react'
import styles from './error.module.css'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.code}>500</h1>
        <h2 className={styles.title}>Algo salió mal</h2>
        <p className={styles.description}>
          Ocurrió un error inesperado. Por favor intenta nuevamente.
        </p>
        <button onClick={reset} className={styles.button}>
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
