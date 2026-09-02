'use client'

import { useEffect, useState } from 'react'
import styles from './ListaPacientes.module.css'

/**
 * Los pacientes, listos para elegir a quién hacerle una dieta.
 * ------------------------------------------------------------
 * La pantalla de dietas arrancaba vacía: el buscador solo mostraba resultados
 * al escribir dos letras, así que había que recordar el nombre de memoria.
 * Aquí se ven todos desde el primer momento, con el contexto que hace falta
 * para decidir por quién empezar: cuándo vino, cuánto pesaba y si ya tiene
 * dieta.
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

/** "hace 3 días", "hace 2 meses". Vacío si no hay fecha. */
function haceCuanto(iso: string | null): string {
  if (!iso) return ''
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias < 0) return ''
  if (dias === 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} días`
  const meses = Math.round(dias / 30)
  return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`
}

/** "17 abr" — fecha corta, anclada a México como el resto del sistema. */
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

  // Se carga una vez y se filtra en memoria: con la escala de un consultorio
  // son decenas de pacientes, y así el filtrado es instantáneo mientras escribe.
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
  const visibles = texto
    ? pacientes.filter(
        (p) =>
          p.nombre.toLowerCase().includes(texto) || p.email.toLowerCase().includes(texto)
      )
    : pacientes

  // Un fallo aquí no debe tapar el buscador, que sigue funcionando por su cuenta.
  if (error) return null

  if (cargando) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.esqueletoFila} />
        <div className={styles.esqueletoFila} />
        <div className={styles.esqueletoFila} />
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

  if (visibles.length === 0) {
    return (
      <div className={styles.contenedor}>
        <p className={styles.vacio}>Ningún paciente coincide con «{filtro.trim()}».</p>
      </div>
    )
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.encabezado}>
        <h2 className={styles.titulo}>Elige un paciente</h2>
        <span className={styles.cuenta}>
          {visibles.length} {visibles.length === 1 ? 'paciente' : 'pacientes'}
        </span>
      </div>

      <div className={styles.rejilla}>
        {visibles.map((p) => {
          const cita = fechaCorta(p.proxima_cita)
          const consulta = haceCuanto(p.ultima_consulta)
          const dieta = haceCuanto(p.ultima_dieta)

          return (
            <button
              key={p.id}
              type="button"
              className={styles.tarjeta}
              onClick={() => onElegir({ id: p.id, nombre: p.nombre, email: p.email })}
            >
              <span className={styles.avatar} aria-hidden>
                {p.nombre.charAt(0).toUpperCase()}
              </span>

              <span className={styles.datos}>
                <span className={styles.nombre}>{p.nombre}</span>

                <span className={styles.meta}>
                  {consulta ? (
                    <span className={styles.metaDato}>
                      Consulta {consulta}
                      {p.ultimo_peso != null && ` · ${p.ultimo_peso} kg`}
                    </span>
                  ) : (
                    <span className={styles.metaDato}>Sin consultas aún</span>
                  )}
                </span>

                <span className={styles.etiquetas}>
                  {/* La cita próxima es la señal más accionable: es a quien
                      verás pronto y para quien conviene tener la dieta lista. */}
                  {cita && <span className={`${styles.chip} ${styles.chipCita}`}>Cita {cita}</span>}
                  {dieta ? (
                    <span className={`${styles.chip} ${styles.chipDieta}`}>
                      {p.dieta_finalizada ? 'Dieta' : 'Borrador'} {dieta}
                    </span>
                  ) : (
                    <span className={`${styles.chip} ${styles.chipSinDieta}`}>Sin dieta</span>
                  )}
                </span>
              </span>

              <svg
                className={styles.flecha}
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 4l6 6-6 6" />
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}
