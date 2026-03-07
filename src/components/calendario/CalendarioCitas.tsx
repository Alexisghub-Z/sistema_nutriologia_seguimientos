'use client'

import { useState, useEffect } from 'react'
import styles from './CalendarioCitas.module.css'

interface CalendarioCitasProps {
  onSeleccionarFechaHora: (fecha: string, hora: string) => void
  fechaSeleccionada?: string
  horaSeleccionada?: string
}

interface DisponibilidadResponse {
  fecha: string
  horarios: string[]
  configuracion: {
    duracion_minutos: number
    horario_inicio: string
    horario_fin: string
  }
}

export default function CalendarioCitas({
  onSeleccionarFechaHora,
  fechaSeleccionada,
  horaSeleccionada,
}: CalendarioCitasProps) {
  const [mesActual, setMesActual] = useState(new Date())
  const [fechaActiva, setFechaActiva] = useState<string | null>(fechaSeleccionada || null)
  const [horariosDisponibles, setHorariosDisponibles] = useState<string[]>([])
  const [loadingHorarios, setLoadingHorarios] = useState(false)
  const [duracionCita, setDuracionCita] = useState(60)

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
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

  // Cargar horarios cuando cambia la fecha activa
  useEffect(() => {
    if (fechaActiva) {
      cargarHorarios(fechaActiva)
    } else {
      setHorariosDisponibles([])
    }
  }, [fechaActiva])

  const cargarHorarios = async (fecha: string) => {
    try {
      setLoadingHorarios(true)
      const response = await fetch(`/api/citas/disponibilidad?fecha=${fecha}`)

      if (response.ok) {
        const data: DisponibilidadResponse = await response.json()
        setHorariosDisponibles(data.horarios)
        if (data.configuracion?.duracion_minutos) {
          setDuracionCita(data.configuracion.duracion_minutos)
        }
      } else {
        setHorariosDisponibles([])
      }
    } catch (error) {
      console.error('Error al cargar horarios:', error)
      setHorariosDisponibles([])
    } finally {
      setLoadingHorarios(false)
    }
  }

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

  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1))
    setFechaActiva(null)
  }

  const mesSiguiente = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1))
    setFechaActiva(null)
  }

  const seleccionarFecha = (fecha: Date) => {
    const yyyy = fecha.getFullYear()
    const mm = String(fecha.getMonth() + 1).padStart(2, '0')
    const dd = String(fecha.getDate()).padStart(2, '0')
    setFechaActiva(`${yyyy}-${mm}-${dd}`)
  }

  const seleccionarHora = (hora: string) => {
    if (fechaActiva) {
      onSeleccionarFechaHora(fechaActiva, hora)
    }
  }

  const esFechaPasada = (fecha: Date): boolean => {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return fecha < hoy
  }

  const esFechaHoy = (fecha: Date): boolean => {
    const hoy = new Date()
    return (
      fecha.getDate() === hoy.getDate() &&
      fecha.getMonth() === hoy.getMonth() &&
      fecha.getFullYear() === hoy.getFullYear()
    )
  }

  const formatearHora12h = (hora24: string): string => {
    const [horas, minutos] = hora24.split(':')
    const horasNum = parseInt(horas!)
    const periodo = horasNum >= 12 ? 'PM' : 'AM'
    const horas12 = horasNum === 0 ? 12 : horasNum > 12 ? horasNum - 12 : horasNum
    return `${horas12}:${minutos} ${periodo}`
  }

  const dias = obtenerDiasDelMes()

  return (
    <div className={styles.container}>
      {/* Calendario */}
      <div className={styles.calendario}>
        {/* Header del mes */}
        <div className={styles.header}>
          <button onClick={mesAnterior} className={styles.navButton} type="button">
            ‹
          </button>
          <h3 className={styles.mesTitle}>
            {meses[mesActual.getMonth()]} {mesActual.getFullYear()}
          </h3>
          <button onClick={mesSiguiente} className={styles.navButton} type="button">
            ›
          </button>
        </div>

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

            const fechaStr = fecha.toISOString().split('T')[0]
            const esPasado = esFechaPasada(fecha)
            const esHoy = esFechaHoy(fecha)
            const estaSeleccionado = fechaActiva === fechaStr

            return (
              <button
                key={index}
                type="button"
                className={`${styles.dia} ${esPasado ? styles.diaPasado : ''} ${
                  esHoy ? styles.diaHoy : ''
                } ${estaSeleccionado ? styles.diaSeleccionado : ''}`}
                onClick={() => !esPasado && seleccionarFecha(fecha)}
                disabled={esPasado}
              >
                {fecha.getDate()}
              </button>
            )
          })}
        </div>
      </div>

      {/* Horarios disponibles */}
      {fechaActiva && (
        <div className={styles.horarios}>
          <h4 className={styles.horariosTitle}>
            Horarios disponibles
            <span className={styles.duracion}>({duracionCita} min)</span>
          </h4>

          {loadingHorarios ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Cargando horarios...</p>
            </div>
          ) : horariosDisponibles.length === 0 ? (
            <div className={styles.sinHorarios}>
              <p>😔 No hay horarios disponibles para esta fecha</p>
              <p className={styles.hint}>Por favor, selecciona otro día</p>
            </div>
          ) : (
            <div className={styles.horariosGrid}>
              {horariosDisponibles.map((hora) => (
                <button
                  key={hora}
                  type="button"
                  className={`${styles.horario} ${
                    horaSeleccionada === hora ? styles.horarioSeleccionado : ''
                  }`}
                  onClick={() => seleccionarHora(hora)}
                >
                  {formatearHora12h(hora)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!fechaActiva && (
        <div className={styles.placeholderHorarios}>
          <p>📅 Selecciona una fecha para ver los horarios disponibles</p>
        </div>
      )}
    </div>
  )
}
