'use client'

/**
 * Las recetas de trabajo del nutriólogo, listas para aplicar.
 * ------------------------------------------------------------
 * Aparece al empezar un cuadro. Cada plantilla guarda lo que no depende del
 * paciente —fórmula, macros, equivalentes y reparto en tiempos—, así que
 * aplicarla deja solo el peso, la talla y la edad por capturar.
 *
 * No se muestra si no hay ninguna guardada: una fila vacía explicando que
 * podrías tener plantillas ocupa sitio y no ayuda a quien todavía no las usa.
 */

import { useCallback, useEffect, useState } from 'react'
import styles from './PlantillasDieta.module.css'

export interface PlantillaDieta {
  id: string
  nombre: string
  objetivo: string
  nivel_actividad: string
  formula: string
  pct_proteina: number
  pct_grasa: number
  pct_carbohidrato: number
  ajuste_kcal_custom: number | null
  equivalentes: Record<string, number> | null
  distribucion_tiempos: { tiempos?: unknown[]; reparto?: Record<string, unknown> } | null
  kcal_referencia: number | null
}

interface Props {
  /** Aplica la receta al formulario del cuadro. */
  onAplicar: (p: PlantillaDieta) => void
  /** Se llama tras borrar, por si la pantalla quiere reaccionar. */
  onCambio?: () => void
  /** Sube al padre cuántas hay, para decidir si ofrecer guardar. */
  onContar?: (n: number) => void
  /** Cambia al guardar una nueva: fuerza recargar la lista. */
  refresco?: number
  soloLectura?: boolean
}

const NOMBRE_OBJETIVO: Record<string, string> = {
  BAJAR_PESO: 'Bajar peso',
  MANTENER: 'Mantener',
  SUBIR_PESO: 'Subir peso',
}

export default function PlantillasDieta({
  onAplicar,
  onCambio,
  onContar,
  refresco = 0,
  soloLectura = false,
}: Props) {
  const [plantillas, setPlantillas] = useState<PlantillaDieta[]>([])
  const [cargando, setCargando] = useState(true)
  const [aplicada, setAplicada] = useState<string | null>(null)
  const [borrando, setBorrando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/dietas/plantillas')
      if (!res.ok) throw new Error('fallo')
      const d = await res.json()
      setPlantillas(d.plantillas ?? [])
      onContar?.(d.plantillas?.length ?? 0)
    } catch {
      // Un fallo aquí no debe estorbar: el cuadro se llena igual a mano.
      setPlantillas([])
      onContar?.(0)
    } finally {
      setCargando(false)
    }
  }, [onContar])

  useEffect(() => {
    void cargar()
  }, [cargar, refresco])

  /** Confirma visualmente que se aplicó, y se apaga solo. */
  const aplicar = (p: PlantillaDieta) => {
    onAplicar(p)
    setAplicada(p.id)
    setTimeout(() => setAplicada((id) => (id === p.id ? null : id)), 1600)
  }

  const borrar = async (id: string) => {
    setBorrando(id)
    try {
      const res = await fetch(`/api/dietas/plantillas/${id}`, { method: 'DELETE' })
      if (res.ok) {
        // Se espera a que termine la animación de salida antes de quitarla.
        setTimeout(() => {
          setPlantillas((prev) => prev.filter((p) => p.id !== id))
          setBorrando(null)
          onCambio?.()
        }, 200)
      } else {
        setBorrando(null)
      }
    } catch {
      setBorrando(null)
    }
  }

  // Mientras carga no se reserva sitio: aparecería un hueco vacío en la
  // mayoría de los casos, porque casi nadie tiene plantillas al principio.
  if (cargando || plantillas.length === 0) return null

  return (
    <section className={styles.contenedor} aria-label="Plantillas guardadas">
      <div className={styles.cabecera}>
        <h3 className={styles.titulo}>Empezar desde una plantilla</h3>
        <span className={styles.cuenta}>
          {plantillas.length} {plantillas.length === 1 ? 'guardada' : 'guardadas'}
        </span>
      </div>

      <ul className={styles.lista}>
        {plantillas.map((p, i) => (
          <li
            key={p.id}
            className={`${styles.item} ${borrando === p.id ? styles.itemSaliendo : ''}`}
            style={{ animationDelay: `${i * 45}ms` }}
          >
            <button
              type="button"
              className={`${styles.tarjeta} ${aplicada === p.id ? styles.tarjetaAplicada : ''}`}
              onClick={() => aplicar(p)}
              disabled={soloLectura || borrando === p.id}
              title={soloLectura ? 'La dieta está guardada' : `Aplicar «${p.nombre}»`}
            >
              <span className={styles.nombre}>{p.nombre}</span>

              <span className={styles.receta}>
                {p.kcal_referencia ? `≈ ${Math.round(p.kcal_referencia)} kcal · ` : ''}
                {NOMBRE_OBJETIVO[p.objetivo] ?? p.objetivo}
              </span>

              <span className={styles.macros}>
                <span className={styles.macro}>P{Math.round(p.pct_proteina)}</span>
                <span className={styles.macro}>G{Math.round(p.pct_grasa)}</span>
                <span className={styles.macro}>C{Math.round(p.pct_carbohidrato)}</span>
                {p.equivalentes && Object.keys(p.equivalentes).length > 0 && (
                  <span className={styles.conEquiv}>
                    {Object.keys(p.equivalentes).length} grupos
                  </span>
                )}
              </span>

              {/* La confirmación va dentro de la tarjeta: aparece donde estaba
                  el cursor, sin desplazar nada de la página. */}
              <span className={styles.confirmacion} aria-hidden>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                </svg>
                Aplicada
              </span>
            </button>

            {!soloLectura && (
              <button
                type="button"
                className={styles.borrar}
                onClick={() => void borrar(p.id)}
                disabled={borrando === p.id}
                title={`Quitar «${p.nombre}»`}
                aria-label={`Quitar la plantilla ${p.nombre}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
