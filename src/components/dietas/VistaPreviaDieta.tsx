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
import { DocumentoDieta, type DatosDocumento } from '@/lib/dietas/documento-dieta'
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

export default function VistaPreviaDieta({ datos, onCerrar }: Props) {
  const [montado, setMontado] = useState(false)

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

  const doc = <DocumentoDieta datos={datos} logo="/word/encabezado.png" manzana="/word/fondo.png" />

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

        <div className={styles.visor}>
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            {doc}
          </PDFViewer>
        </div>
      </div>
    </div>,
    document.body
  )
}
