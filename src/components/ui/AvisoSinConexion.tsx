'use client'

import { useEffect, useState } from 'react'
import styles from './AvisoSinConexion.module.css'

/**
 * Avisa cuando el dispositivo se queda sin internet.
 * ------------------------------------------------------------
 * Sin esto, perder la conexión se manifiesta como cosas que dejan de
 * funcionar sin explicación: el autoguardado de la dieta falla, un paciente no
 * se carga, un mensaje no se envía. En la pantalla solo aparece un "Error de
 * conexión" suelto —hay una decena repartidos por el proyecto— que no
 * distingue entre "se cayó tu wifi" y "el sistema tiene un problema".
 *
 * Aquí se nombra la causa una sola vez, arriba y de forma persistente, para que
 * el nutriólogo (o el paciente reservando cita) sepa que el fallo es de su
 * conexión y que su trabajo no se ha perdido.
 *
 * Qué detecta y qué NO: usa el estado del navegador, que dice si hay red. No
 * comprueba si nuestro servidor responde, así que un VPS caído con internet
 * funcionando no se ve aquí. Es deliberado: vigilar el servidor exigiría
 * peticiones periódicas en segundo plano, y el caso frecuente —y el que el
 * usuario puede resolver— es quedarse sin red.
 */

/** Cuánto se queda el aviso verde al recuperar la conexión. */
const MS_AVISO_VUELTA = 4000

export default function AvisoSinConexion() {
  // Se empieza SIEMPRE como "hay conexión", aunque no la haya: `navigator` no
  // existe al renderizar en el servidor, y arrancar con otro valor haría que el
  // HTML del servidor y el del navegador no coincidieran (error de hidratación).
  // El estado real se comprueba en cuanto monta, unos milisegundos después.
  const [sinConexion, setSinConexion] = useState(false)
  const [volvio, setVolvio] = useState(false)

  useEffect(() => {
    // Estado real al montar: si ya se cargó sin red, hay que avisar igualmente.
    if (!navigator.onLine) setSinConexion(true)

    const alPerder = () => {
      setSinConexion(true)
      setVolvio(false)
    }

    const alRecuperar = () => {
      setSinConexion(false)
      setVolvio(true)
    }

    window.addEventListener('offline', alPerder)
    window.addEventListener('online', alRecuperar)

    return () => {
      window.removeEventListener('offline', alPerder)
      window.removeEventListener('online', alRecuperar)
    }
  }, [])

  // El aviso de vuelta se retira solo: es una confirmación, no un estado.
  useEffect(() => {
    if (!volvio) return
    const t = setTimeout(() => setVolvio(false), MS_AVISO_VUELTA)
    return () => clearTimeout(t)
  }, [volvio])

  if (!sinConexion && !volvio) return null

  return (
    <div
      className={`${styles.barra} ${sinConexion ? styles.caida : styles.vuelta}`}
      // `status` y no `alert`: se anuncia sin interrumpir lo que el usuario esté
      // haciendo, que es lo correcto para un cambio de estado del entorno.
      role="status"
      aria-live="polite"
    >
      <span className={styles.icono} aria-hidden>
        {sinConexion ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path strokeLinecap="round" d="M1 1l22 22" />
            <path strokeLinecap="round" d="M16.7 11.7a6 6 0 00-4.4-1.7M5 12.5a11 11 0 015-2.4M2 8.8a16 16 0 015.6-3.2M12 20h.01" />
            <path strokeLinecap="round" d="M22 8.8a16 16 0 00-6.3-3.4" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>

      <span className={styles.texto}>
        {sinConexion ? (
          <>
            <strong>Sin conexión a internet.</strong> Los cambios no se están guardando; se
            reanudará solo al volver la señal.
          </>
        ) : (
          <>
            <strong>Conexión restablecida.</strong> Ya puedes continuar.
          </>
        )}
      </span>
    </div>
  )
}
