'use client'

/**
 * Qué cambió entre dos dietas del paciente.
 * ------------------------------------------------------------
 * Se abre desde el historial con dos cuadros marcados. Sirve en dos momentos
 * distintos y por eso tiene dos niveles: arriba el resumen clínico, que es lo
 * que se le enseña al paciente en consulta; abajo, plegado, el detalle
 * técnico con el que el nutriólogo decide el plan siguiente.
 *
 * Los datos se piden aquí y no en la pantalla padre porque solo hacen falta al
 * abrir: el historial ya trae lo justo para pintar las tarjetas, y cargar el
 * contenido de todas las dietas por si acaso sería trabajo tirado.
 */

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  compararDietas,
  type Comparacion,
  type DietaComparable,
} from '@/lib/dietas/comparar'
import styles from './CompararDietas.module.css'

interface Props {
  /** Los dos cuadros marcados en el historial. */
  cuadroIds: [string, string]
  onCerrar: () => void
}

/** Etiquetas del objetivo, como se leen en el resto de la aplicación. */
const NOMBRE_OBJETIVO: Record<string, string> = {
  BAJAR_PESO: 'Bajar peso',
  MANTENER: 'Mantener',
  SUBIR_PESO: 'Subir peso',
}

/** Respuesta de `GET /api/dietas/cuadros/[id]`, en lo que aquí se usa. */
interface CuadroRespuesta {
  id: string
  createdAt: string
  peso: number | null
  imc: number | null
  kcal_meta: number | null
  objetivo: string | null
  equivalentes: Record<string, number> | null
  dietas: Array<{ id: string; modo: 'DIETA' | 'RECETARIO'; contenido: unknown; createdAt: string }>
}

/** Fecha corta y legible: "12 jun 2026". */
function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Si un cambio es el deseado, según el objetivo del plan.
 *
 * El signo por sí solo no dice nada: bajar de peso es lo buscado en un déficit
 * y un problema en uno de volumen. Pintar toda bajada de verde daría por buena
 * una pérdida en un paciente al que se quiere hacer subir.
 */
function sentidoDelCambio(
  etiqueta: string,
  delta: number,
  objetivo: string | null
): 'favorable' | 'contrario' | 'neutro' {
  if (delta === 0) return 'neutro'
  // La meta calórica la fija el nutriólogo: que suba o baje es una decisión
  // suya, no un resultado del paciente.
  if (etiqueta === 'Meta diaria') return 'neutro'
  if (objetivo === 'BAJAR_PESO') return delta < 0 ? 'favorable' : 'contrario'
  if (objetivo === 'SUBIR_PESO') return delta > 0 ? 'favorable' : 'contrario'
  // Mantener, o sin objetivo: no hay dirección deseada que juzgar.
  return 'neutro'
}

/** "+4.3" / "−1.5", con el menos tipográfico. */
function conSigno(n: number, decimales: number): string {
  const fijo = Math.abs(n).toFixed(decimales)
  if (n === 0) return `0${decimales > 0 ? `.${'0'.repeat(decimales)}` : ''}`
  return `${n > 0 ? '+' : '−'}${fijo}`
}

export default function CompararDietas({ cuadroIds, onCerrar }: Props) {
  const [comparacion, setComparacion] = useState<Comparacion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detalleAbierto, setDetalleAbierto] = useState(false)

  // Escape cierra, y el fondo no se desplaza mientras el modal está abierto.
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPulsar)
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = overflowPrevio
    }
  }, [onCerrar])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const [a, b] = await Promise.all(
        cuadroIds.map(async (id) => {
          const res = await fetch(`/api/dietas/cuadros/${id}`)
          if (!res.ok) throw new Error('No se pudo leer el cuadro')
          const { cuadro } = (await res.json()) as { cuadro: CuadroRespuesta }
          return cuadro
        })
      )
      if (!a || !b) throw new Error('Faltan datos del cuadro')

      const comoComparable = (c: CuadroRespuesta): DietaComparable | null => {
        // Se compara la dieta más reciente de cada cuadro, que es la que el
        // nutriólogo dio por buena.
        const dieta = c.dietas[0]
        if (!dieta) return null
        return {
          id: dieta.id,
          modo: dieta.modo,
          fecha: dieta.createdAt,
          contenido: dieta.contenido,
          equivalentes: c.equivalentes ?? null,
          cuadro: {
            peso: c.peso,
            imc: c.imc,
            kcalMeta: c.kcal_meta,
            objetivo: c.objetivo,
          },
        }
      }

      const ca = comoComparable(a)
      const cb = comoComparable(b)
      if (!ca || !cb) {
        setError('Uno de los cuadros no tiene dieta guardada')
        return
      }
      setComparacion(compararDietas(ca, cb))
    } catch {
      setError('No se pudieron cargar las dietas. Inténtalo otra vez.')
    } finally {
      setCargando(false)
    }
  }, [cuadroIds])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const objetivo = comparacion?.nueva.cuadro.objetivo ?? null

  /** Qué hay dentro del detalle, en pocas palabras. */
  const resumenDelDetalle = (() => {
    if (!comparacion) return ''
    const grupos = comparacion.grupos.filter((g) => g.delta !== 0).length
    const alimentos = (comparacion.platillos ?? []).reduce(
      (n, t) => n + t.entraron.length + t.salieron.length,
      0
    )
    const partes: string[] = []
    if (grupos > 0) partes.push(`${grupos} ${grupos === 1 ? 'grupo' : 'grupos'}`)
    if (alimentos > 0) partes.push(`${alimentos} ${alimentos === 1 ? 'alimento' : 'alimentos'}`)
    return partes.length > 0 ? partes.join(' · ') : 'sin cambios'
  })()

  return createPortal(
    <div className={styles.fondo} onClick={onCerrar} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.cabecera}>
          <div>
            <h2 className={styles.titulo}>Qué cambió</h2>
            {comparacion && (
              <p className={styles.subtitulo}>
                {fechaCorta(comparacion.anterior.fecha)} → {fechaCorta(comparacion.nueva.fecha)}
                {comparacion.diasEntre > 0 && ` · ${comparacion.diasEntre} días`}
              </p>
            )}
          </div>
          <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>

        <div className={styles.cuerpo}>
          {cargando && (
            <div className={styles.estado}>
              <div className={styles.esqueleto} />
              <div className={styles.esqueleto} />
            </div>
          )}

          {error && !cargando && (
            <div className={styles.estado}>
              <p className={styles.errorTexto}>{error}</p>
              <button type="button" className={styles.reintentar} onClick={() => void cargar()}>
                Reintentar
              </button>
            </div>
          )}

          {comparacion && !cargando && !error && (
            <>
              {/* ── Resumen clínico: lo que se le enseña al paciente ── */}
              {/* Que el paciente vuelva igual es un resultado en sí mismo, y
                  tres filas de "78.5 → 78.5" no lo dicen: obligan a leer seis
                  cifras para deducir que ninguna se movió. */}
              {comparacion.contexto.length > 0 && comparacion.contexto.every((c) => c.delta === 0) && (
                <p className={styles.todoIgual}>
                  Las medidas no cambiaron entre las dos consultas.
                </p>
              )}

              {comparacion.contexto.length > 0 ? (
                <section className={styles.resumen}>
                  {comparacion.contexto.map((c) => {
                    const sentido = sentidoDelCambio(c.etiqueta, c.delta, objetivo)
                    return (
                      <div key={c.etiqueta} className={styles.cifra}>
                        <span className={styles.cifraEtiqueta}>{c.etiqueta}</span>
                        <span className={styles.cifraValores}>
                          <span className={styles.cifraAntes}>
                            {c.antes.toFixed(c.decimales)}
                          </span>
                          <span className={styles.flecha} aria-hidden>
                            →
                          </span>
                          <span className={styles.cifraDespues}>
                            {c.despues.toFixed(c.decimales)}
                            {c.unidad && <span className={styles.unidad}> {c.unidad}</span>}
                          </span>
                        </span>
                        <span className={`${styles.delta} ${styles[`delta_${sentido}`]}`}>
                          {conSigno(c.delta, c.decimales)}
                          {c.unidad && ` ${c.unidad}`}
                        </span>
                      </div>
                    )
                  })}
                </section>
              ) : (
                <p className={styles.sinDatos}>
                  Estos cuadros no tienen medidas para comparar.
                </p>
              )}

              {objetivo && (
                <p className={styles.objetivo}>
                  Objetivo del plan: <strong>{NOMBRE_OBJETIVO[objetivo] ?? objetivo}</strong>
                </p>
              )}

              {/* ── Detalle técnico: plegado, para el nutriólogo ── */}
              <button
                type="button"
                className={styles.plegable}
                onClick={() => setDetalleAbierto((v) => !v)}
                aria-expanded={detalleAbierto}
              >
                <span className={`${styles.plegableFlecha} ${detalleAbierto ? styles.plegableAbierto : ''}`} aria-hidden>
                  ▸
                </span>
                Detalle técnico
                {/* Cuántos cambios hay dentro: sin este dato hay que abrir
                    el detalle para saber si merece la pena abrirlo. */}
                <span className={styles.plegablePista}>{resumenDelDetalle}</span>
              </button>

              {detalleAbierto && (
                <div className={styles.detalle}>
                  {/* Equivalentes por grupo */}
                  <h3 className={styles.detalleTitulo}>Equivalentes por grupo</h3>
                  {comparacion.grupos.some((g) => g.delta !== 0) ? (
                    <ul className={styles.grupos}>
                      {comparacion.grupos
                        .filter((g) => g.delta !== 0)
                        .map((g) => (
                          <li key={g.grupo} className={styles.grupo}>
                            <span className={styles.grupoNombre}>{g.nombre}</span>
                            <span className={styles.grupoValores}>
                              {g.antes} → {g.despues}
                            </span>
                            <span
                              className={`${styles.delta} ${
                                g.delta > 0 ? styles.delta_sube : styles.delta_baja
                              }`}
                            >
                              {conSigno(g.delta, g.delta % 1 === 0 ? 0 : 1)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className={styles.sinCambios}>Los equivalentes no cambiaron.</p>
                  )}

                  {/* Alimentos, tiempo a tiempo */}
                  <h3 className={styles.detalleTitulo}>Alimentos</h3>
                  {comparacion.platillos ? (
                    comparacion.platillos.some(
                      (t) => t.entraron.length > 0 || t.salieron.length > 0
                    ) ? (
                      <ul className={styles.tiempos}>
                        {comparacion.platillos
                          .filter((t) => t.entraron.length > 0 || t.salieron.length > 0)
                          .map((t) => (
                            <li key={t.tiempo} className={styles.tiempo}>
                              <span className={styles.tiempoNombre}>{t.tiempo}</span>
                              <div className={styles.alimentos}>
                                {t.salieron.map((a) => (
                                  <span key={`-${a}`} className={styles.salio}>
                                    − {a}
                                  </span>
                                ))}
                                {t.entraron.map((a) => (
                                  <span key={`+${a}`} className={styles.entro}>
                                    + {a}
                                  </span>
                                ))}
                              </div>
                              {t.siguen.length > 0 && (
                                <span className={styles.siguen}>
                                  {t.siguen.length}{' '}
                                  {t.siguen.length === 1 ? 'alimento sigue' : 'alimentos siguen'}
                                </span>
                              )}
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className={styles.sinCambios}>Los alimentos son los mismos.</p>
                    )
                  ) : (
                    <p className={styles.sinCambios}>
                      {comparacion.motivoSinPlatillos === 'modos_distintos'
                        ? 'Una es dieta y la otra recetario: solo se comparan peso y meta.'
                        : 'El contenido de una de las dietas no se puede leer.'}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
