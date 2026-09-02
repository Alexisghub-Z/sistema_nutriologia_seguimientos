'use client'

/**
 * Vista previa de la hoja del paciente, antes de descargarla.
 * ------------------------------------------------------------
 * El PDF se ve ANTES de entregarlo, no después: es un documento que sale del
 * consultorio con el nombre del nutriólogo, y descubrir una porción mal escrita
 * cuando el paciente ya lo tiene en la mano no tiene arreglo.
 */

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer'
import {
  DocumentoDieta,
  OPCIONES_POR_DEFECTO,
  type DatosDocumento,
  type OpcionesDocumento,
} from '@/lib/dietas/documento-dieta'
import styles from './VistaPreviaDieta.module.css'

interface Props {
  datos: DatosDocumento
  onCerrar: () => void
}

/** Nombre del archivo: reconocible en la carpeta de descargas. */
function nombreArchivo(paciente: string): string {
  const limpio = paciente
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `plan-${limpio || 'paciente'}.pdf`
}

/**
 * Qué se puede añadir o quitar de la hoja.
 *
 * La descripción explica PARA QUIÉN sirve cada dato, no qué hace: la decisión
 * de incluir los macros no es técnica, es sobre si este paciente concreto los
 * va a entender.
 */
const AJUSTES: Array<{
  campo: keyof OpcionesDocumento
  nombre: string
  ayuda: string
}> = [
  {
    campo: 'indicaciones',
    nombre: 'Indicaciones generales',
    ayuda: 'Lo que escribiste al inicio del plan',
  },
  {
    campo: 'metaCalorica',
    nombre: 'Meta calórica',
    ayuda: 'Las kcal diarias del plan',
  },
  {
    campo: 'macros',
    nombre: 'Proteína, grasas y carbohidratos',
    ayuda: 'En gramos. Útil si el paciente ya los conoce',
  },
  {
    campo: 'kcalPorTiempo',
    nombre: 'Kcal de cada tiempo',
    ayuda: 'Junto al nombre de cada comida',
  },
  {
    campo: 'restricciones',
    nombre: 'Alergias e intolerancias',
    ayuda: 'Por escrito, para que no se olviden',
  },
  {
    campo: 'notasTiempo',
    nombre: 'Notas de cada tiempo',
    ayuda: 'Las indicaciones sueltas que añadiste',
  },
  {
    campo: 'espacioNotas',
    nombre: 'Renglones para apuntar',
    ayuda: 'Espacio en blanco al final de la hoja',
  },
]

export default function VistaPreviaDieta({ datos, onCerrar }: Props) {
  const [montado, setMontado] = useState(false)
  const [opciones, setOpciones] = useState<OpcionesDocumento>(OPCIONES_POR_DEFECTO)

  // El visor de PDF solo funciona en el navegador.
  useEffect(() => setMontado(true), [])

  // Escape cierra, y el fondo no se desplaza mientras el visor está abierto.
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

  if (!montado) return null

  const doc = (
    <DocumentoDieta
      datos={datos}
      opciones={opciones}
      logo="/word/encabezado.png"
      manzana="/word/fondo.png"
    />
  )

  // Un dato que la dieta no tiene no se puede ofrecer: marcarlo solo dejaría
  // la casilla encendida sin que cambie nada en la hoja.
  const disponible: Record<keyof OpcionesDocumento, boolean> = {
    indicaciones: !!datos.indicacionesInicio,
    metaCalorica: !!datos.kcalMeta,
    macros: !!datos.macros,
    kcalPorTiempo: datos.tiempos.some((t) => !!t.kcal),
    restricciones: !!datos.restricciones?.length,
    notasTiempo: datos.tiempos.some((t) => !!t.nota),
    espacioNotas: true,
  }

  return createPortal(
    <div className={styles.fondo} onClick={onCerrar} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <header className={styles.cabecera}>
          <div>
            <h2 className={styles.titulo}>Plan de {datos.paciente}</h2>
            <p className={styles.subtitulo}>Así lo recibirá el paciente</p>
          </div>

          <div className={styles.acciones}>
            <PDFDownloadLink
              document={doc}
              fileName={nombreArchivo(datos.paciente)}
              className={styles.descargar}
            >
              {({ loading }) => (loading ? 'Preparando…' : 'Descargar PDF')}
            </PDFDownloadLink>

            <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </header>

        <div className={styles.cuerpo}>
          <aside className={styles.ajustes}>
            <h3 className={styles.ajustesTitulo}>Qué incluir</h3>
            <ul className={styles.ajustesLista}>
              {AJUSTES.map(({ campo, nombre, ayuda }) => {
                const hayDato = disponible[campo]
                return (
                  <li key={campo}>
                    <label
                      className={`${styles.ajuste} ${hayDato ? '' : styles.ajusteVacio}`}
                      title={hayDato ? ayuda : 'Esta dieta no tiene ese dato'}
                    >
                      <input
                        type="checkbox"
                        className={styles.casilla}
                        checked={hayDato && opciones[campo]}
                        disabled={!hayDato}
                        onChange={(e) =>
                          setOpciones((o) => ({ ...o, [campo]: e.target.checked }))
                        }
                      />
                      <span className={styles.ajusteTexto}>
                        <span className={styles.ajusteNombre}>{nombre}</span>
                        <span className={styles.ajusteAyuda}>
                          {hayDato ? ayuda : 'No hay este dato en la dieta'}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              className={styles.restablecer}
              onClick={() => setOpciones(OPCIONES_POR_DEFECTO)}
            >
              Volver a lo básico
            </button>
          </aside>

          <div className={styles.visor}>
            {/* La `key` remonta el visor al cambiar una opción: sin ella el
                PDF se queda como estaba y la vista previa mentiría. */}
            <PDFViewer
              key={JSON.stringify(opciones)}
              width="100%"
              height="100%"
              showToolbar={false}
            >
              {doc}
            </PDFViewer>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
