'use client'

import { useState, useEffect } from 'react'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import styles from './ConversationList.module.css'

interface Paciente {
  id: string
  nombre: string
  email: string
  telefono: string
}

interface UltimoMensaje {
  id: string
  contenido: string
  direccion: string
  createdAt: string
  leido: boolean
}

interface Conversacion {
  paciente: Paciente
  ultimoMensaje: UltimoMensaje | null
  mensajesNoLeidos: number
}

interface ConversationListProps {
  selectedPacienteId: string | null
  onSelectConversation: (pacienteId: string) => void
  refreshKey: number
}

export default function ConversationList({
  selectedPacienteId,
  onSelectConversation,
  refreshKey,
}: ConversationListProps) {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Fetch conversaciones
  const fetchConversaciones = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      setError(null)

      const params = new URLSearchParams({
        page: '1',
        limit: '50',
        search,
      })

      const response = await fetch(`/api/mensajes?${params}`)

      if (!response.ok) {
        throw new Error('Error al cargar conversaciones')
      }

      const data = await response.json()
      setConversaciones(data.conversaciones || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversaciones()
  }, [refreshKey])

  // Auto-actualización cada 10 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversaciones(true) // silent = true para no mostrar spinner
    }, 10000) // 10 segundos

    return () => clearInterval(interval)
  }, [search])

  // Búsqueda con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversaciones()
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  // Formatear fecha relativa
  const formatFechaRelativa = (fecha: string) => {
    const ahora = new Date()
    const fechaMensaje = new Date(fecha)
    const diffMs = ahora.getTime() - fechaMensaje.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`

    return fechaMensaje.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    })
  }

  // Truncar contenido del mensaje
  const truncarMensaje = (contenido: string, maxLength: number = 50) => {
    if (contenido.length <= maxLength) return contenido
    return contenido.substring(0, maxLength) + '...'
  }

  if (loading && conversaciones.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="md" />
        <p>Cargando conversaciones...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Búsqueda */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <svg
          className={styles.searchIcon}
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorContainer}>
          <Alert type="error" message={error} />
        </div>
      )}

      {/* Lista de conversaciones */}
      <div className={styles.conversationsList}>
        {conversaciones.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay conversaciones</p>
          </div>
        ) : (
          conversaciones.map((conv) => (
            <div
              key={conv.paciente.id}
              className={`${styles.conversationItem} ${
                selectedPacienteId === conv.paciente.id ? styles.active : ''
              }`}
              onClick={() => onSelectConversation(conv.paciente.id)}
            >
              {/* Avatar */}
              <div className={styles.avatar}>
                <span className={styles.avatarText}>
                  {conv.paciente.nombre
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
              </div>

              {/* Contenido */}
              <div className={styles.conversationContent}>
                <div className={styles.conversationHeader}>
                  <h3 className={styles.pacienteNombre}>{conv.paciente.nombre}</h3>
                  {conv.ultimoMensaje && (
                    <span className={styles.timestamp}>
                      {formatFechaRelativa(conv.ultimoMensaje.createdAt)}
                    </span>
                  )}
                </div>

                <div className={styles.conversationFooter}>
                  {conv.ultimoMensaje ? (
                    <p className={styles.ultimoMensaje}>
                      {conv.ultimoMensaje.direccion === 'SALIENTE' && (
                        <span className={styles.sentIndicator}>Tú: </span>
                      )}
                      {truncarMensaje(conv.ultimoMensaje.contenido)}
                    </p>
                  ) : (
                    <p className={styles.noMensajes}>Sin mensajes</p>
                  )}

                  {conv.mensajesNoLeidos > 0 && (
                    <span className={styles.badge}>{conv.mensajesNoLeidos}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
