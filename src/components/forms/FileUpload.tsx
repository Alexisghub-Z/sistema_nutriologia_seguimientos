'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import styles from './FileUpload.module.css'

interface FileWithPreview extends File {
  preview?: string
}

interface FileUploadProps {
  consultaId: string
  onUploadSuccess: (archivo: UploadedFile) => void
  categoria?: string
  descripcion?: string
}

export interface UploadedFile {
  nombre_original: string
  nombre_archivo: string
  ruta_archivo: string
  tipo_mime: string
  tamanio_bytes: number
}

export default function FileUpload({ consultaId, onUploadSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<FileWithPreview[]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    setFiles(
      acceptedFiles.map((file) =>
        Object.assign(file, {
          preview: URL.createObjectURL(file),
        })
      )
    )
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  })

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('consultaId', consultaId)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Error al subir archivo')
        }

        const data = await response.json()
        onUploadSuccess(data.archivo)
      }

      // Limpiar archivos después de subir
      setFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivos')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={styles.container}>
      {error && (
        <Alert variant="error" className={styles.alert}>
          {error}
        </Alert>
      )}

      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${isDragActive ? styles.active : ''}`}
      >
        <input {...getInputProps()} />
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={styles.uploadIcon}
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        {isDragActive ? (
          <p>Suelta los archivos aquí...</p>
        ) : (
          <>
            <p>
              <strong>Arrastra archivos aquí</strong> o haz clic para seleccionar
            </p>
            <p className={styles.hint}>PDF, Word, Imágenes (máx. 10MB cada uno)</p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className={styles.fileList}>
          <h4>Archivos seleccionados ({files.length})</h4>
          {files.map((file, index) => (
            <div key={index} className={styles.fileItem}>
              {file.type.startsWith('image/') ? (
                <img src={file.preview} alt={file.name} className={styles.preview} />
              ) : (
                <div className={styles.fileIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                </div>
              )}
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className={styles.removeButton}
                disabled={uploading}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}

          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className={styles.uploadButton}
          >
            {uploading ? 'Subiendo...' : `Subir ${files.length} archivo(s)`}
          </Button>
        </div>
      )}
    </div>
  )
}
