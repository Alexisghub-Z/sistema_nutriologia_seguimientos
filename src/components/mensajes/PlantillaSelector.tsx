'use client'

import { useState, useEffect } from 'react'
import styles from './PlantillaSelector.module.css'

interface Plantilla {
  id: string
  nombre: string
  categoria: string
  contenido: string
  activa: boolean
}

interface PlantillaSelectorProps {
  onSelectPlantilla: (contenido: string) => void
  onClose: () => void
}

export default function PlantillaSelector({ onSelectPlantilla, onClose }: PlantillaSelectorProps) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('all')

  useEffect(() => {
    fetchPlantillas()
  }, [])

  const fetchPlantillas = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/plantillas?activa=true')

      if (!response.ok) {
        throw new Error('Error al cargar plantillas')
      }

      const data = await response.json()
      setPlantillas(data.plantillas || [])
    } catch (error) {
      console.error('Error al cargar plantillas:', error)
    } finally {
      setLoading(false)
    }
  }

  const plantillasFiltradas =
    categoriaFiltro === 'all'
      ? plantillas
      : plantillas.filter((p) => p.categoria === categoriaFiltro)

  const categorias = [
    { value: 'all', label: 'Todas' },
    { value: 'CONFIRMACION', label: 'Confirmación' },
    { value: 'RECORDATORIO', label: 'Recordatorio' },
    { value: 'SEGUIMIENTO', label: 'Seguimiento' },
    { value: 'PERSONALIZADO', label: 'Personalizado' },
  ]

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      CONFIRMACION: 'blue',
      RECORDATORIO: 'orange',
      SEGUIMIENTO: 'green',
      PERSONALIZADO: 'purple',
    }
    return colors[categoria] || 'gray'
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Seleccionar Plantilla</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Filtros */}
        <div className={styles.filters}>
          {categorias.map((cat) => (
            <button
              key={cat.value}
              className={`${styles.filterButton} ${
                categoriaFiltro === cat.value ? styles.active : ''
              }`}
              onClick={() => setCategoriaFiltro(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Lista de plantillas */}
        <div className={styles.plantillasList}>
          {loading ? (
            <div className={styles.loading}>Cargando plantillas...</div>
          ) : plantillasFiltradas.length === 0 ? (
            <div className={styles.empty}>
              <p>No hay plantillas disponibles</p>
            </div>
          ) : (
            plantillasFiltradas.map((plantilla) => (
              <div
                key={plantilla.id}
                className={styles.plantillaItem}
                onClick={() => {
                  onSelectPlantilla(plantilla.contenido)
                  onClose()
                }}
              >
                <div className={styles.plantillaHeader}>
                  <h3 className={styles.plantillaNombre}>{plantilla.nombre}</h3>
                  <span
                    className={`${styles.badge} ${styles[getCategoriaColor(plantilla.categoria)]}`}
                  >
                    {plantilla.categoria}
                  </span>
                </div>
                <p className={styles.plantillaContenido}>{plantilla.contenido}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
