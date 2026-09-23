'use client'

import { createContext, useCallback, useContext, useRef } from 'react'

/**
 * Evita perder trabajo al navegar por el menú.
 * ------------------------------------------------------------
 * La pantalla de dietas ya se protegía al CERRAR la pestaña (`beforeunload`) y
 * al minimizarla (`visibilitychange`). Pero el menú lateral usa `<Link>` de
 * Next, que navega sin recargar la página: `beforeunload` no salta, y quien
 * pulsaba "Pacientes" en mitad de una dieta se iba sin aviso, perdiendo los
 * últimos retoques que el autoguardado tenía todavía en cola.
 *
 * Aquí una pantalla registra un "guardián" y el menú le pregunta antes de
 * navegar. El menú no sabe qué hay dentro —no debe saber de dietas—, solo si
 * puede irse.
 */

/**
 * Lo que hace un guardián cuando se intenta salir.
 *
 * Devuelve `true` si se puede navegar. Es `async` a propósito: da margen a
 * intentar guardar de verdad antes de decidir, en lugar de preguntar a bocajarro.
 */
export type Guardian = () => Promise<boolean>

interface SalidaSegura {
  /** Registra el guardián de la pantalla actual. Devuelve cómo quitarlo. */
  registrarGuardian: (guardian: Guardian, hayQueVigilar: () => boolean) => () => void
  /**
   * ¿Hace falta preguntar siquiera?
   *
   * Es una comprobación SÍNCRONA y barata para no interceptar el clic cuando
   * no hay nada que guardar. Importa: al interceptar hay que cancelar el
   * `<Link>` y navegar a mano con `router.push`, lo que pierde la navegación
   * optimizada de Next — medido en 8 segundos frente a los ~300 ms normales.
   * Ese precio solo se paga cuando hay trabajo de verdad en juego.
   */
  hayQueVigilar: () => boolean
  /** ¿Se puede salir? Lo llama el menú antes de navegar. */
  puedeSalir: () => Promise<boolean>
}

const Contexto = createContext<SalidaSegura | null>(null)

export function SalidaSeguraProvider({ children }: { children: React.ReactNode }) {
  // En una ref y no en estado: cambiar de guardián no debe repintar el menú.
  const guardian = useRef<Guardian | null>(null)
  const vigilar = useRef<(() => boolean) | null>(null)

  const registrarGuardian = useCallback((nuevo: Guardian, comprobar: () => boolean) => {
    guardian.current = nuevo
    vigilar.current = comprobar
    return () => {
      // Solo se limpia si sigue siendo el suyo: al cambiar de pantalla, la
      // nueva puede haberse registrado antes de que la vieja se desmonte, y
      // borrar a ciegas dejaría la app sin protección.
      if (guardian.current === nuevo) {
        guardian.current = null
        vigilar.current = null
      }
    }
  }, [])

  const hayQueVigilar = useCallback(() => {
    if (!vigilar.current) return false
    try {
      return vigilar.current()
    } catch {
      // Ante la duda, vigilar: preguntar de más molesta; perder trabajo, no.
      return true
    }
  }, [])

  const puedeSalir = useCallback(async () => {
    if (!guardian.current) return true
    try {
      return await guardian.current()
    } catch {
      // Si el guardián falla, se deja pasar. Atrapar al nutriólogo dentro de
      // una pantalla por un error nuestro es peor que perder unos retoques.
      return true
    }
  }, [])

  return (
    <Contexto.Provider value={{ registrarGuardian, hayQueVigilar, puedeSalir }}>
      {children}
    </Contexto.Provider>
  )
}

/**
 * Para el menú: pregunta si se puede navegar.
 *
 * Fuera del provider devuelve "siempre sí", para que un componente suelto
 * —o una prueba— no reviente por no tener el contexto montado.
 */
export function useSalidaSegura(): SalidaSegura {
  return (
    useContext(Contexto) ?? {
      registrarGuardian: () => () => {},
      hayQueVigilar: () => false,
      puedeSalir: async () => true,
    }
  )
}
