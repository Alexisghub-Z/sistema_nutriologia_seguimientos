'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import styles from '../calendario/calendario.module.css'
import propio from './notificaciones.module.css'

interface ConfigNotif {
  notif_email_activa: boolean
  notif_email_destino: string | null
  notif_nueva_cita: boolean
  notif_cancelacion: boolean
  notif_reagendamiento: boolean
  notif_confirmacion: boolean
}

type CampoAviso = 'notif_nueva_cita' | 'notif_confirmacion' | 'notif_reagendamiento' | 'notif_cancelacion'

const AVISOS: { campo: CampoAviso; label: string; desc: string }[] = [
  { campo: 'notif_nueva_cita', label: 'Nueva cita agendada', desc: 'Cuando un paciente agenda una cita' },
  { campo: 'notif_confirmacion', label: 'Cita confirmada', desc: 'Cuando un paciente confirma su asistencia' },
  { campo: 'notif_reagendamiento', label: 'Cita reagendada', desc: 'Cuando un paciente cambia la fecha u hora' },
  { campo: 'notif_cancelacion', label: 'Cita cancelada', desc: 'Cuando un paciente cancela su cita' },
]

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`${propio.switch} ${checked ? propio.switchOn : ''} ${disabled ? propio.switchDisabled : ''}`}
    >
      <span className={propio.switchKnob} />
    </button>
  )
}

export default function ConfiguracionNotificacionesPage() {
  const router = useRouter()
  const [config, setConfig] = useState<ConfigNotif | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/configuracion')
      if (res.ok) {
        setConfig(await res.json())
      } else {
        setError('Error al cargar configuración')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const set = (campo: keyof ConfigNotif, valor: boolean | string) => {
    if (!config) return
    setConfig({ ...config, [campo]: valor })
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notif_email_activa: config.notif_email_activa,
          notif_email_destino: config.notif_email_destino || '',
          notif_nueva_cita: config.notif_nueva_cita,
          notif_cancelacion: config.notif_cancelacion,
          notif_reagendamiento: config.notif_reagendamiento,
          notif_confirmacion: config.notif_confirmacion,
        }),
      })
      if (res.ok) {
        setSuccess('Preferencias guardadas')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Error al guardar')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Cargando configuración...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className={styles.container}>
        <Alert variant="error">No se pudo cargar la configuración</Alert>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} onClick={() => router.push('/configuracion')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 4l-6 6 6 6" />
            </svg>
            Volver a Configuración
          </button>
          <h1 className={styles.title}>Notificaciones por Email</h1>
          <p className={styles.subtitle}>
            Elige de qué acciones de tus pacientes quieres recibir un aviso por correo
          </p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <form onSubmit={guardar}>
        <div className={styles.grid}>
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones por email</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={propio.filaSwitch}>
                <div>
                  <strong>Activar notificaciones</strong>
                  <p className={propio.hint}>Interruptor general. Si está apagado, no se envía ningún correo.</p>
                </div>
                <Switch checked={config.notif_email_activa} onChange={(v) => set('notif_email_activa', v)} />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="destino">Correo que recibe los avisos</label>
                <input
                  type="email"
                  id="destino"
                  placeholder="nutriologo@ejemplo.com"
                  value={config.notif_email_destino || ''}
                  onChange={(e) => set('notif_email_destino', e.target.value)}
                />
                <small>A esta dirección llegarán las notificaciones de tus pacientes.</small>
              </div>

              {AVISOS.map((a) => (
                <div key={a.campo} className={propio.filaSwitch}>
                  <div>
                    <strong>{a.label}</strong>
                    <p className={propio.hint}>{a.desc}</p>
                  </div>
                  <Switch
                    checked={config[a.campo]}
                    onChange={(v) => set(a.campo, v)}
                    disabled={!config.notif_email_activa}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </form>
    </div>
  )
}
