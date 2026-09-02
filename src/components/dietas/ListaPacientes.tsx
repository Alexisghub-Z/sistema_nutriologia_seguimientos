'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './ListaPacientes.module.css'
import {
  recomendar,
  type PacienteConContexto,
} from '@/lib/dietas/recomendaciones'

/**
 * A quién conviene hacerle una dieta ahora.
 * ------------------------------------------------------------
 * No es un listado de pacientes —para buscar a uno concreto está el buscador
 * de arriba, que funciona por su cuenta—, sino una recomendación: de todos los
 * pacientes, estos son los que piden atención.
 *
 * El orden sale de dos señales que el sistema ya tiene:
 *   - tiene cita próxima y aún no tiene dieta: hay que llevarla lista
 *   - vino a consulta hace poco y sigue sin dieta: es el seguimiento natural
 *
 * Un paciente con dieta reciente y sin cita no aparece: no hay nada que hacer
 * con él, y llenar el panel de esos casos lo volvería ruido.
 */

interface Props {
  onElegir: (p: { id: string; nombre: string; email: string }) => void
}

/** Cuántas caben sin que el panel domine la fila. */
const POR_PAGINA = 5

export default function ListaPacientes({ onElegir }: Props) {
  const [pacientes, setPacientes] = useState<PacienteConContexto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [pagina, setPagina] = useState(1)

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

  const recomendaciones = useMemo(() => recomendar(pacientes), [pacientes])

  const totalPaginas = Math.max(1, Math.ceil(recomendaciones.length / POR_PAGINA))
  const paginaSegura = Math.min(pagina, totalPaginas)
  const enPantalla = recomendaciones.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA
  )

  // Un fallo aquí no debe estorbar: el buscador sigue funcionando por su cuenta.
  if (error) return null

  if (cargando) {
    return (
      <section className={styles.contenedor}>
        <div className={styles.encabezado}>
          <h3 className={styles.titulo}>Pendientes de dieta</h3>
        </div>
        <div className={styles.cuerpo}>
          <div className={styles.esqueleto} />
          <div className={styles.esqueleto} />
          <div className={styles.esqueleto} />
        </div>
      </section>
    )
  }

  return (
    <section className={styles.contenedor}>
      <div className={styles.encabezado}>
        <h3 className={styles.titulo}>Pendientes de dieta</h3>
        {totalPaginas > 1 ? (
          <div className={styles.paginacion}>
            <button
              type="button"
              className={styles.pagBoton}
              onClick={() => setPagina((n) => Math.max(1, n - 1))}
              disabled={paginaSegura === 1}
              aria-label="Anteriores"
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
              aria-label="Siguientes"
            >
              ›
            </button>
          </div>
        ) : (
          recomendaciones.length > 0 && (
            <span className={styles.conteo}>{recomendaciones.length} en total</span>
          )
        )}
      </div>

      {recomendaciones.length === 0 ? (
        <div className={styles.vacio}>
          <svg
            className={styles.vacioIcono}
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className={styles.vacioTexto}>Todo al día</p>
          <p className={styles.vacioPista}>Ningún paciente espera su dieta</p>
        </div>
      ) : (
        <ul className={styles.lista}>
          {enPantalla.map(({ paciente: p, motivo, urgente }) => (
            <li key={p.id}>
              <button
                type="button"
                className={styles.fila}
                onClick={() => onElegir({ id: p.id, nombre: p.nombre, email: p.email })}
              >
                <span
                  className={`${styles.avatar} ${urgente ? styles.avatarUrgente : ''}`}
                  aria-hidden
                >
                  {p.nombre.charAt(0).toUpperCase()}
                </span>
                <span className={styles.datos}>
                  <span className={styles.nombre}>{p.nombre}</span>
                  <span className={`${styles.motivo} ${urgente ? styles.motivoUrgente : ''}`}>
                    {motivo}
                  </span>
                </span>
                <span className={styles.accion}>Crear</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
