'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import styles from './archivos.module.css'

interface Archivo {
  id: string
  nombre_original: string
  ruta_archivo: string
  tipo_mime: string
  tamanio_bytes: number
  categoria: string
  descripcion: string | null
  createdAt: string
}

export default function ArchivosConsultaPage() {
  const params = useParams()
  const router = useRouter()
  const pacienteId = params.id as string
  const consultaId = params.consultaId as string

  const [archivos, setArchivos] = useState<Archivo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [categoria, setCategoria] = useState('DOCUMENTO')
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => {
    fetchArchivos()
  }, [consultaId])

  const fetchArchivos = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/consultas/${consultaId}/archivos`)

      if (!response.ok) {
        throw new Error('Error al cargar archivos')
      }

      const data = await response.json()
      setArchivos(data.archivos)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setError(null)

    try {
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('categoria', categoria)
        if (descripcion) {
          formData.append('descripcion', descripcion)
        }

        const response = await fetch(`/api/consultas/${consultaId}/archivos`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al subir archivo')
        }
      }

      // Limpiar y recargar
      setSelectedFiles([])
      setDescripcion('')
      fetchArchivos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir archivos')
    } finally {
      setUploading(false)
    }
  }

  const formatearTamanio = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getCategoriaLabel = (cat: string) => {
    const labels: Record<string, string> = {
      LABORATORIO: 'Laboratorio',
      ESTUDIO_MEDICO: 'Estudio Médico',
      FOTO_PROGRESO: 'Foto Progreso',
      PLAN_ALIMENTICIO: 'Plan Alimenticio',
      RECETA: 'Receta',
      DOCUMENTO: 'Documento',
      OTRO: 'Otro',
    }
    return labels[cat] || cat
  }

  const handleDescargar = (rutaArchivo: string, nombreOriginal: string) => {
    const link = document.createElement('a')
    link.href = `/api${rutaArchivo}`
    link.download = nombreOriginal
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleEliminar = async (archivoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este archivo? Esta acción no se puede deshacer.')) return

    try {
      setError(null)
      // Usar la misma ruta que para GET y POST
      const response = await fetch(`/api/consultas/${consultaId}/archivos/${archivoId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar archivo')
      }

      // Recargar lista de archivos
      fetchArchivos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar archivo')
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="outline"
            size="small"
            onClick={() =>
              router.push(`/pacientes/${pacienteId}/consultas`)
            }
            className={styles.backButton}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Volver
          </Button>
          <div>
            <h1 className={styles.title}>Archivos de la Consulta</h1>
            <p className={styles.subtitle}>
              Sube y gestiona los archivos adjuntos
            </p>
          </div>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Formulario de Subida */}
      <Card className={styles.uploadCard}>
        <h3 className={styles.cardTitle}>Subir Nuevos Archivos</h3>

        <div className={styles.uploadForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={styles.select}
              disabled={uploading}
            >
              <option value="LABORATORIO">Laboratorio</option>
              <option value="ESTUDIO_MEDICO">Estudio Médico</option>
              <option value="FOTO_PROGRESO">Foto de Progreso</option>
              <option value="PLAN_ALIMENTICIO">Plan Alimenticio</option>
              <option value="RECETA">Receta</option>
              <option value="DOCUMENTO">Documento</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Descripción (opcional)</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className={styles.input}
              placeholder="Ej: Análisis de sangre enero 2026"
              disabled={uploading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Seleccionar archivos</label>
            <input
              type="file"
              onChange={handleFileSelect}
              className={styles.fileInput}
              multiple
              accept="image/*,.pdf,.doc,.docx"
              disabled={uploading}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className={styles.selectedFiles}>
              <p className={styles.selectedLabel}>
                {selectedFiles.length} archivo(s) seleccionado(s):
              </p>
              <ul className={styles.fileList}>
                {selectedFiles.map((file, index) => (
                  <li key={index}>
                    {file.name} ({formatearTamanio(file.size)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className={styles.uploadButton}
          >
            {uploading ? 'Subiendo...' : `Subir ${selectedFiles.length} archivo(s)`}
          </Button>
        </div>
      </Card>

      {/* Lista de Archivos */}
      <Card className={styles.archivosCard}>
        <h3 className={styles.cardTitle}>
          Archivos Adjuntos ({archivos.length})
        </h3>

        {loading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="large" />
            <p>Cargando archivos...</p>
          </div>
        ) : archivos.length === 0 ? (
          <div className={styles.emptyState}>
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
            <h4>No hay archivos adjuntos</h4>
            <p>Sube el primer archivo usando el formulario anterior</p>
          </div>
        ) : (
          <div className={styles.archivosGrid}>
            {archivos.map((archivo) => (
              <div key={archivo.id} className={styles.archivoCard}>
                <div className={styles.archivoHeader}>
                  <div className={styles.archivoIcon}>
                    {archivo.tipo_mime.startsWith('image/') ? (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    ) : (
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <Badge variant="primary">
                    {getCategoriaLabel(archivo.categoria)}
                  </Badge>
                </div>

                <h4 className={styles.archivoNombre}>
                  {archivo.nombre_original}
                </h4>

                {archivo.descripcion && (
                  <p className={styles.archivoDescripcion}>
                    {archivo.descripcion}
                  </p>
                )}

                <div className={styles.archivoMeta}>
                  <span>{formatearTamanio(archivo.tamanio_bytes)}</span>
                  <span>
                    {new Date(archivo.createdAt).toLocaleDateString('es-MX')}
                  </span>
                </div>

                <div className={styles.archivoActions}>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() =>
                      handleDescargar(
                        archivo.ruta_archivo,
                        archivo.nombre_original
                      )
                    }
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Descargar
                  </Button>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleEliminar(archivo.id)}
                    className={styles.deleteButton}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
