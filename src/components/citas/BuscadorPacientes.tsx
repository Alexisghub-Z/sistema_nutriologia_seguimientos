'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './BuscadorPacientes.module.css'

interface Paciente {
  id: string
  nombre: string
  email: string
}

interface BuscadorPacientesProps {
  pacienteSeleccionado: string | null
  onSeleccionar: (pacienteId: string | null) => void
}

export default function BuscadorPacientes({ pacienteSeleccionado, onSeleccionar }: BuscadorPacientesProps) {
  const [busqueda, setBusqueda] = useState('')
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pacienteActual, setPacienteActual] = useState<Paciente | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setMostrarResultados(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cargar paciente seleccionado o limpiar si se deselecciona externamente
  useEffect(() => {
    if (pacienteSeleccionado && !pacienteActual) {
      cargarPaciente(pacienteSeleccionado)
    } else if (!pacienteSeleccionado && pacienteActual) {
      // Si se limpia externamente (ej. botón limpiar filtro), resetear el buscador
      setPacienteActual(null)
      setBusqueda('')
      setPacientes([])
    }
  }, [pacienteSeleccionado, pacienteActual?.id])

  const cargarPaciente = async (id: string) => {
    try {
      const response = await fetch(`/api/pacientes/${id}`)
      if (response.ok) {
        const data = await response.json()
        setPacienteActual({ id: data.id, nombre: data.nombre, email: data.email })
      }
    } catch (err) {
      console.error('Error al cargar paciente:', err)
    }
  }

  // Buscar pacientes con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busqueda.trim().length >= 2) {
        buscarPacientes(busqueda)
      } else if (busqueda.trim().length === 0) {
        setPacientes([])
      }
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timer)
  }, [busqueda])

  const buscarPacientes = async (query: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/pacientes/buscar?q=${encodeURIComponent(query)}&limit=10`)

      if (response.ok) {
        const data = await response.json()
        setPacientes(data.pacientes || [])
        setMostrarResultados(true)
      }
    } catch (err) {
      console.error('Error al buscar pacientes:', err)
      setPacientes([])
    } finally {
      setLoading(false)
    }
  }

  const seleccionarPaciente = (paciente: Paciente) => {
    setPacienteActual(paciente)
    setBusqueda('')
    setMostrarResultados(false)
    onSeleccionar(paciente.id)
  }

  const limpiarSeleccion = () => {
    setPacienteActual(null)
    setBusqueda('')
    setPacientes([])
    onSeleccionar(null)
  }

  const handleInputFocus = () => {
    if (busqueda.length >= 2 && pacientes.length > 0) {
      setMostrarResultados(true)
    }
  }

  return (
    <div className={styles.container} ref={wrapperRef}>
      {pacienteActual ? (
        // Mostrar paciente seleccionado
        <div className={styles.pacienteSeleccionado}>
          <div className={styles.pacienteInfo}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
            <div>
              <span className={styles.nombrePaciente}>{pacienteActual.nombre}</span>
              <span className={styles.emailPaciente}>{pacienteActual.email}</span>
            </div>
          </div>
          <button
            onClick={limpiarSeleccion}
            className={styles.btnLimpiar}
            title="Limpiar selección"
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        // Mostrar buscador
        <div className={styles.buscador}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className={styles.iconoBuscar}>
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            placeholder="Buscar paciente por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onFocus={handleInputFocus}
            className={styles.input}
          />
          {loading && (
            <div className={styles.spinner}></div>
          )}
        </div>
      )}

      {/* Resultados de búsqueda */}
      {mostrarResultados && pacientes.length > 0 && (
        <div className={styles.resultados}>
          {pacientes.map((paciente) => (
            <button
              key={paciente.id}
              onClick={() => seleccionarPaciente(paciente)}
              className={styles.resultadoItem}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
              <div className={styles.resultadoInfo}>
                <span className={styles.resultadoNombre}>{paciente.nombre}</span>
                <span className={styles.resultadoEmail}>{paciente.email}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {mostrarResultados && busqueda.length >= 2 && pacientes.length === 0 && !loading && (
        <div className={styles.resultados}>
          <div className={styles.sinResultados}>
            No se encontraron pacientes
          </div>
        </div>
      )}

      {busqueda.length > 0 && busqueda.length < 2 && (
        <div className={styles.hint}>
          Escribe al menos 2 caracteres para buscar
        </div>
      )}
    </div>
  )
}
