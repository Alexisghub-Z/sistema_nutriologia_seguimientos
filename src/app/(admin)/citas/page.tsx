'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ModalDetalleCita from '@/components/citas/ModalDetalleCita'
import BuscadorPacientes from '@/components/citas/BuscadorPacientes'
import styles from './citas.module.css'

interface CitaConPaciente {
  id: string
  fecha_hora: string
  duracion_minutos: number
  motivo_consulta: string
  tipo_cita: 'PRESENCIAL' | 'EN_LINEA'
  estado: 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA' | 'NO_ASISTIO'
  estado_confirmacion: string
  confirmada_por_paciente: boolean
  fecha_confirmacion: string | null
  google_event_id: string | null
  paciente: {
    id: string
    nombre: string
    email: string
    telefono: string
  }
  consulta?: {
    id: string
  } | null
}

interface PacienteInfo {
  id: string
  nombre: string
}

function CitasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pacienteIdParam = searchParams.get('paciente')

  const [mesActual, setMesActual] = useState(new Date())
  const [citas, setCitas] = useState<CitaConPaciente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [citaSeleccionada, setCitaSeleccionada] = useState<CitaConPaciente | null>(null)
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<string | null>(pacienteIdParam)
  const [pacienteInfo, setPacienteInfo] = useState<PacienteInfo | null>(null)

  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  // Cargar citas del mes actual
  useEffect(() => {
    cargarCitas()
  }, [mesActual, pacienteSeleccionado])

  // Cargar info del paciente si viene por URL
  useEffect(() => {
    if (pacienteIdParam && !pacienteInfo) {
      cargarInfoPaciente(pacienteIdParam)
    }
  }, [pacienteIdParam])

  const cargarInfoPaciente = async (pacienteId: string) => {
    try {
      const response = await fetch(`/api/pacientes/${pacienteId}`)
      if (response.ok) {
        const data = await response.json()
        setPacienteInfo({ id: data.id, nombre: data.nombre })
      }
    } catch (err) {
      console.error('Error al cargar info del paciente:', err)
    }
  }

  const cargarCitas = async () => {
    try {
      setLoading(true)
      setError('')

      // Calcular rango de fechas del mes
      const year = mesActual.getFullYear()
      const month = mesActual.getMonth()
      const primerDia = new Date(year, month, 1)
      const ultimoDia = new Date(year, month + 1, 0, 23, 59, 59)

      // Construir URL con filtro de paciente si existe
      let url = `/api/citas/rango?inicio=${primerDia.toISOString()}&fin=${ultimoDia.toISOString()}`
      if (pacienteSeleccionado) {
        url += `&paciente=${pacienteSeleccionado}`
      }

      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setCitas(data.citas || [])
      } else {
        setCitas([])
      }
    } catch (err) {
      console.error('Error al cargar citas:', err)
      setCitas([])
    } finally {
      setLoading(false)
    }
  }

  const cambiarFiltroPaciente = (pacienteId: string | null) => {
    setPacienteSeleccionado(pacienteId)

    // Cargar información del paciente si se selecciona
    if (pacienteId) {
      cargarInfoPaciente(pacienteId)
      router.push(`/citas?paciente=${pacienteId}`)
    } else {
      setPacienteInfo(null)
      router.push('/citas')
    }
  }

  const limpiarFiltro = () => {
    cambiarFiltroPaciente(null)
  }

  // Generar días del calendario
  const obtenerDiasDelMes = () => {
    const año = mesActual.getFullYear()
    const mes = mesActual.getMonth()

    const primerDia = new Date(año, mes, 1)
    const ultimoDia = new Date(año, mes + 1, 0)

    const diasAnteriores = primerDia.getDay()
    const diasEnMes = ultimoDia.getDate()

    const dias: (Date | null)[] = []

    // Días vacíos al inicio
    for (let i = 0; i < diasAnteriores; i++) {
      dias.push(null)
    }

    // Días del mes
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(new Date(año, mes, dia))
    }

    return dias
  }

  // Obtener citas de un día específico
  const getCitasDelDia = (fecha: Date) => {
    return citas.filter((cita) => {
      const citaFecha = new Date(cita.fecha_hora)
      return (
        citaFecha.getDate() === fecha.getDate() &&
        citaFecha.getMonth() === fecha.getMonth() &&
        citaFecha.getFullYear() === fecha.getFullYear()
      )
    })
  }

  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1))
  }

  const mesSiguiente = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1))
  }

  const irAHoy = () => {
    setMesActual(new Date())
  }

  const esFechaHoy = (fecha: Date): boolean => {
    const hoy = new Date()
    return (
      fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear()
    )
  }

  const getColorEstado = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE':
        return 'var(--color-warning)'
      case 'COMPLETADA':
        return 'var(--color-success)'
      case 'CANCELADA':
        return 'var(--color-error)'
      case 'NO_ASISTIO':
        return 'var(--color-gray-500)'
      default:
        return 'var(--color-gray-400)'
    }
  }

  const dias = obtenerDiasDelMes()

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendario de Citas</h1>
          <p className={styles.subtitle}>Gestiona y visualiza todas las citas de tus pacientes</p>
        </div>
        <div className={styles.headerActions}>
          <BuscadorPacientes
            pacienteSeleccionado={pacienteSeleccionado}
            onSeleccionar={cambiarFiltroPaciente}
          />
          <button className={styles.btnPrimary}>+ Nueva Cita</button>
        </div>
      </div>

      {/* Indicador de filtro activo */}
      {pacienteSeleccionado && pacienteInfo && (
        <div className={styles.filtroActivo}>
          <div className={styles.filtroInfo}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              Mostrando citas de: <strong>{pacienteInfo.nombre}</strong>
            </span>
          </div>
          <button onClick={limpiarFiltro} className={styles.btnLimpiarFiltro}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Limpiar filtro
          </button>
        </div>
      )}

      {/* Controles del calendario */}
      <div className={styles.controls}>
        <div className={styles.navegacion}>
          <button onClick={mesAnterior} className={styles.btnNav}>
            ‹
          </button>
          <h2 className={styles.mesTitle}>
            {meses[mesActual.getMonth()]} {mesActual.getFullYear()}
          </h2>
          <button onClick={mesSiguiente} className={styles.btnNav}>
            ›
          </button>
        </div>
        <button onClick={irAHoy} className={styles.btnHoy}>
          Hoy
        </button>
      </div>

      {/* Leyenda de colores */}
      <div className={styles.leyenda}>
        <h3 className={styles.leyendaTitle}>Estado de citas:</h3>
        <div className={styles.leyendaItems}>
          <div className={styles.leyendaItem}>
            <div
              className={styles.leyendaColor}
              style={{ backgroundColor: 'var(--color-warning)' }}
            ></div>
            <span>Pendiente</span>
          </div>
          <div className={styles.leyendaItem}>
            <div
              className={styles.leyendaColor}
              style={{ backgroundColor: 'var(--color-success)' }}
            ></div>
            <span>Completada</span>
          </div>
          <div className={styles.leyendaItem}>
            <div
              className={styles.leyendaColor}
              style={{ backgroundColor: 'var(--color-error)' }}
            ></div>
            <span>Cancelada</span>
          </div>
          <div className={styles.leyendaItem}>
            <div
              className={styles.leyendaColor}
              style={{ backgroundColor: 'var(--color-gray-500)' }}
            ></div>
            <span>No asistió</span>
          </div>
        </div>
      </div>

      {/* Calendario */}
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Cargando citas...</p>
        </div>
      ) : (
        <div className={styles.calendario}>
          {/* Días de la semana */}
          <div className={styles.diasSemana}>
            {diasSemana.map((dia) => (
              <div key={dia} className={styles.diaSemana}>
                {dia}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className={styles.diasGrid}>
            {dias.map((fecha, index) => {
              if (!fecha) {
                return <div key={`empty-${index}`} className={styles.diaVacio} />
              }

              const citasDelDia = getCitasDelDia(fecha)
              const esHoy = esFechaHoy(fecha)

              return (
                <div key={index} className={`${styles.dia} ${esHoy ? styles.diaHoy : ''}`}>
                  <div className={styles.diaNumero}>{fecha.getDate()}</div>

                  <div className={styles.citasDelDia}>
                    {citasDelDia.slice(0, 3).map((cita) => (
                      <div
                        key={cita.id}
                        className={styles.citaMini}
                        style={{ borderLeftColor: getColorEstado(cita.estado) }}
                        title={`${new Date(cita.fecha_hora).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} - ${cita.paciente.nombre}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCitaSeleccionada(cita)
                        }}
                      >
                        <span className={styles.citaHora}>
                          {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className={styles.citaPaciente}>
                          {cita.tipo_cita === 'PRESENCIAL' ? '🏥' : '💻'} {cita.paciente.nombre}
                        </span>
                      </div>
                    ))}
                    {citasDelDia.length > 3 && (
                      <div className={styles.citasMas}>+{citasDelDia.length - 3} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {/* Modal de Detalles */}
      <ModalDetalleCita
        cita={citaSeleccionada}
        onClose={() => setCitaSeleccionada(null)}
        onActualizar={cargarCitas}
      />
    </div>
  )
}

export default function CitasPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CitasContent />
    </Suspense>
  )
}
