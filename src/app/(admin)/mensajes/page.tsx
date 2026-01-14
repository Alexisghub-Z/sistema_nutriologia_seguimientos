'use client'

import { useState, useEffect } from 'react'
import ConversationList from '@/components/mensajes/ConversationList'
import ChatWindow from '@/components/mensajes/ChatWindow'
import styles from './mensajes.module.css'

export default function MensajesPage() {
  const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Función para refrescar la lista de conversaciones cuando se envía un mensaje
  const handleMessageSent = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Mensajería</h1>
        <p className={styles.subtitle}>
          Comunícate con tus pacientes de forma rápida y eficiente
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.conversationsPanel}>
          <ConversationList
            selectedPacienteId={selectedPacienteId}
            onSelectConversation={setSelectedPacienteId}
            refreshKey={refreshKey}
          />
        </div>

        <div className={styles.chatPanel}>
          {selectedPacienteId ? (
            <ChatWindow
              pacienteId={selectedPacienteId}
              onMessageSent={handleMessageSent}
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
              <p>Elige un paciente de la lista para ver sus mensajes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
