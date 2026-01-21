'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import styles from './calendario.module.css'

interface Configuracion {
  id: string
  horario_inicio: string
  horario_fin: string
  horario_sabado_inicio: string | null
  horario_sabado_fin: string | null
  duracion_cita_default: number
  intervalo_entre_citas: number
  dias_laborales: string
  citas_simultaneas_max: number
  dias_anticipacion_max: number
  horas_anticipacion_min: number
}

export default function ConfiguracionCalendarioPage() {
  const [config, setConfig] = useState<Configuracion | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const diasSemana = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
  ]

  useEffect(() => {
    cargarConfiguracion()
  }, [])

  const cargarConfiguracion = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/configuracion')
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
      } else {
        setError('Error al cargar configuración')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Configuracion, value: any) => {
    if (!config) return
    setConfig({
      ...config,
      [field]: value,
    })
  }

  const toggleDiaLaboral = (dia: number) => {
    if (!config) return
    const dias = config.dias_laborales.split(',').map(Number)
    const index = dias.indexOf(dia)

    if (index > -1) {
      dias.splice(index, 1)
    } else {
      dias.push(dia)
      dias.sort((a, b) => a - b)
    }

    handleInputChange('dias_laborales', dias.join(','))
  }

  const guardarConfiguracion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    try {
      setSaving(true)
      setError('')
      setSuccess(false)

      const response = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horario_inicio: config.horario_inicio,
          horario_fin: config.horario_fin,
          horario_sabado_inicio: config.horario_sabado_inicio || null,
          horario_sabado_fin: config.horario_sabado_fin || null,
          duracion_cita_default: parseInt(config.duracion_cita_default.toString()),
          intervalo_entre_citas: parseInt(config.intervalo_entre_citas.toString()),
          dias_laborales: config.dias_laborales,
          citas_simultaneas_max: parseInt(config.citas_simultaneas_max.toString()),
          dias_anticipacion_max: parseInt(config.dias_anticipacion_max.toString()),
          horas_anticipacion_min: parseInt(config.horas_anticipacion_min.toString()),
        }),
      })

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Error al guardar configuración')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Cargando configuración...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className={styles.container}>
        <Alert variant="error">No se pudo cargar la configuración</Alert>
      </div>
    )
  }

  const diasLaborales = config.dias_laborales.split(',').map(Number)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Configuración del Calendario</h1>
        <p className={styles.subtitle}>
          Configura los horarios y disponibilidad para agendar citas
        </p>
      </div>

      <form onSubmit={guardarConfiguracion}>
        <div className={styles.grid}>
          {/* Horarios */}
          <Card>
            <CardHeader>
              <CardTitle>Horarios de Atención</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="horario_inicio">Hora de inicio (Lunes-Viernes)</label>
                  <input
                    type="time"
                    id="horario_inicio"
                    value={config.horario_inicio}
                    onChange={(e) =>
                      handleInputChange('horario_inicio', e.target.value)
                    }
                    required
                  />
                  <small>Hora en que inician las consultas entre semana</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="horario_fin">Hora de fin (Lunes-Viernes)</label>
                  <input
                    type="time"
                    id="horario_fin"
                    value={config.horario_fin}
                    onChange={(e) =>
                      handleInputChange('horario_fin', e.target.value)
                    }
                    required
                  />
                  <small>Última hora disponible para iniciar una consulta</small>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Horarios Sábado */}
          <Card>
            <CardHeader>
              <CardTitle>Horarios de Sábado (Opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="horario_sabado_inicio">Hora de inicio (Sábado)</label>
                  <input
                    type="time"
                    id="horario_sabado_inicio"
                    value={config.horario_sabado_inicio || ''}
                    onChange={(e) =>
                      handleInputChange('horario_sabado_inicio', e.target.value || null)
                    }
                  />
                  <small>Si no se especifica, usa el horario de Lunes-Viernes</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="horario_sabado_fin">Hora de fin (Sábado)</label>
                  <input
                    type="time"
                    id="horario_sabado_fin"
                    value={config.horario_sabado_fin || ''}
                    onChange={(e) =>
                      handleInputChange('horario_sabado_fin', e.target.value || null)
                    }
                  />
                  <small>Última hora disponible para iniciar una consulta el sábado</small>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duración */}
          <Card>
            <CardHeader>
              <CardTitle>Duración de Citas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="duracion_cita_default">
                    Duración por defecto (minutos)
                  </label>
                  <input
                    type="number"
                    id="duracion_cita_default"
                    value={config.duracion_cita_default}
                    onChange={(e) =>
                      handleInputChange(
                        'duracion_cita_default',
                        parseInt(e.target.value)
                      )
                    }
                    min={15}
                    max={240}
                    step={15}
                    required
                  />
                  <small>Duración estándar de cada cita</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="intervalo_entre_citas">
                    Intervalo entre citas (minutos)
                  </label>
                  <input
                    type="number"
                    id="intervalo_entre_citas"
                    value={config.intervalo_entre_citas}
                    onChange={(e) =>
                      handleInputChange(
                        'intervalo_entre_citas',
                        parseInt(e.target.value)
                      )
                    }
                    min={0}
                    max={60}
                    step={5}
                    required
                  />
                  <small>Tiempo de descanso entre consultas</small>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Días laborales */}
          <Card>
            <CardHeader>
              <CardTitle>Días Laborales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.diasSemana}>
                {diasSemana.map((dia) => (
                  <button
                    key={dia.value}
                    type="button"
                    className={`${styles.diaBtn} ${
                      diasLaborales.includes(dia.value) ? styles.diaActivo : ''
                    }`}
                    onClick={() => toggleDiaLaboral(dia.value)}
                  >
                    {dia.label}
                  </button>
                ))}
              </div>
              <small>Días en que se pueden agendar citas</small>
            </CardContent>
          </Card>

          {/* Capacidad y anticipación */}
          <Card>
            <CardHeader>
              <CardTitle>Capacidad y Anticipación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="citas_simultaneas_max">
                    Citas simultáneas máximas
                  </label>
                  <input
                    type="number"
                    id="citas_simultaneas_max"
                    value={config.citas_simultaneas_max}
                    onChange={(e) =>
                      handleInputChange(
                        'citas_simultaneas_max',
                        parseInt(e.target.value)
                      )
                    }
                    min={1}
                    max={10}
                    required
                  />
                  <small>Cuántas citas pueden estar al mismo tiempo</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="dias_anticipacion_max">
                    Días máximos de anticipación
                  </label>
                  <input
                    type="number"
                    id="dias_anticipacion_max"
                    value={config.dias_anticipacion_max}
                    onChange={(e) =>
                      handleInputChange(
                        'dias_anticipacion_max',
                        parseInt(e.target.value)
                      )
                    }
                    min={1}
                    max={90}
                    required
                  />
                  <small>Hasta cuántos días adelante se puede agendar</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="horas_anticipacion_min">
                    Horas mínimas de anticipación
                  </label>
                  <input
                    type="number"
                    id="horas_anticipacion_min"
                    value={config.horas_anticipacion_min ?? 0}
                    onChange={(e) =>
                      handleInputChange(
                        'horas_anticipacion_min',
                        e.target.value === '' ? 0 : parseInt(e.target.value)
                      )
                    }
                    min={0}
                    max={72}
                    required
                  />
                  <small>Mínimo de horas de anticipación para agendar (0 = sin mínimo)</small>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {success && (
          <Alert variant="success">Configuración guardada exitosamente</Alert>
        )}

        <div className={styles.actions}>
          <Button type="submit" loading={saving} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
