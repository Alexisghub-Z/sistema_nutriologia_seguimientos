'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './ListaPacientes.module.css'

/**
 * Los pacientes, listos para elegir a quién hacerle una dieta.
 * ------------------------------------------------------------
 * La pantalla arrancaba vacía: el buscador solo mostraba resultados al
 * escribir dos letras, así que había que recordar el nombre de memoria.
 *
 * Se presentan en filas de una sola línea y paginadas de cinco en cinco: con
 * tarjetas grandes la lista empujaba el resumen de trabajo fuera de la
 * pantalla, y esta sección es un punto de partida, no el contenido principal.
 * Cada fila lleva lo justo para decidir —cuándo vino, con qué peso, si ya
 * tiene dieta— sin robarle sitio a lo demás.
 */

export interface PacienteConContexto {
  id: string
  nombre: string
  email: string
  ultima_consulta: string | null
  ultimo_peso: number | null
  proxima_cita: string | null
  ultima_dieta: string | null
  dieta_finalizada: boolean
}

interface Props {
  /** Texto del buscador de arriba: filtra esta misma lista. */
  filtro: string
  onElegir: (p: { id: string; nombre: string; email: string }) => void
}

/** Cuántos caben sin que la sección domine la pantalla. */
const POR_PAGINA = 5

/** "3 d", "2 mes" — abreviado, porque va en una línea junto al nombre. */
function haceCuanto(iso: string | null): string {
  if (!iso) return ''
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias < 0) return ''
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `${dias} d`
  const meses = Math.round(dias / 30)
  return `${meses} mes${meses === 1 ? '' : 'es'}`
}

/** "17 abr", anclado a México como el resto del sistema. */
function fechaCorta(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Mexico_City',
  })
}

export default function ListaPacientes({ filtro, onElegir }: Props) {
  const [pacientes, setPacientes] = useState<PacienteConContexto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [pagina, setPagina] = useState(1)

  // Se carga una vez y se filtra en memoria: a la escala de un consultorio son
  // decenas de pacientes, y así responde al instante mientras se escribe.
  useEffect(() => {
    let vigente = true
    fetch('/api/dietas/pacientes')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('fallo'))))
      .then((d) => {
        if (vigente) setPacientes(d.pacientes ?? [])
      })
      .catch(() => {
        if (vigente) setError(true)
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  const texto = filtro.trim().toLowerCase()
  const visibles = useMemo(
    () =>
      texto
        ? pacientes.filter(
            (p) =>
              p.nombre.toLowerCase().includes(texto) || p.email.toLowerCase().includes(texto)
          )
        : pacientes,
    [pacientes, texto]
  )

  // Al filtrar se vuelve a la primera página: quedarse en la 3 mostraría un
  // hueco vacío cuando la búsqueda deja menos resultados.
  useEffect(() => {
    setPagina(1)
  }, [texto])

  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const enPantalla = visibles.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA)

  // Un fallo aquí no debe tapar el buscador, que funciona por su cuenta.
  if (error) return null

  if (cargando) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.esqueleto} />
        <div className={styles.esqueleto} />
        <div className={styles.esqueleto} />
      </div>
    )
  }

  if (pacientes.length === 0) {
    return (
      <div className={styles.contenedor}>
        <p className={styles.vacio}>
          Aún no tienes pacientes registrados. Da de alta uno para hacerle su dieta.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.encabezado}>
        <h2 className={styles.titulo}>Elige un paciente</h2>
        {totalPaginas > 1 && (
          <div className={styles.paginacion}>
            <button
              type="button"
              className={styles.pagBoton}
              onClick={() => setPagina((n) => Math.max(1, n - 1))}
              disabled={paginaSegura === 1}
              aria-label="Página anterior"
            >
              ‹
            </button>
            <span className={styles.pagTexto}>
              {paginaSegura} / {totalPaginas}
            </span>
            <button
              type="button"
              className={styles.pagBoton}
              onClick={() => setPagina((n) => Math.min(totalPaginas, n + 1))}
              disabled={paginaSegura === totalPaginas}
              aria-label="Página siguiente"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {visibles.length === 0 ? (
        <p className={styles.vacio}>Ningún paciente coincide con «{filtro.trim()}».</p>
      ) : (
        <ul className={styles.lista}>
          {enPantalla.map((p) => {
            const cita = fechaCorta(p.proxima_cita)
            const consulta = haceCuanto(p.ultima_consulta)

            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={styles.fila}
                  onClick={() => onElegir({ id: p.id, nombre: p.nombre, email: p.email })}
                >
                  <span className={styles.avatar} aria-hidden>
                    {p.nombre.charAt(0).toUpperCase()}
                  </span>

                  <span className={styles.nombre}>{p.nombre}</span>

                  {/* Contexto condensado: se mantiene en una línea y en móvil
                      se oculta lo secundario antes que romper la fila. */}
                  <span className={styles.contexto}>
                    {consulta && (
                      <span className={styles.dato}>
                        {consulta}
                        {p.ultimo_peso != null && ` · ${p.ultimo_peso} kg`}
                      </span>
                    )}
                    {cita && <span className={styles.chipCita}>Cita {cita}</span>}
                    {!p.ultima_dieta && <span className={styles.chipSinDieta}>Sin dieta</span>}
                  </span>

                  <svg
                    className={styles.flecha}
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 4l6 6-6 6" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
