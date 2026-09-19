'use client'

/**
 * Ventana centrada sobre la pantalla.
 * ------------------------------------------------------------
 * Existe porque colocar un `position: fixed` dentro del árbol de la página no
 * basta: si cualquier ancestro tiene `transform`, `filter` o `perspective` —y
 * basta una animación de entrada— el fixed deja de anclarse a la ventana y
 * pasa a anclarse a ese ancestro. La ventana entonces se corta y se va con el
 * scroll, que es justo lo que pasaba con el modal de nombrar plantillas.
 *
 * Aquí se resuelve de una vez para toda la sección:
 *  - `createPortal` al body, fuera de cualquier contenedor con transform.
 *  - Scroll del fondo bloqueado mientras está abierta.
 *  - Escape cierra, y el foco vuelve a donde estaba al abrir.
 *  - Salida animada antes de desmontar, como los toasts del sistema.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './ModalCentrado.module.css'

/** Debe coincidir con `.saliendo` del CSS o la ventana se corta a medias. */
const MS_SALIDA = 180

type Ancho = 'estrecho' | 'medio' | 'ancho'

interface Props {
  children: React.ReactNode
  onCerrar: () => void
  /** Título accesible; si se omite, el contenido debe aportar el suyo. */
  titulo?: string
  ancho?: Ancho
  /** Bloquea cerrar mientras hay algo en curso (una petición, por ejemplo). */
  bloqueado?: boolean
}

export default function ModalCentrado({
  children,
  onCerrar,
  titulo,
  ancho = 'estrecho',
  bloqueado = false,
}: Props) {
  const [montado, setMontado] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const focoPrevio = useRef<HTMLElement | null>(null)
  const caja = useRef<HTMLDivElement>(null)

  useEffect(() => setMontado(true), [])

  const cerrar = useCallback(() => {
    if (bloqueado) return
    setSaliendo((yaSale) => {
      if (yaSale) return yaSale
      setTimeout(onCerrar, MS_SALIDA)
      return true
    })
  }, [onCerrar, bloqueado])

  useEffect(() => {
    if (!montado) return

    // Quién tenía el foco antes de abrir, para devolvérselo al cerrar: sin
    // esto el teclado vuelve al principio de la página.
    focoPrevio.current = document.activeElement as HTMLElement | null

    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar()
      if (e.key !== 'Tab') return

      // El tabulador no debe salirse de la ventana mientras está abierta.
      const focos = caja.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focos || focos.length === 0) return
      const primero = focos[0]!
      const ultimo = focos[focos.length - 1]!
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alPulsar)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = overflowPrevio
      focoPrevio.current?.focus?.()
    }
  }, [montado, cerrar])

  if (!montado) return null

  return createPortal(
    <div
      className={`${styles.fondo} ${saliendo ? styles.fondoSaliendo : ''}`}
      onClick={cerrar}
      role="presentation"
    >
      <div
        ref={caja}
        className={[
          styles.caja,
          styles[`ancho_${ancho}`],
          saliendo ? styles.cajaSaliendo : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
