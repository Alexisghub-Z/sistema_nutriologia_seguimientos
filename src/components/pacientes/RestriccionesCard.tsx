'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import styles from './RestriccionesCard.module.css'

export interface Restricciones {
  alergias: string | null
  intolerancias: string | null
  preferencias: string | null
  disgustos: string | null
}

interface Props {
  pacienteId: string
  valores: Restricciones
}

/** Iconos por categoría: cada restricción se reconoce sin leer la etiqueta. */
const ICONOS = {
  alergias: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" d="M12 9v4M12 17v.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 3.9L2.4 17.1A2 2 0 004.1 20h15.8a2 2 0 001.7-2.9L13.7 3.9a2 2 0 00-3.4 0z" />
    </svg>
  ),
  intolerancias: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M5.6 5.6l12.8 12.8" />
    </svg>
  ),
  preferencias: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-4.6-7-9.6A4.4 4.4 0 0112 8a4.4 4.4 0 017 3.4c0 5-7 9.6-7 9.6z" />
    </svg>
  ),
  disgustos: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M8.5 15.5s1.2-1.5 3.5-1.5 3.5 1.5 3.5 1.5M9 9.5v.5M15 9.5v.5" />
    </svg>
  ),
} as const

/** Los cuatro campos, con su gravedad: la alergia es la única de riesgo. */
const CAMPOS = [
  {
    clave: 'alergias' as const,
    etiqueta: 'Alergias',
    ayuda: 'Riesgo para su salud: la IA nunca los propondrá',
    placeholder: 'Ej. mariscos, cacahuate',
    critico: true,
  },
  {
    clave: 'intolerancias' as const,
    etiqueta: 'Intolerancias',
    ayuda: 'Le causan malestar',
    placeholder: 'Ej. lactosa, gluten',
    critico: false,
  },
  {
    clave: 'preferencias' as const,
    etiqueta: 'Preferencias',
    ayuda: 'Decisión personal',
    placeholder: 'Ej. vegetariano, no come cerdo',
    critico: false,
  },
  {
    clave: 'disgustos' as const,
    etiqueta: 'No le gustan',
    ayuda: 'Se evitarán si hay alternativa',
    placeholder: 'Ej. brócoli, hígado',
    critico: false,
  },
]

/**
 * Restricciones alimentarias del paciente. Van en el paciente y no en cada
 * consulta porque no cambian entre visitas: se capturan una vez y aplican a
 * todas sus dietas.
 */
export default function RestriccionesCard({ pacienteId, valores }: Props) {
  const toast = useToast()
  const [datos, setDatos] = useState<Restricciones>(valores)
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState<Restricciones>(valores)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const hayAlgo = Object.values(datos).some((v) => v?.trim())

  const empezar = () => {
    setBorrador(datos)
    setError('')
    setEditando(true)
  }

  const cancelar = () => {
    setBorrador(datos)
    setError('')
    setEditando(false)
  }

  const guardar = async () => {
    setGuardando(true)
    setError('')
    try {
      const res = await fetch(`/api/pacientes/${pacienteId}/restricciones`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alergias: borrador.alergias ?? '',
          intolerancias: borrador.intolerancias ?? '',
          preferencias: borrador.preferencias ?? '',
          disgustos: borrador.disgustos ?? '',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setDatos(data.paciente)
        setEditando(false)
        // Al salir del modo edición el formulario desaparece: sin aviso, no
        // queda claro si se guardó. Y estas son restricciones clínicas.
        toast.exito('Restricciones actualizadas', {
          descripcion: 'La IA las tendrá en cuenta al generar dietas.',
        })
      } else {
        setError(data.error || 'No se pudieron guardar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className={styles.card}>
      <CardHeader>
        <div className={styles.cabecera}>
          <CardTitle>Restricciones alimentarias</CardTitle>
          {!editando && (
            <button className={styles.editarBtn} onClick={empezar}>
              {hayAlgo ? 'Editar' : 'Añadir'}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {editando ? (
          <div className={styles.formulario}>
            {CAMPOS.map((c) => (
              <div key={c.clave} className={styles.campo}>
                <label className={styles.etiqueta} htmlFor={`restr-${c.clave}`}>
                  {c.etiqueta}
                  {c.critico && <span className={styles.marcaCritica}>importante</span>}
                </label>
                <input
                  id={`restr-${c.clave}`}
                  className={`${styles.input} ${c.critico ? styles.inputCritico : ''}`}
                  value={borrador[c.clave] ?? ''}
                  onChange={(e) => setBorrador({ ...borrador, [c.clave]: e.target.value })}
                  placeholder={c.placeholder}
                  maxLength={500}
                />
                <span className={styles.ayuda}>{c.ayuda}</span>
              </div>
            ))}

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.acciones}>
              <Button variant="secondary" onClick={cancelar} disabled={guardando}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        ) : hayAlgo ? (
          <div className={styles.lista}>
            {CAMPOS.filter((c) => datos[c.clave]?.trim()).map((c) => (
              <div
                key={c.clave}
                className={`${styles.item} ${c.critico ? styles.itemCritico : ''}`}
              >
                <span className={styles.itemIcono}>{ICONOS[c.clave]}</span>
                <div className={styles.itemContenido}>
                  <span className={styles.itemEtiqueta}>
                    {c.etiqueta}
                    {c.critico && <span className={styles.itemAviso}>evitar siempre</span>}
                  </span>
                  {/* Cada término como etiqueta propia: se leen mejor que una
                      cadena separada por comas. */}
                  <span className={styles.itemTerminos}>
                    {(datos[c.clave] ?? '')
                      .split(/[,;]+/)
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((t, i) => (
                        <span
                          key={i}
                          className={`${styles.termino} ${c.critico ? styles.terminoCritico : ''}`}
                        >
                          {t}
                        </span>
                      ))}
                  </span>
                </div>
              </div>
            ))}
            <p className={styles.nota}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 16v-5M12 8v.5" />
              </svg>
              La IA las respeta al generar cualquier dieta de este paciente.
            </p>
          </div>
        ) : (
          <div className={styles.vacio}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className={styles.vacioTitulo}>Sin restricciones registradas</p>
            <p className={styles.vacioPista}>
              Añádelas para que la IA las respete al generar sus dietas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
