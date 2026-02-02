'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ConversationList from '@/components/mensajes/ConversationList'
import ChatWindow from '@/components/mensajes/ChatWindow'
import styles from './mensajes.module.css'

function MensajesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedChat, setSelectedChat] = useState<{
    id: string
    tipo: 'PACIENTE' | 'PROSPECTO'
  } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Leer el chat seleccionado de la URL
  useEffect(() => {
    const chatId = searchParams.get('chat')
    const tipo = (searchParams.get('tipo') as 'PACIENTE' | 'PROSPECTO') || 'PACIENTE'

    if (chatId) {
      setSelectedChat({ id: chatId, tipo })
    } else {
      setSelectedChat(null)
    }
  }, [searchParams])

  // Función para refrescar la lista de conversaciones cuando se envía un mensaje
  const handleMessageSent = () => {
    setRefreshKey((prev) => prev + 1)
  }

  // Función para seleccionar una conversación
  const handleSelectConversation = (id: string, tipo: 'PACIENTE' | 'PROSPECTO') => {
    router.push(`/mensajes?chat=${id}&tipo=${tipo}`, { scroll: false })
  }

  // Función para volver a la lista (móvil)
  const handleBackToList = () => {
    router.back()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mensajería</h1>
        <p className={styles.subtitle}>Comunícate con tus pacientes de forma rápida y eficiente</p>
      </div>

      <div className={styles.content}>
        <div className={`${styles.conversationsPanel} ${selectedChat ? styles.hidden : ''}`}>
          <ConversationList
            selectedPacienteId={selectedChat?.id || null}
            onSelectConversation={handleSelectConversation}
            refreshKey={refreshKey}
          />
        </div>

        <div className={`${styles.chatPanel} ${selectedChat ? styles.active : ''}`}>
          {selectedChat ? (
            <ChatWindow
              pacienteId={selectedChat.id}
              tipo={selectedChat.tipo}
              onMessageSent={handleMessageSent}
              onBack={handleBackToList}
            />
          ) : (
            <div className={styles.emptyState}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <h3>Selecciona una conversación</h3>
              <p>Elige un paciente o prospecto de la lista para ver sus mensajes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function MensajesPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <MensajesContent />
    </Suspense>
  )
}
