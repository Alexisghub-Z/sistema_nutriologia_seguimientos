'use client'

import { useState, useEffect, useRef } from 'react'
import MessageInput from './MessageInput'
import Spinner from '@/components/ui/Spinner'
import Alert from '@/components/ui/Alert'
import { reemplazarVariables, VariablesPlantilla } from '@/lib/utils/plantillas'
import styles from './ChatWindow.module.css'

interface Paciente {
  id: string
  nombre: string
  email: string
  telefono: string
}

interface Mensaje {
  id: string
  contenido: string
  direccion: 'ENTRANTE' | 'SALIENTE'
  tipo: string
  estado: string
  leido: boolean
  createdAt: string
  media_url?: string | null
  media_type?: string | null
  paciente: Paciente
}

interface ChatWindowProps {
  pacienteId: string
  onMessageSent: () => void
  onBack?: () => void
}

export default function ChatWindow({ pacienteId, onMessageSent, onBack }: ChatWindowProps) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevMensajesLengthRef = useRef(0)

  // Fetch mensajes del paciente
  const fetchMensajes = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(`/api/mensajes?paciente_id=${pacienteId}`)

      if (!response.ok) {
        throw new Error('Error al cargar mensajes')
      }

      const data = await response.json()
      setMensajes(data.mensajes || [])

      // Obtener info del paciente, ya sea de mensajes o directamente de la API
      if (data.mensajes && data.mensajes.length > 0) {
        setPaciente(data.mensajes[0].paciente)

        // Marcar mensajes entrantes como leídos
        const mensajesNoLeidos = data.mensajes.filter(
          (m: Mensaje) => m.direccion === 'ENTRANTE' && !m.leido
        )

        for (const mensaje of mensajesNoLeidos) {
          await fetch(`/api/mensajes/${mensaje.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leido: true }),
          })
        }
      } else {
        // Si no hay mensajes, obtener info del paciente directamente
        const pacienteResponse = await fetch(`/api/pacientes/${pacienteId}`)
        if (pacienteResponse.ok) {
          const pacienteData = await pacienteResponse.json()
          setPaciente({
            id: pacienteData.id,
            nombre: pacienteData.nombre,
            email: pacienteData.email,
            telefono: pacienteData.telefono,
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pacienteId) {
      fetchMensajes()
    }
  }, [pacienteId])

  // Auto-actualización cada 5 segundos (polling para nuevos mensajes)
  useEffect(() => {
    if (!pacienteId) return

    const interval = setInterval(() => {
      fetchMensajes(true) // silent = true para no mostrar spinner
    }, 5000) // 5 segundos

    return () => clearInterval(interval)
  }, [pacienteId])

  // Scroll inteligente: solo si el usuario está al final o si hay nuevos mensajes
  useEffect(() => {
    if (!messagesContainerRef.current) return

    const container = messagesContainerRef.current
    const isAtBottom =
      container.scrollHeight - container.scrollTop <= container.clientHeight + 100

    // Detectar nuevo mensaje ENTRANTE
    const nuevoMensaje = mensajes.length > prevMensajesLengthRef.current
    const ultimoMensaje = mensajes[mensajes.length - 1]
    const esNuevoMensajeEntrante = nuevoMensaje && ultimoMensaje?.direccion === 'ENTRANTE'

    // Reproducir sonido si es un mensaje entrante nuevo
    if (esNuevoMensajeEntrante && prevMensajesLengthRef.current > 0) {
      playNotificationSound()

      // Mostrar notificación del navegador si el usuario no está en la pestaña
      if (document.hidden && paciente) {
        showBrowserNotification(paciente.nombre, ultimoMensaje.contenido)
      }
    }

    // Hacer scroll si el usuario estaba al final O si envió un mensaje (último es SALIENTE)
    const ultimoEsSaliente = ultimoMensaje?.direccion === 'SALIENTE'
    if (isAtBottom || ultimoEsSaliente || mensajes.length === 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    prevMensajesLengthRef.current = mensajes.length
  }, [mensajes, paciente])

  // Reproducir sonido de notificación
  const playNotificationSound = () => {
    try {
      // Intentar reproducir archivo de audio
      const audio = new Audio('/sounds/notification.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {
        // Si falla, usar Web Audio API como fallback
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        gainNode.gain.value = 0.1

        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.2)
      })
    } catch (err) {
      console.log('Error al reproducir sonido:', err)
    }
  }

  // Mostrar notificación del navegador
  const showBrowserNotification = (titulo: string, mensaje: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(titulo, {
        body: mensaje.substring(0, 100),
        icon: '/icon-192x192.png',
        tag: 'nuevo-mensaje',
      })
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(titulo, {
            body: mensaje.substring(0, 100),
            icon: '/icon-192x192.png',
            tag: 'nuevo-mensaje',
          })
        }
      })
    }
  }

  // Formatear fecha
  const formatFecha = (fecha: string) => {
    const date = new Date(fecha)
    return date.toLocaleString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    })
  }

  // Manejar envío de mensaje
  const handleSendMessage = async (contenido: string) => {
    try {
      const response = await fetch('/api/mensajes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: pacienteId,
          contenido,
          tipo: 'MANUAL',
        }),
      })

      if (!response.ok) {
        throw new Error('Error al enviar mensaje')
      }

      // Refrescar mensajes
      await fetchMensajes()
      onMessageSent()
    } catch (err) {
      console.error('Error al enviar mensaje:', err)
      setError(err instanceof Error ? err.message : 'Error al enviar mensaje')
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="medium" />
        <p>Cargando mensajes...</p>
      </div>
    )
  }

  if (!paciente) {
    return (
      <div className={styles.errorContainer}>
        <Alert variant="error">No se pudo cargar la información del paciente</Alert>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        {onBack && (
          <button className={styles.backButton} onClick={onBack} aria-label="Volver">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className={styles.avatar}>
          <span className={styles.avatarText}>
            {paciente.nombre
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </span>
        </div>
        <div className={styles.patientInfo}>
          <h2 className={styles.patientName}>{paciente.nombre}</h2>
          <p className={styles.patientPhone}>{paciente.telefono}</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.errorAlert}>
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Mensajes */}
      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        {mensajes.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No hay mensajes aún</p>
            <p className={styles.emptySubtext}>
              Envía el primer mensaje para iniciar la conversación
            </p>
          </div>
        ) : (
          <>
            {mensajes.map((mensaje) => (
              <div
                key={mensaje.id}
                className={`${styles.messageWrapper} ${
                  mensaje.direccion === 'SALIENTE' ? styles.messageSent : styles.messageReceived
                }`}
              >
                <div className={styles.messageBubble}>
                  {mensaje.media_url && mensaje.media_type?.startsWith('image/') && (
                    <div className={styles.mediaContainer}>
                      <img
                        src={`/api/media/proxy?url=${encodeURIComponent(mensaje.media_url)}`}
                        alt="Imagen adjunta"
                        className={styles.mediaImage}
                        onClick={() =>
                          window.open(
                            `/api/media/proxy?url=${encodeURIComponent(mensaje.media_url!)}`,
                            '_blank'
                          )
                        }
                      />
                    </div>
                  )}
                  {mensaje.media_url && !mensaje.media_type?.startsWith('image/') && (
                    <div className={styles.mediaContainer}>
                      <a
                        href={`/api/media/proxy?url=${encodeURIComponent(mensaje.media_url)}`}
                        download
                        className={styles.mediaLink}
                      >
                        📎{' '}
                        {mensaje.media_type === 'video/mp4'
                          ? 'Video'
                          : mensaje.media_type === 'audio/ogg'
                            ? 'Audio'
                            : mensaje.media_type?.includes('pdf')
                              ? 'Documento PDF'
                              : 'Descargar archivo'}
                      </a>
                    </div>
                  )}
                  {mensaje.contenido && mensaje.contenido !== '[Archivo multimedia]' && (
                    <p className={styles.messageContent}>{mensaje.contenido}</p>
                  )}
                  <div className={styles.messageFooter}>
                    <span className={styles.messageTime}>{formatFecha(mensaje.createdAt)}</span>
                    {mensaje.direccion === 'SALIENTE' && (
                      <span className={styles.messageStatus}>
                        {mensaje.estado === 'ENVIADO' && '✓'}
                        {mensaje.estado === 'ENTREGADO' && '✓✓'}
                        {mensaje.estado === 'LEIDO' && (
                          <span className={styles.readStatus}>✓✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onProcessTemplate={(contenido) => {
          // Procesar plantilla con variables del paciente
          if (paciente) {
            const variables: VariablesPlantilla = {
              nombre: paciente.nombre,
              email: paciente.email,
              telefono: paciente.telefono,
              fecha_cita: new Date(), // Valor placeholder
              hora_cita: '00:00',
              codigo_cita: '',
            }
            return reemplazarVariables(contenido, variables)
          }
          return contenido
        }}
      />
    </div>
  )
}
