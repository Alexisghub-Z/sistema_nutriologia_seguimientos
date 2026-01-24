'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import styles from './google-calendar.module.css'

interface AccountInfo {
  email: string
  name: string | null
  picture: string | null
}

export default function GoogleCalendarConfigPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()

    // Verificar mensajes de query params
    const errorParam = searchParams.get('error')
    const successParam = searchParams.get('success')

    if (errorParam) {
      if (errorParam === 'oauth_error') {
        setError('Error en la autenticación con Google')
      } else if (errorParam === 'no_code') {
        setError('No se recibió código de autorización')
      } else if (errorParam === 'token_exchange_failed') {
        setError('Error al intercambiar código por tokens')
      }
    }

    if (successParam === 'google_calendar_connected') {
      setSuccess('Google Calendar conectado exitosamente')
      checkStatus()
    }
  }, [searchParams])

  const checkStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/google-calendar/status')
      if (!response.ok) {
        throw new Error('Error al verificar estado')
      }

      const data = await response.json()
      setConfigured(data.configured)
      setAccountInfo(data.account)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setConnecting(true)
      setError(null)

      const response = await fetch('/api/google-calendar/auth')
      if (!response.ok) {
        throw new Error('Error al obtener URL de autenticación')
      }

      const data = await response.json()
      window.location.href = data.authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (
      !confirm(
        '¿Estás seguro de desconectar Google Calendar? Las citas ya creadas permanecerán en tu calendario.'
      )
    ) {
      return
    }

    try {
      setDisconnecting(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Error al desconectar')
      }

      setSuccess('Google Calendar desconectado exitosamente')
      setConfigured(false)
      setAccountInfo(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al desconectar')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Configuración de Google Calendar</h1>
        <p className={styles.subtitle}>
          Sincroniza automáticamente las citas con tu Google Calendar
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {loading ? (
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Verificando estado de conexión...</p>
        </div>
      ) : (
        <div className={styles.content}>
          <Card>
            <CardHeader>
              <CardTitle>Estado de Conexión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.statusContainer}>
                <div className={styles.statusIndicator}>
                  <div
                    className={`${styles.statusDot} ${
                      configured ? styles.statusConnected : styles.statusDisconnected
                    }`}
                  />
                  <span className={styles.statusText}>
                    {configured ? 'Conectado' : 'No conectado'}
                  </span>
                </div>

                {configured ? (
                  <div className={styles.connectedInfo}>
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={styles.successIcon}
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <h3>Google Calendar Conectado</h3>

                    {accountInfo && (
                      <div className={styles.accountInfo}>
                        {accountInfo.picture && (
                          <img
                            src={accountInfo.picture}
                            alt={accountInfo.name || accountInfo.email}
                            className={styles.accountPicture}
                          />
                        )}
                        <div className={styles.accountDetails}>
                          {accountInfo.name && (
                            <p className={styles.accountName}>{accountInfo.name}</p>
                          )}
                          <p className={styles.accountEmail}>{accountInfo.email}</p>
                        </div>
                      </div>
                    )}

                    <p className={styles.connectedDescription}>
                      Las citas se sincronizarán automáticamente con tu calendario personal de
                      Google. Solo tú verás las citas, no se envían invitaciones a los pacientes.
                    </p>

                    <div className={styles.connectedActions}>
                      <Button
                        variant="secondary"
                        onClick={() => window.location.reload()}
                        disabled={disconnecting}
                      >
                        Reconectar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className={styles.disconnectButton}
                      >
                        {disconnecting ? 'Desconectando...' : 'Desconectar'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.disconnectedInfo}>
                    <svg
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={styles.warningIcon}
                    >
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <h3>Conectar con Google Calendar</h3>
                    <p>
                      Conecta tu cuenta de Google para tener todas tus citas en tu calendario
                      personal. Solo tú verás las citas, no se envían notificaciones a los
                      pacientes.
                    </p>
                    <Button
                      onClick={handleConnect}
                      disabled={connecting}
                      className={styles.connectButton}
                    >
                      {connecting ? (
                        <>
                          <Spinner size="small" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                          </svg>
                          Conectar con Google
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className={styles.infoCard}>
            <CardHeader>
              <CardTitle>Información</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.infoList}>
                <div className={styles.infoItem}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <div>
                    <strong>Sincronización Automática</strong>
                    <p>Las citas se crean automáticamente en tu calendario personal</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <div>
                    <strong>Recordatorios Personales</strong>
                    <p>Recibirás notificaciones en tu dispositivo antes de cada cita</p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2v20M2 12h20" />
                  </svg>
                  <div>
                    <strong>Calendario Privado</strong>
                    <p>
                      Solo tú verás las citas. Los pacientes no recibirán notificaciones de Google
                    </p>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <div>
                    <strong>Actualización Automática</strong>
                    <p>Los cambios en el sistema se reflejan inmediatamente en tu calendario</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
