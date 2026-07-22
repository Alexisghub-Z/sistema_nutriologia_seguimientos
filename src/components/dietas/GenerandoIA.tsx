'use client'

import { useState, useEffect } from 'react'
import styles from './GenerandoIA.module.css'

interface Props {
  /** 'dieta' o 'recetario' — cambia los mensajes que cicla. */
  modo?: 'dieta' | 'recetario'
}

const MENSAJES: Record<'dieta' | 'recetario', string[]> = {
  dieta: [
    'Analizando los equivalentes',
    'Eligiendo alimentos a tu estilo',
    'Calculando las porciones',
    'Revisando que todo cuadre',
  ],
  recetario: [
    'Analizando los equivalentes',
    'Creando opciones de platillos',
    'Escribiendo las recetas',
    'Ajustando cada porción',
  ],
}

/**
 * Animación premium mientras la IA genera la dieta o el recetario.
 * Orbe con anillos de pulso + partículas orbitando, texto que cicla mensajes
 * y un skeleton shimmer. Puro CSS, respeta prefers-reduced-motion.
 */
export default function GenerandoIA({ modo = 'dieta' }: Props) {
  const mensajes = MENSAJES[modo]
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % mensajes.length), 2200)
    return () => clearInterval(t)
  }, [mensajes.length])

  return (
    <div className={styles.wrap}>
      <div className={styles.orbe}>
        <span className={styles.anillo} />
        <span className={`${styles.anillo} ${styles.anillo2}`} />
        <span className={`${styles.anillo} ${styles.anillo3}`} />

        <div className={styles.orbita}>
          <span className={styles.particula} />
        </div>
        <div className={`${styles.orbita} ${styles.orbita2}`}>
          <span className={styles.particula} />
        </div>

        <div className={styles.nucleo} />
        <span className={styles.chispa}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
            <path d="M19 14l.8 2.3L22 17l-2.2.7L19 20l-.8-2.3L16 17l2.2-.7L19 14z" opacity="0.75" />
          </svg>
        </span>
      </div>

      <div className={styles.texto}>
        {mensajes[idx]}
        <span className={styles.puntos} />
      </div>

      <div className={styles.skeleton}>
        <div className={styles.linea} />
        <div className={styles.linea} />
        <div className={styles.linea} />
        <div className={styles.linea} />
      </div>
    </div>
  )
}
