'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import styles from './detalle.module.css'

interface Paciente {
  id: string
  nombre: string
  email: string
  telefono: string
  fecha_nacimiento: string
  createdAt: string
  citas: Array<{
    id: string
    fecha_hora: string
    estado: string
    motivo_consulta: string
    codigo_cita: string | null
    estado_confirmacion: string
    confirmada_por_paciente: boolean
  }>
  consultas: Array<{
    id: string
    fecha: string
    motivo: string
  }>
  _count: {
    citas: number
    consultas: number
    mensajes: number
  }
}

export default function DetallePacientePage() {
  const params = useParams()
  const router = useRouter()
  const pacienteId = params.id as string

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPaciente = async () => {
      try {
        const response = await fetch(`/api/pacientes/${pacienteId}`)

        if (!response.ok) {
          throw new Error('Error al cargar paciente')
        }

        const data = await response.json()
        setPaciente(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchPaciente()
  }, [pacienteId])

  // Calcular edad
  const calcularEdad = (fechaNacimiento: string) => {
    const hoy = new Date()
    const nacimiento = new Date(fechaNacimiento)
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return edad
  }

  // Formatear fecha
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatearFechaCorta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Obtener badge de estado de cita con confirmación
  const getEstadoBadge = (estado: string, estadoConfirmacion: string, confirmada: boolean) => {
    // Si está cancelada por el paciente, mostrar ese estado
    if (estadoConfirmacion === 'CANCELADA_PACIENTE') {
      return <Badge variant="error">Cancelada por paciente</Badge>
    }

    // Si está cancelada, mostrar estado general
    if (estado === 'CANCELADA') {
      return <Badge variant="error">Cancelada</Badge>
    }

    // Si está completada
    if (estado === 'COMPLETADA') {
      return <Badge variant="success">Completada</Badge>
    }

    // Si no asistió
    if (estado === 'NO_ASISTIO') {
      return <Badge variant="error">No asistió</Badge>
    }

    // Estados pendientes con confirmación
    if (estado === 'PENDIENTE') {
      if (confirmada) {
        return <Badge variant="success">Confirmada</Badge>
      }
      if (estadoConfirmacion === 'RECORDATORIO_ENVIADO') {
        return <Badge variant="info">Recordatorio enviado</Badge>
      }
      return <Badge variant="warning">Pendiente confirmación</Badge>
    }

    return <Badge variant="info">{estado}</Badge>
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Cargando información del paciente...</p>
        </div>
      </div>
    )
  }

  if (error || !paciente) {
    return (
      <div className={styles.container}>
        <Alert variant="error">
          {error || 'No se pudo cargar el paciente'}
        </Alert>
        <Button onClick={() => router.push('/pacientes')}>
          Volver a la lista
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="outline"
            size="small"
            onClick={() => router.push('/pacientes')}
            className={styles.backButton}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
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
            <h1 className={styles.title}>{paciente.nombre}</h1>
            <p className={styles.subtitle}>
              Registrado el {formatearFecha(paciente.createdAt)}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/pacientes/${pacienteId}/consultas`)
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
            Ver Historial
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/pacientes/${pacienteId}/editar`)
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Editar
          </Button>
          <Button
            onClick={() => router.push(`/pacientes/${pacienteId}/citas/nueva`)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Nueva Cita
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Información Personal */}
        <Card className={styles.infoCard}>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={styles.infoIcon}
                >
                  <path
                    fillRule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className={styles.infoLabel}>Edad</span>
                  <span className={styles.infoValue}>
                    {calcularEdad(paciente.fecha_nacimiento)} años
                  </span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={styles.infoIcon}
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <span className={styles.infoLabel}>Fecha de Nacimiento</span>
                  <span className={styles.infoValue}>
                    {formatearFecha(paciente.fecha_nacimiento)}
                  </span>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={styles.infoIcon}
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <div>
                  <span className={styles.infoLabel}>Email</span>
                  <a
                    href={`mailto:${paciente.email}`}
                    className={styles.infoLink}
                  >
                    {paciente.email}
                  </a>
                </div>
              </div>

              <div className={styles.infoItem}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={styles.infoIcon}
                >
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <div>
                  <span className={styles.infoLabel}>Teléfono</span>
                  <a
                    href={`tel:${paciente.telefono}`}
                    className={styles.infoLink}
                  >
                    {paciente.telefono}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className={styles.statsGrid}>
          <Card className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon} style={{ backgroundColor: '#e0f2fe' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: '#0284c7' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <span className={styles.statLabel}>Citas Totales</span>
                <span className={styles.statValue}>{paciente._count.citas}</span>
              </div>
            </div>
          </Card>

          <Card className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon} style={{ backgroundColor: '#dcfce7' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: '#16a34a' }}
                >
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <span className={styles.statLabel}>Consultas</span>
                <span className={styles.statValue}>
                  {paciente._count.consultas}
                </span>
              </div>
            </div>
          </Card>

          <Card className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7' }}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  style={{ color: '#ca8a04' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <span className={styles.statLabel}>Mensajes</span>
                <span className={styles.statValue}>
                  {paciente._count.mensajes}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Últimas Citas */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas Citas</CardTitle>
          </CardHeader>
          <CardContent>
            {paciente.citas.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No hay citas registradas</p>
              </div>
            ) : (
              <div className={styles.list}>
                {paciente.citas.map((cita) => (
                  <div key={cita.id} className={styles.listItem}>
                    <div className={styles.listItemContent}>
                      <div className={styles.citaInfo}>
                        <span className={styles.listItemTitle}>
                          {cita.motivo_consulta}
                        </span>
                        <div className={styles.citaMeta}>
                          <span className={styles.listItemDate}>
                            {formatearFechaCorta(cita.fecha_hora)}
                          </span>
                          {cita.codigo_cita && (
                            <span className={styles.citaCodigo}>
                              Código: {cita.codigo_cita}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.listItemActions}>
                        {getEstadoBadge(cita.estado, cita.estado_confirmacion, cita.confirmada_por_paciente)}
                        {cita.estado === 'PENDIENTE' && (
                          <Button
                            size="small"
                            onClick={() =>
                              router.push(
                                `/pacientes/${pacienteId}/citas/${cita.id}/crear-consulta`
                              )
                            }
                          >
                            Registrar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {paciente._count.citas > 5 && (
              <div className={styles.cardFooter}>
                <Link href={`/citas?paciente=${pacienteId}`}>
                  Ver todas las citas ({paciente._count.citas})
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas Consultas */}
        <Card>
          <CardHeader>
            <CardTitle>Últimas Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            {paciente.consultas.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No hay consultas registradas</p>
              </div>
            ) : (
              <div className={styles.list}>
                {paciente.consultas.map((consulta) => (
                  <div key={consulta.id} className={styles.listItem}>
                    <div className={styles.listItemContent}>
                      <span className={styles.listItemTitle}>
                        {consulta.motivo}
                      </span>
                      <span className={styles.listItemDate}>
                        {formatearFechaCorta(consulta.fecha)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {paciente._count.consultas > 5 && (
              <div className={styles.cardFooter}>
                <Link href={`/consultas?paciente=${pacienteId}`}>
                  Ver todas las consultas ({paciente._count.consultas})
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
