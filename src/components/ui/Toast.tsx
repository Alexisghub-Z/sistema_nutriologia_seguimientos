'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { encolar } from '@/lib/ui/toast-cola'
import styles from './Toast.module.css'

/**
 * Notificaciones toast.
 * ------------------------------------------------------------
 * Para confirmar acciones que hoy se hacen en silencio ("se guardó", "se
 * envió"). Estilo brutalista: fondo blanco, borde negro grueso y sombra dura,
 * con entrada de rebote.
 *
 * Uso:
 *   const toast = useToast()
 *   toast.exito('Paciente guardado')
 *   toast.error('No se pudo enviar el mensaje')
 *
 * El proveedor va una sola vez en el layout raíz; el hook se usa desde
 * cualquier componente cliente.
 */

export type TipoToast = 'exito' | 'error' | 'info' | 'aviso'

export interface OpcionesToast {
  /** Milisegundos en pantalla. 0 = no se cierra solo. */
  duracion?: number
  /** Texto secundario bajo el mensaje. */
  descripcion?: string
  /** Botón de acción (por ejemplo, "Deshacer"). */
  accion?: { etiqueta: string; onClick: () => void }
}

interface Toast extends OpcionesToast {
  id: number
  tipo: TipoToast
  mensaje: string
}

/** Cuánto dura cada tipo por defecto. */
const DURACION_POR_TIPO: Record<TipoToast, number> = {
  exito: 4000,
  info: 4000,
  aviso: 6000,
  // Los errores esperan más: suelen pedir que el usuario haga algo.
  error: 8000,
}

/** Debe coincidir con la animación de salida del CSS. */
const MS_SALIDA = 250

interface ApiToast {
  exito: (mensaje: string, opciones?: OpcionesToast) => number
  error: (mensaje: string, opciones?: OpcionesToast) => number
  info: (mensaje: string, opciones?: OpcionesToast) => number
  aviso: (mensaje: string, opciones?: OpcionesToast) => number
  /** Para casos raros en los que el tipo se decide en tiempo de ejecución. */
  mostrar: (tipo: TipoToast, mensaje: string, opciones?: OpcionesToast) => number
  /** Cierra uno concreto (por ejemplo, tras completar una acción). */
  cerrar: (id: number) => void
}

const ToastContext = createContext<ApiToast | null>(null)

/**
 * Acceso a los toasts. Lanza si falta el proveedor: es un error de montaje y es
 * mejor verlo en desarrollo que quedarse sin avisos en producción.
 */
export function useToast(): ApiToast {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast necesita <ToastProvider>, que va en el layout raíz.')
  }
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  // Los que están saliendo: siguen montados hasta que acabe la animación.
  const [saliendo, setSaliendo] = useState<Set<number>>(new Set())
  const siguienteId = useRef(1)
  // Temporizadores por toast, para poder pausarlos al pasar el cursor.
  const temporizadores = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const [montado, setMontado] = useState(false)

  // El portal necesita `document`, que no existe en el render del servidor.
  useEffect(() => {
    setMontado(true)
  }, [])

  const cerrar = useCallback((id: number) => {
    const t = temporizadores.current.get(id)
    if (t) {
      clearTimeout(t)
      temporizadores.current.delete(id)
    }
    // Primero lo marcamos como saliendo (animación) y luego lo quitamos.
    setSaliendo((s) => new Set(s).add(id))
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
      setSaliendo((s) => {
        const copia = new Set(s)
        copia.delete(id)
        return copia
      })
    }, MS_SALIDA)
  }, [])

  /** Arranca (o reinicia) la cuenta atrás de un toast. */
  const programarCierre = useCallback(
    (id: number, ms: number) => {
      if (ms <= 0) return
      const previo = temporizadores.current.get(id)
      if (previo) clearTimeout(previo)
      temporizadores.current.set(
        id,
        setTimeout(() => cerrar(id), ms)
      )
    },
    [cerrar]
  )

  const mostrar = useCallback(
    (tipo: TipoToast, mensaje: string, opciones: OpcionesToast = {}) => {
      const id = siguienteId.current++
      const duracion = opciones.duracion ?? DURACION_POR_TIPO[tipo]

      setToasts((prev) => {
        const { visibles, descartados } = encolar(prev, { id, tipo, mensaje, ...opciones })
        // Los que se van por el tope: cancelar su temporizador para no dejarlo
        // corriendo contra un toast que ya no existe.
        for (const fuera of descartados) {
          const t = temporizadores.current.get(fuera.id)
          if (t) {
            clearTimeout(t)
            temporizadores.current.delete(fuera.id)
          }
        }
        return visibles
      })

      programarCierre(id, duracion)
      return id
    },
    [programarCierre]
  )

  // Al desmontar, no dejar temporizadores sueltos.
  useEffect(() => {
    const mapa = temporizadores.current
    return () => {
      for (const t of mapa.values()) clearTimeout(t)
      mapa.clear()
    }
  }, [])

  // Objeto estable: si se recreara en cada render, cualquier efecto que dependa
  // del hook se relanzaría sin motivo.
  const api = useMemo<ApiToast>(
    () => ({
      exito: (m, o) => mostrar('exito', m, o),
      error: (m, o) => mostrar('error', m, o),
      info: (m, o) => mostrar('info', m, o),
      aviso: (m, o) => mostrar('aviso', m, o),
      mostrar,
      cerrar,
    }),
    [mostrar, cerrar]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {montado &&
        createPortal(
          <div className={styles.contenedor} role="region" aria-label="Notificaciones">
            {toasts.map((t) => (
              <ToastItem
                key={t.id}
                toast={t}
                saliendo={saliendo.has(t.id)}
                onCerrar={() => cerrar(t.id)}
                onPausar={() => {
                  const tm = temporizadores.current.get(t.id)
                  if (tm) {
                    clearTimeout(tm)
                    temporizadores.current.delete(t.id)
                  }
                }}
                onReanudar={() => {
                  const duracion = t.duracion ?? DURACION_POR_TIPO[t.tipo]
                  // Al salir el cursor se reinicia la cuenta: es más predecible
                  // que intentar reanudar el tiempo restante.
                  programarCierre(t.id, duracion)
                }}
              />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

const ICONOS: Record<TipoToast, React.ReactNode> = {
  exito: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  aviso: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v5M12 17.5v.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 11v5M12 7.5v.5" />
    </svg>
  ),
}

const CLASE_TIPO: Record<TipoToast, string> = {
  exito: styles.exito!,
  error: styles.error!,
  aviso: styles.aviso!,
  info: styles.info!,
}

function ToastItem({
  toast,
  saliendo,
  onCerrar,
  onPausar,
  onReanudar,
}: {
  toast: Toast
  saliendo: boolean
  onCerrar: () => void
  onPausar: () => void
  onReanudar: () => void
}) {
  return (
    <div
      className={`${styles.toast} ${CLASE_TIPO[toast.tipo]} ${saliendo ? styles.saliendo : ''}`}
      // Los errores interrumpen al lector de pantalla; el resto espera turno.
      role={toast.tipo === 'error' ? 'alert' : 'status'}
      aria-live={toast.tipo === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={onPausar}
      onMouseLeave={onReanudar}
    >
      <span className={styles.icono} aria-hidden>
        {ICONOS[toast.tipo]}
      </span>

      <div className={styles.cuerpo}>
        <p className={styles.mensaje}>{toast.mensaje}</p>
        {toast.descripcion && <p className={styles.descripcion}>{toast.descripcion}</p>}
        {toast.accion && (
          <button
            type="button"
            className={styles.accion}
            onClick={() => {
              toast.accion!.onClick()
              onCerrar()
            }}
          >
            {toast.accion.etiqueta}
          </button>
        )}
      </div>

      <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar aviso">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}
