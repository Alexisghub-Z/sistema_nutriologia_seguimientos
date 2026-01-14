'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import styles from './ConsultaHistory.module.css'

interface Consulta {
  id: string
  fecha: string
  motivo: string | null
  peso: number | null
  talla: number | null
  imc: number | null

  // Composición corporal
  grasa_corporal: number | null
  porcentaje_agua: number | null
  masa_muscular_kg: number | null
  grasa_visceral: number | null

  // Perímetros
  brazo_relajado: number | null
  brazo_flexionado: number | null
  cintura: number | null
  cadera_maximo: number | null
  muslo_maximo: number | null
  muslo_medio: number | null
  pantorrilla_maximo: number | null

  // Pliegues cutáneos
  pliegue_tricipital: number | null
  pliegue_subescapular: number | null
  pliegue_bicipital: number | null
  pliegue_cresta_iliaca: number | null
  pliegue_supraespinal: number | null
  pliegue_abdominal: number | null

  notas: string | null
  diagnostico: string | null
  objetivo: string | null
  plan: string | null
  observaciones: string | null
  proxima_cita: string | null
  archivos: Array<{
    id: string
    nombre_original: string
    ruta_archivo: string
    tipo_mime: string
    tamanio_bytes: number
    categoria: string
    descripcion: string | null
    createdAt: string
  }>
}

interface ConsultaHistoryProps {
  pacienteId: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ConsultaHistory({ pacienteId }: ConsultaHistoryProps) {
  const router = useRouter()
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    fetchConsultas()
  }, [pacienteId, pagination.page])

  const fetchConsultas = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        paciente_id: pacienteId,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      const response = await fetch(`/api/consultas?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar consultas')
      }

      const data = await response.json()
      setConsultas(data.consultas)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatearTamanio = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getCategoriaColor = (categoria: string) => {
    const colores: Record<string, string> = {
      LABORATORIO: 'info',
      ESTUDIO_MEDICO: 'warning',
      FOTO_PROGRESO: 'success',
      PLAN_ALIMENTICIO: 'info',
      RECETA: 'warning',
      DOCUMENTO: 'info',
      OTRO: 'info',
    }
    return colores[categoria] || 'info'
  }

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      LABORATORIO: 'Laboratorio',
      ESTUDIO_MEDICO: 'Estudio Médico',
      FOTO_PROGRESO: 'Foto Progreso',
      PLAN_ALIMENTICIO: 'Plan Alimenticio',
      RECETA: 'Receta',
      DOCUMENTO: 'Documento',
      OTRO: 'Otro',
    }
    return labels[categoria] || categoria
  }

  const handleDescargar = (rutaArchivo: string, nombreOriginal: string) => {
    // Crear enlace temporal para descargar
    const link = document.createElement('a')
    link.href = `/api${rutaArchivo}`
    link.download = nombreOriginal
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" />
        <p>Cargando historial de consultas...</p>
      </div>
    )
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>
  }

  if (consultas.length === 0) {
    return (
      <div className={styles.emptyState}>
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path
            fillRule="evenodd"
            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
            clipRule="evenodd"
          />
        </svg>
        <h3>No hay consultas registradas</h3>
        <p>Las consultas aparecerán aquí una vez que se registren</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Información de paginación */}
      {pagination.total > 0 && (
        <div className={styles.paginationInfo}>
          Mostrando{' '}
          <strong>
            {(pagination.page - 1) * pagination.limit + 1}
          </strong>{' '}
          -{' '}
          <strong>
            {Math.min(pagination.page * pagination.limit, pagination.total)}
          </strong>{' '}
          de <strong>{pagination.total}</strong> consultas
        </div>
      )}

      <div className={styles.timeline}>
        {consultas.map((consulta, index) => {
          // Calcular el número de consulta global
          const consultaNumber =
            pagination.total - (pagination.page - 1) * pagination.limit - index
          return (
          <Card key={consulta.id} className={styles.consultaCard}>
            <div
              className={styles.consultaHeader}
              onClick={() =>
                setExpandedId(expandedId === consulta.id ? null : consulta.id)
              }
            >
              <div className={styles.headerLeft}>
                <div className={styles.consultaNumber}>#{consultaNumber}</div>
                <div>
                  <h4 className={styles.consultaTitle}>
                    {consulta.motivo || 'Consulta general'}
                  </h4>
                  <p className={styles.consultaDate}>
                    {formatearFecha(consulta.fecha)}
                  </p>
                </div>
              </div>
              <div className={styles.headerRight}>
                {consulta.archivos.length > 0 && (
                  <Badge variant="info">{consulta.archivos.length} archivos</Badge>
                )}
                <button type="button" className={styles.expandButton}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={expandedId === consulta.id ? styles.rotated : ''}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {expandedId === consulta.id && (
              <CardContent className={styles.consultaContent}>
                {/* Mediciones Básicas */}
                {(consulta.peso || consulta.talla || consulta.imc) && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Mediciones Básicas</h5>
                    <div className={styles.mediciones}>
                      {consulta.peso && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Peso:</span>
                          <span className={styles.medicionValue}>
                            {consulta.peso} kg
                          </span>
                        </div>
                      )}
                      {consulta.talla && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Talla:</span>
                          <span className={styles.medicionValue}>
                            {consulta.talla} m
                          </span>
                        </div>
                      )}
                      {consulta.imc && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>IMC:</span>
                          <span className={styles.medicionValue}>{consulta.imc}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Composición Corporal */}
                {(consulta.grasa_corporal ||
                  consulta.porcentaje_agua ||
                  consulta.masa_muscular_kg ||
                  consulta.grasa_visceral) && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Composición Corporal</h5>
                    <div className={styles.mediciones}>
                      {consulta.grasa_corporal && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>% Grasa:</span>
                          <span className={styles.medicionValue}>
                            {consulta.grasa_corporal}%
                          </span>
                        </div>
                      )}
                      {consulta.porcentaje_agua && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>% Agua:</span>
                          <span className={styles.medicionValue}>
                            {consulta.porcentaje_agua}%
                          </span>
                        </div>
                      )}
                      {consulta.masa_muscular_kg && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Masa Muscular:</span>
                          <span className={styles.medicionValue}>
                            {consulta.masa_muscular_kg} kg
                          </span>
                        </div>
                      )}
                      {consulta.grasa_visceral && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Grasa Visceral:</span>
                          <span className={styles.medicionValue}>
                            {consulta.grasa_visceral}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Perímetros */}
                {(consulta.brazo_relajado ||
                  consulta.brazo_flexionado ||
                  consulta.cintura ||
                  consulta.cadera_maximo ||
                  consulta.muslo_maximo ||
                  consulta.muslo_medio ||
                  consulta.pantorrilla_maximo) && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Perímetros (cm)</h5>
                    <div className={styles.mediciones}>
                      {consulta.brazo_relajado && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Brazo relajado:</span>
                          <span className={styles.medicionValue}>
                            {consulta.brazo_relajado} cm
                          </span>
                        </div>
                      )}
                      {consulta.brazo_flexionado && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Brazo flexionado:</span>
                          <span className={styles.medicionValue}>
                            {consulta.brazo_flexionado} cm
                          </span>
                        </div>
                      )}
                      {consulta.cintura && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Cintura:</span>
                          <span className={styles.medicionValue}>
                            {consulta.cintura} cm
                          </span>
                        </div>
                      )}
                      {consulta.cadera_maximo && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Cadera máximo:</span>
                          <span className={styles.medicionValue}>
                            {consulta.cadera_maximo} cm
                          </span>
                        </div>
                      )}
                      {consulta.muslo_maximo && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Muslo máximo:</span>
                          <span className={styles.medicionValue}>
                            {consulta.muslo_maximo} cm
                          </span>
                        </div>
                      )}
                      {consulta.muslo_medio && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Muslo medio:</span>
                          <span className={styles.medicionValue}>
                            {consulta.muslo_medio} cm
                          </span>
                        </div>
                      )}
                      {consulta.pantorrilla_maximo && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>Pantorrilla máximo:</span>
                          <span className={styles.medicionValue}>
                            {consulta.pantorrilla_maximo} cm
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pliegues Cutáneos */}
                {(consulta.pliegue_tricipital ||
                  consulta.pliegue_subescapular ||
                  consulta.pliegue_bicipital ||
                  consulta.pliegue_cresta_iliaca ||
                  consulta.pliegue_supraespinal ||
                  consulta.pliegue_abdominal) && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Pliegues Cutáneos (mm)</h5>
                    <div className={styles.mediciones}>
                      {consulta.pliegue_tricipital && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>P. Tricipital:</span>
                          <span className={styles.medicionValue}>
                            {consulta.pliegue_tricipital} mm
                          </span>
                        </div>
                      )}
                      {consulta.pliegue_subescapular && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>P. Subescapular:</span>
                          <span className={styles.medicionValue}>
                            {consulta.pliegue_subescapular} mm
                          </span>
                        </div>
                      )}
                      {consulta.pliegue_bicipital && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>P. Bicipital:</span>
                          <span className={styles.medicionValue}>
                            {consulta.pliegue_bicipital} mm
                          </span>
                        </div>
                      )}
                      {consulta.pliegue_cresta_iliaca && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>P. Cresta ilíaca:</span>
                          <span className={styles.medicionValue}>
                            {consulta.pliegue_cresta_iliaca} mm
                          </span>
                        </div>
                      )}
                      {consulta.pliegue_supraespinal && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>P. Supraespinal:</span>
                          <span className={styles.medicionValue}>
                            {consulta.pliegue_supraespinal} mm
                          </span>
                        </div>
                      )}
                      {consulta.pliegue_abdominal && (
                        <div className={styles.medicion}>
                          <span className={styles.medicionLabel}>P. Abdominal:</span>
                          <span className={styles.medicionValue}>
                            {consulta.pliegue_abdominal} mm
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notas */}
                {consulta.notas && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Notas</h5>
                    <p className={styles.texto}>{consulta.notas}</p>
                  </div>
                )}

                {/* Diagnóstico */}
                {consulta.diagnostico && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Diagnóstico</h5>
                    <p className={styles.texto}>{consulta.diagnostico}</p>
                  </div>
                )}

                {/* Objetivo */}
                {consulta.objetivo && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Objetivo</h5>
                    <p className={styles.texto}>{consulta.objetivo}</p>
                  </div>
                )}

                {/* Plan */}
                {consulta.plan && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Plan Nutricional</h5>
                    <p className={styles.texto}>{consulta.plan}</p>
                  </div>
                )}

                {/* Observaciones */}
                {consulta.observaciones && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Observaciones</h5>
                    <p className={styles.texto}>{consulta.observaciones}</p>
                  </div>
                )}

                {/* Archivos Adjuntos */}
                {consulta.archivos.length > 0 && (
                  <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Archivos Adjuntos</h5>
                    <div className={styles.archivos}>
                      {consulta.archivos.map((archivo) => (
                        <div key={archivo.id} className={styles.archivoItem}>
                          <div className={styles.archivoIcon}>
                            {archivo.tipo_mime.startsWith('image/') ? (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            ) : (
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div className={styles.archivoInfo}>
                            <div className={styles.archivoNombre}>
                              {archivo.nombre_original}
                            </div>
                            <div className={styles.archivoMeta}>
                              <Badge
                                variant={
                                  getCategoriaColor(archivo.categoria) as any
                                }
                              >
                                {getCategoriaLabel(archivo.categoria)}
                              </Badge>
                              <span className={styles.archivoTamanio}>
                                {formatearTamanio(archivo.tamanio_bytes)}
                              </span>
                            </div>
                            {archivo.descripcion && (
                              <p className={styles.archivoDescripcion}>
                                {archivo.descripcion}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleDescargar(
                                archivo.ruta_archivo,
                                archivo.nombre_original
                              )
                            }
                            className={styles.descargarButton}
                            title="Descargar"
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Próxima Cita */}
                {consulta.proxima_cita && (
                  <div className={styles.proximaCita}>
                    <strong>Próxima cita sugerida:</strong>{' '}
                    {formatearFecha(consulta.proxima_cita)}
                  </div>
                )}

                {/* Botón Gestionar Archivos */}
                <div className={styles.consultaActions}>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() =>
                      router.push(
                        `/pacientes/${pacienteId}/consultas/${consulta.id}/archivos`
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
                        d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Gestionar Archivos ({consulta.archivos.length})
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )
        })}
      </div>

      {/* Controles de Paginación */}
      {pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="outline"
            size="small"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                page: Math.max(1, prev.page - 1),
              }))
            }
            disabled={pagination.page === 1 || loading}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Anterior
          </Button>

          <div className={styles.pageInfo}>
            Página <strong>{pagination.page}</strong> de{' '}
            <strong>{pagination.totalPages}</strong>
          </div>

          <Button
            variant="outline"
            size="small"
            onClick={() =>
              setPagination((prev) => ({
                ...prev,
                page: Math.min(prev.totalPages, prev.page + 1),
              }))
            }
            disabled={pagination.page === pagination.totalPages || loading}
          >
            Siguiente
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </div>
      )}
    </div>
  )
}
