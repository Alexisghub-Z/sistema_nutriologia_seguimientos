'use client'

import styles from './PanelAlternativas.module.css'

export interface Alternativa {
  descripcion: string
  calculo?: string
  nota?: string
}

interface Props {
  cargando: boolean
  error: string
  alternativas: Alternativa[]
  onElegir: (alt: Alternativa) => void
  onCerrar: () => void
}

/**
 * Alternativas para un alimento concreto. Se despliega bajo el alimento y todas
 * las opciones cubren los mismos equivalentes, así que elegir cualquiera deja el
 * cuadre intacto.
 */
export default function PanelAlternativas({
  cargando,
  error,
  alternativas,
  onElegir,
  onCerrar,
}: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.cabecera}>
        <span className={styles.titulo}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l1.9 5.5L19.5 9l-5.6 1.5L12 16l-1.9-5.5L4.5 9l5.6-1.5L12 2z" />
          </svg>
          Otras opciones equivalentes
        </span>
        <button className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {cargando ? (
        <div className={styles.cargando}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 120}ms` }} />
          ))}
          <span className={styles.cargandoTexto}>Buscando opciones…</span>
        </div>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : (
        <ul className={styles.lista}>
          {alternativas.map((alt, i) => (
            <li key={i}>
              <button
                className={styles.opcion}
                onClick={() => onElegir(alt)}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className={styles.opcionTexto}>
                  <span className={styles.opcionDescripcion}>{alt.descripcion}</span>
                  {alt.nota && <span className={styles.opcionNota}>{alt.nota}</span>}
                </span>
                <span className={styles.opcionUsar}>Usar</span>
              </button>
              {alt.calculo && <span className={styles.opcionCalculo}>{alt.calculo}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
