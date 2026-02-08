'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, ReactNode } from 'react'
import styles from './PageTransition.module.css'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Componente que agrega transiciones suaves entre páginas
 *
 * Implementa fade-in + slide desde abajo cuando cambia la ruta
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    // Detectar cambio de ruta
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname

      // Scroll al top suavemente cuando cambia de página
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [pathname])

  return (
    <div key={pathname} className={styles.pageTransition}>
      {children}
    </div>
  )
}
