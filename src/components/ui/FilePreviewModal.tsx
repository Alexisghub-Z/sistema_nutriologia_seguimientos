'use client'

import { useEffect } from 'react'
import styles from './FilePreviewModal.module.css'

interface FilePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  fileUrl: string
  fileName: string
  fileType: string
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: FilePreviewModalProps) {
  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isImage = fileType.startsWith('image/')
  const isPDF = fileType === 'application/pdf' || fileType.includes('pdf')

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>{fileName}</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isImage && (
            <div className={styles.imageContainer}>
              <img src={fileUrl} alt={fileName} className={styles.image} />
            </div>
          )}

          {isPDF && (
            <div className={styles.pdfContainer}>
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className={styles.pdfViewer}
                title={fileName}
              />
            </div>
          )}

          {!isImage && !isPDF && (
            <div className={styles.unsupportedContainer}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <h4>Vista previa no disponible</h4>
              <p>Este tipo de archivo no puede ser previsualizado en el navegador.</p>
              <p className={styles.downloadHint}>Usa el botón de descarga para ver el archivo.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <a
            href={fileUrl}
            download={fileName}
            className={styles.downloadButton}
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Descargar archivo
          </a>
        </div>
      </div>
    </div>
  )
}
