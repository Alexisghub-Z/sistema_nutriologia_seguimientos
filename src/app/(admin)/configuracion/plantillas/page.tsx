'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import styles from './plantillas.module.css'

interface Plantilla {
  id: string
  nombre: string
  categoria: string
  contenido: string
  activa: boolean
  createdAt: string
  updatedAt: string
}

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'PERSONALIZADO',
    contenido: '',
    activa: true,
  })

  useEffect(() => {
    fetchPlantillas()
  }, [])

  const fetchPlantillas = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/plantillas')

      if (!response.ok) {
        throw new Error('Error al cargar plantillas')
      }

      const data = await response.json()
      setPlantillas(data.plantillas || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      const url = editingId ? `/api/plantillas/${editingId}` : '/api/plantillas'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar plantilla')
      }

      setSuccess(editingId ? 'Plantilla actualizada' : 'Plantilla creada')
      setShowForm(false)
      setEditingId(null)
      setFormData({ nombre: '', categoria: 'PERSONALIZADO', contenido: '', activa: true })
      await fetchPlantillas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const handleEdit = (plantilla: Plantilla) => {
    setFormData({
      nombre: plantilla.nombre,
      categoria: plantilla.categoria,
      contenido: plantilla.contenido,
      activa: plantilla.activa,
    })
    setEditingId(plantilla.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta plantilla?')) return

    try {
      setError(null)
      const response = await fetch(`/api/plantillas/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar plantilla')
      }

      setSuccess('Plantilla eliminada')
      await fetchPlantillas()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const getCategoriaColor = (categoria: string): string => {
    const colors: Record<string, string> = {
      CONFIRMACION: styles.badgeBlue || '',
      RECORDATORIO: styles.badgeOrange || '',
      SEGUIMIENTO: styles.badgeGreen || '',
      PERSONALIZADO: styles.badgePurple || '',
    }
    return colors[categoria] || styles.badgeGray || ''
  }

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      CONFIRMACION: 'Confirmación',
      RECORDATORIO: 'Recordatorio',
      SEGUIMIENTO: 'Seguimiento',
      PERSONALIZADO: 'Personalizado',
    }
    return labels[categoria] || categoria
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Plantillas de Mensajes</h1>
          <p className={styles.subtitle}>
            Crea y gestiona plantillas reutilizables para tus mensajes
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setFormData({ nombre: '', categoria: 'PERSONALIZADO', contenido: '', activa: true })
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Nueva Plantilla
        </Button>
      </div>

      {/* Alerts */}
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Formulario */}
      {showForm && (
        <Card className={styles.formCard}>
          <h2 className={styles.formTitle}>
            {editingId ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h2>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  className={styles.input}
                  placeholder="Ej: Bienvenida nuevo paciente"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Categoría</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className={styles.select}
                >
                  <option value="CONFIRMACION">Confirmación</option>
                  <option value="RECORDATORIO">Recordatorio</option>
                  <option value="SEGUIMIENTO">Seguimiento</option>
                  <option value="PERSONALIZADO">Personalizado</option>
                </select>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Contenido</label>
              <textarea
                value={formData.contenido}
                onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                required
                rows={6}
                className={styles.textarea}
                placeholder="Escribe el contenido de la plantilla..."
              />
              <p className={styles.hint}>
                Puedes usar variables: {'{nombre}'}, {'{fecha_cita}'}, {'{hora_cita}'}
              </p>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.activa}
                  onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                  className={styles.checkbox}
                />
                Plantilla activa
              </label>
            </div>

            <div className={styles.formActions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de plantillas */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Cargando plantillas...</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {plantillas.map((plantilla) => (
            <Card key={plantilla.id} className={styles.plantillaCard}>
              <div className={styles.plantillaHeader}>
                <div>
                  <h3 className={styles.plantillaNombre}>{plantilla.nombre}</h3>
                  <span className={`${styles.badge} ${getCategoriaColor(plantilla.categoria)}`}>
                    {getCategoriaLabel(plantilla.categoria)}
                  </span>
                </div>
                <div className={styles.plantillaActions}>
                  <button
                    onClick={() => handleEdit(plantilla)}
                    className={styles.iconButton}
                    title="Editar"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(plantilla.id)}
                    className={styles.iconButtonDanger}
                    title="Eliminar"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <p className={styles.plantillaContenido}>{plantilla.contenido}</p>

              <div className={styles.plantillaFooter}>
                <span className={plantilla.activa ? styles.statusActive : styles.statusInactive}>
                  {plantilla.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && plantillas.length === 0 && (
        <div className={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
          <h3>No hay plantillas</h3>
          <p>Crea tu primera plantilla para comenzar</p>
        </div>
      )}
    </div>
  )
}
