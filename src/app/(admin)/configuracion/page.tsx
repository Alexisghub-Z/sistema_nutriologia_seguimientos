'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import styles from './configuracion.module.css'
import { ReactElement } from 'react'

interface ConfigSection {
  title: string
  description: string
  icon: ReactElement
  href: string
  color: string
}

export default function ConfiguracionPage() {
  const sections: ConfigSection[] = [
    {
      title: 'Configuración del Calendario',
      description:
        'Configura horarios de atención, días laborales y disponibilidad para agendar citas',
      icon: (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      href: '/configuracion/calendario',
      color: 'blue',
    },
    {
      title: 'Google Calendar',
      description:
        'Sincroniza automáticamente tus citas con Google Calendar para tener recordatorios personales',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
        </svg>
      ),
      href: '/configuracion/google-calendar',
      color: 'green',
    },
    {
      title: 'Plantillas de Mensajes',
      description: 'Crea y gestiona plantillas reutilizables para tus mensajes con pacientes',
      icon: (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      href: '/configuracion/plantillas',
      color: 'purple',
    },
  ]

  const getColorClass = (color: string): string => {
    const colorClasses: Record<string, string> = {
      blue: styles.cardBlue ?? '',
      green: styles.cardGreen ?? '',
      purple: styles.cardPurple ?? '',
    }
    return colorClasses[color] ?? styles.cardBlue ?? ''
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Configuración</h1>
        <p className={styles.subtitle}>
          Personaliza y configura los diferentes aspectos de tu sistema de gestión
        </p>
      </div>

      <div className={styles.grid}>
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className={`${styles.configCard} ${getColorClass(section.color)}`}
          >
            <Card>
              <CardHeader>
                <div className={styles.cardIcon}>{section.icon}</div>
                <CardTitle className={styles.cardTitle}>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={styles.cardDescription}>{section.description}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.cardLink}>
                    Configurar
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
