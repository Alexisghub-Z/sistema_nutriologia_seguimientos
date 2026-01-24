'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import styles from './pacientes.module.css'

interface Paciente {
  id: string
  nombre: string
  email: string
  telefono: string
  fecha_nacimiento: string
  createdAt: string
  _count: {
    citas: number
    consultas: number
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function PacientesPage() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [activityFilter, setActivityFilter] = useState('todos')

  // Fetch pacientes
  const fetchPacientes = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        sortBy,
        sortOrder,
        activityFilter,
      })

      const response = await fetch(`/api/pacientes?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar pacientes')
      }

      const data = await response.json()
      setPacientes(data.pacientes)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Effect para cargar pacientes
  useEffect(() => {
    fetchPacientes()
  }, [pagination.page, pagination.limit, sortBy, sortOrder, activityFilter])

  // Búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page !== 1) {
        setPagination((prev) => ({ ...prev, page: 1 }))
      } else {
        fetchPacientes()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  // Manejar ordenamiento
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

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
      month: 'short',
      day: 'numeric',
    })
  }

  // Manejar eliminación
  const handleDelete = async (id: string, nombre: string) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar al paciente "${nombre}"?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return
    }

    try {
      const response = await fetch(`/api/pacientes/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar paciente')
      }

      // Recargar lista
      fetchPacientes()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar paciente')
    }
  }

  if (loading && pacientes.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Cargando pacientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pacientes</h1>
          <p className={styles.subtitle}>Gestiona la información de tus pacientes</p>
        </div>
        <Button onClick={() => router.push('/pacientes/nuevo')} className={styles.addButton}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Nuevo Paciente
        </Button>
      </div>

      {/* Búsqueda y Filtros */}
      <Card className={styles.searchCard}>
        <div className={styles.searchContainer}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={styles.searchIcon}
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="todos">Todos los pacientes</option>
            <option value="activos">Activos (últimos 30 días)</option>
            <option value="inactivos">Inactivos (+30 días)</option>
            <option value="nuevos">Nuevos (últimos 30 días)</option>
          </select>
        </div>
      </Card>

      {/* Error */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Tabla */}
      <Card className={styles.tableCard}>
        {loading ? (
          <div className={styles.loadingOverlay}>
            <Spinner />
          </div>
        ) : pacientes.length === 0 ? (
          <div className={styles.emptyState}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
            <h3>No hay pacientes</h3>
            <p>
              {search
                ? 'No se encontraron pacientes con ese criterio de búsqueda'
                : 'Comienza agregando tu primer paciente'}
            </p>
            {!search && (
              <Button onClick={() => router.push('/pacientes/nuevo')}>Agregar Paciente</Button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('nombre')}>
                      <div className={styles.thContent}>
                        Nombre
                        {sortBy === 'nombre' && (
                          <span className={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th onClick={() => handleSort('fecha_nacimiento')}>
                      <div className={styles.thContent}>
                        Edad
                        {sortBy === 'fecha_nacimiento' && (
                          <span className={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th>Citas</th>
                    <th>Consultas</th>
                    <th onClick={() => handleSort('createdAt')}>
                      <div className={styles.thContent}>
                        Registro
                        {sortBy === 'createdAt' && (
                          <span className={styles.sortIcon}>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pacientes.map((paciente) => (
                    <tr key={paciente.id}>
                      <td>
                        <Link href={`/pacientes/${paciente.id}`} className={styles.nameLink}>
                          {paciente.nombre}
                        </Link>
                      </td>
                      <td>{paciente.email}</td>
                      <td>{paciente.telefono}</td>
                      <td>{calcularEdad(paciente.fecha_nacimiento)} años</td>
                      <td>
                        <span className={styles.badge}>{paciente._count.citas}</span>
                      </td>
                      <td>
                        <span className={styles.badge}>{paciente._count.consultas}</span>
                      </td>
                      <td>{formatearFecha(paciente.createdAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => router.push(`/pacientes/${paciente.id}`)}
                            className={styles.actionButton}
                            title="Ver detalles"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path
                                fillRule="evenodd"
                                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => router.push(`/pacientes/${paciente.id}/editar`)}
                            className={styles.actionButton}
                            title="Editar"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(paciente.id, paciente.nombre)}
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            title="Eliminar"
                          >
                            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista de tarjetas para móvil */}
            <div className={styles.mobileCards}>
              {pacientes.map((paciente) => (
                <div key={paciente.id} className={styles.patientCard}>
                  <div className={styles.cardHeader}>
                    <Link href={`/pacientes/${paciente.id}`} className={styles.cardName}>
                      {paciente.nombre}
                    </Link>
                    <div className={styles.cardActions}>
                      <button
                        onClick={() => router.push(`/pacientes/${paciente.id}`)}
                        className={styles.actionButton}
                        title="Ver detalles"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => router.push(`/pacientes/${paciente.id}/editar`)}
                        className={styles.actionButton}
                        title="Editar"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(paciente.id, paciente.nombre)}
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        title="Eliminar"
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardField}>
                      <span className={styles.cardLabel}>Email</span>
                      <span className={styles.cardValue}>{paciente.email}</span>
                    </div>
                    <div className={styles.cardField}>
                      <span className={styles.cardLabel}>Teléfono</span>
                      <span className={styles.cardValue}>{paciente.telefono}</span>
                    </div>
                    <div className={styles.cardField}>
                      <span className={styles.cardLabel}>Edad</span>
                      <span className={styles.cardValue}>
                        {calcularEdad(paciente.fecha_nacimiento)} años
                      </span>
                    </div>
                    <div className={styles.cardField}>
                      <span className={styles.cardLabel}>Registro</span>
                      <span className={styles.cardValue}>{formatearFecha(paciente.createdAt)}</span>
                    </div>
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.cardStat}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{paciente._count.citas} citas</span>
                    </div>
                    <div className={styles.cardStat}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path
                          fillRule="evenodd"
                          d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{paciente._count.consultas} consultas</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginación */}
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                Mostrando{' '}
                <strong>
                  {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                </strong>{' '}
                - <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong>{' '}
                de <strong>{pagination.total}</strong> pacientes
              </div>
              {pagination.totalPages > 1 && (
                <div className={styles.paginationControls}>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                    title="Primera página"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Button>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page - 1,
                      }))
                    }
                    disabled={pagination.page === 1}
                  >
                    Anterior
                  </Button>

                  <div className={styles.pageNumbers}>
                    {(() => {
                      const pages = []
                      const maxVisible = 5
                      let start = Math.max(1, pagination.page - Math.floor(maxVisible / 2))
                      const end = Math.min(pagination.totalPages, start + maxVisible - 1)

                      if (end - start < maxVisible - 1) {
                        start = Math.max(1, end - maxVisible + 1)
                      }

                      if (start > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
                            className={styles.pageButton}
                          >
                            1
                          </button>
                        )
                        if (start > 2) {
                          pages.push(
                            <span key="ellipsis-start" className={styles.ellipsis}>
                              ...
                            </span>
                          )
                        }
                      }

                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setPagination((prev) => ({ ...prev, page: i }))}
                            className={`${styles.pageButton} ${
                              i === pagination.page ? styles.pageButtonActive : ''
                            }`}
                          >
                            {i}
                          </button>
                        )
                      }

                      if (end < pagination.totalPages) {
                        if (end < pagination.totalPages - 1) {
                          pages.push(
                            <span key="ellipsis-end" className={styles.ellipsis}>
                              ...
                            </span>
                          )
                        }
                        pages.push(
                          <button
                            key={pagination.totalPages}
                            onClick={() =>
                              setPagination((prev) => ({
                                ...prev,
                                page: pagination.totalPages,
                              }))
                            }
                            className={styles.pageButton}
                          >
                            {pagination.totalPages}
                          </button>
                        )
                      }

                      return pages
                    })()}
                  </div>

                  <Button
                    variant="outline"
                    size="small"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: prev.page + 1,
                      }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Siguiente
                  </Button>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        page: pagination.totalPages,
                      }))
                    }
                    disabled={pagination.page === pagination.totalPages}
                    title="Última página"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                      <path
                        fillRule="evenodd"
                        d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
