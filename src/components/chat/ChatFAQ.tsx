'use client'

import { useState } from 'react'
import styles from './ChatFAQ.module.css'

interface Pregunta {
  pregunta: string
  respuesta: string
  categoria?: string
}

const preguntasFrecuentes: Pregunta[] = [
  {
    pregunta: '¿Cuánto cuesta la consulta?',
    respuesta: 'La primera consulta tiene un costo de $XXX pesos e incluye evaluación completa, plan nutricional personalizado y seguimiento. Las consultas subsecuentes tienen un costo especial.',
    categoria: 'Costos'
  },
  {
    pregunta: '¿Cuánto dura una consulta?',
    respuesta: 'La primera consulta dura aproximadamente 60 minutos. Las consultas de seguimiento tienen una duración de 30-45 minutos.',
    categoria: 'Consultas'
  },
  {
    pregunta: '¿Ofrecen consultas en línea?',
    respuesta: 'Sí, ofrecemos consultas tanto presenciales como en línea por videollamada. Puedes elegir la modalidad que prefieras al agendar tu cita.',
    categoria: 'Consultas'
  },
  {
    pregunta: '¿Qué necesito para la primera consulta?',
    respuesta: 'Para tu primera consulta necesitas: ayuno de 8-12 horas si vas a tomarte medidas, estudios de laboratorio recientes (si los tienes), y una lista de medicamentos que tomes actualmente.',
    categoria: 'Consultas'
  },
  {
    pregunta: '¿Cada cuánto son las consultas de seguimiento?',
    respuesta: 'Generalmente recomendamos consultas de seguimiento cada 2-4 semanas, dependiendo de tus objetivos y progreso. El seguimiento personalizado es clave para lograr resultados sostenibles.',
    categoria: 'Seguimiento'
  },
  {
    pregunta: '¿Atienden a niños?',
    respuesta: 'Sí, ofrecemos consultas de nutrición pediátrica para niños y adolescentes. Trabajamos con planes alimenticios adaptados a cada etapa de crecimiento.',
    categoria: 'Servicios'
  },
  {
    pregunta: '¿Puedo cancelar o reagendar mi cita?',
    respuesta: 'Sí, puedes cancelar o reagendar tu cita con al menos 24 horas de anticipación. Usa el código que recibiste por email o WhatsApp para gestionar tu cita.',
    categoria: 'Citas'
  },
  {
    pregunta: '¿Aceptan seguros médicos?',
    respuesta: 'Actualmente trabajamos con pago directo. Te proporcionamos factura que puedes presentar a tu aseguradora para posible reembolso, dependiendo de tu póliza.',
    categoria: 'Pagos'
  }
]

export default function ChatFAQ() {
  const [isOpen, setIsOpen] = useState(false)
  const [mensajes, setMensajes] = useState<Array<{ tipo: 'bot' | 'usuario'; texto: string }>>([
    { tipo: 'bot', texto: '¡Hola! 👋 Soy el asistente virtual del consultorio. ¿En qué puedo ayudarte?' }
  ])

  const handlePregunta = (pregunta: Pregunta) => {
    // Agregar pregunta del usuario
    setMensajes(prev => [...prev, { tipo: 'usuario', texto: pregunta.pregunta }])

    // Agregar respuesta del bot después de un delay
    setTimeout(() => {
      setMensajes(prev => [...prev, { tipo: 'bot', texto: pregunta.respuesta }])
    }, 500)
  }

  const reiniciarChat = () => {
    setMensajes([
      { tipo: 'bot', texto: '¡Hola! 👋 Soy el asistente virtual del consultorio. ¿En qué puedo ayudarte?' }
    ])
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.chatButton}
        aria-label="Abrir chat de ayuda"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Ventana del chat */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.headerInfo}>
              <div className={styles.avatar}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                </svg>
              </div>
              <div>
                <h3 className={styles.chatTitle}>Asistente Virtual</h3>
                <p className={styles.chatStatus}>En línea</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className={styles.closeButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Mensajes */}
          <div className={styles.chatMessages}>
            {mensajes.map((mensaje, index) => (
              <div
                key={index}
                className={`${styles.mensaje} ${
                  mensaje.tipo === 'bot' ? styles.mensajeBot : styles.mensajeUsuario
                }`}
              >
                <div className={styles.mensajeContenido}>{mensaje.texto}</div>
              </div>
            ))}

            {/* Preguntas sugeridas (solo si no hay muchos mensajes) */}
            {mensajes.length < 10 && (
              <div className={styles.preguntas}>
                <p className={styles.preguntasTitulo}>Preguntas frecuentes:</p>
                <div className={styles.preguntasGrid}>
                  {preguntasFrecuentes.map((pregunta, index) => (
                    <button
                      key={index}
                      onClick={() => handlePregunta(pregunta)}
                      className={styles.preguntaBoton}
                    >
                      {pregunta.pregunta}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={styles.chatFooter}>
            <button onClick={reiniciarChat} className={styles.reiniciarButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Reiniciar chat
            </button>
            <a href="/agendar" className={styles.agendarButton}>
              Agendar cita
            </a>
          </div>
        </div>
      )}
    </>
  )
}
