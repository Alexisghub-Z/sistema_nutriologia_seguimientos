'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import Button from '@/components/ui/Button'
import PlantillaSelector from './PlantillaSelector'
import styles from './MessageInput.module.css'

interface MessageInputProps {
  onSendMessage: (contenido: string) => Promise<void>
  onProcessTemplate?: (contenido: string) => string
}

export default function MessageInput({ onSendMessage, onProcessTemplate }: MessageInputProps) {
  const [contenido, setContenido] = useState('')
  const [sending, setSending] = useState(false)
  const [showPlantillas, setShowPlantillas] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContenido(e.target.value)

    // Reset height to auto to recalculate
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  // Handle send
  const handleSend = async () => {
    if (!contenido.trim() || sending) return

    setSending(true)
    try {
      await onSendMessage(contenido.trim())
      setContenido('')

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error)
    } finally {
      setSending(false)
    }
  }

  // Handle Enter key
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.inputWrapper}>
        {/* Botón de plantillas */}
        <button
          className={styles.templateButton}
          onClick={() => setShowPlantillas(true)}
          disabled={sending}
          title="Seleccionar plantilla"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={contenido}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          className={styles.textarea}
          rows={1}
          disabled={sending}
        />

        <Button
          onClick={handleSend}
          disabled={!contenido.trim() || sending}
          loading={sending}
          className={styles.sendButton}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </Button>
      </div>

      <p className={styles.hint}>
        Presiona <kbd>Enter</kbd> para enviar, <kbd>Shift + Enter</kbd> para nueva línea
      </p>

      {/* Modal de selección de plantillas */}
      {showPlantillas && (
        <PlantillaSelector
          onSelectPlantilla={(contenidoPlantilla) => {
            // Procesar plantilla con variables si hay una función de procesamiento
            const contenidoProcesado = onProcessTemplate
              ? onProcessTemplate(contenidoPlantilla)
              : contenidoPlantilla

            setContenido(contenidoProcesado)
            // Auto-resize textarea después de insertar plantilla
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto'
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
              }
            }, 0)
          }}
          onClose={() => setShowPlantillas(false)}
        />
      )}
    </div>
  )
}
