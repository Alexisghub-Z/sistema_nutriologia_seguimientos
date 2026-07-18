'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import styles from '../calendario/calendario.module.css'

interface ConfigMarca {
  nombre_consultorio: string
  whatsapp_publico: string | null
}

export default function ConfiguracionMarcaPage() {
  const router = useRouter()
  const [config, setConfig] = useState<ConfigMarca | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/configuracion')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setConfig({
            nombre_consultorio: data.nombre_consultorio || '',
            whatsapp_publico: data.whatsapp_publico || '',
          })
        } else {
          setError('Error al cargar configuración')
        }
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    try {
      setSaving(true)
      setError('')
      setSuccess(false)
      const res = await fetch('/api/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_consultorio: config.nombre_consultorio,
          whatsapp_publico: config.whatsapp_publico || null,
        }),
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
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
          <h1 className={styles.title}>Marca del Consultorio</h1>
          <p className={styles.subtitle}>
            El nombre y WhatsApp que ven tus pacientes en las páginas públicas (agendar, mi progreso)
          </p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Cambios guardados</Alert>}

      <form onSubmit={guardar}>
        <div className={styles.grid}>
          <Card>
            <CardHeader>
              <CardTitle>Datos públicos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.formGroup}>
                <label htmlFor="nombre">Nombre del consultorio</label>
                <input
                  type="text"
                  id="nombre"
                  value={config.nombre_consultorio}
                  onChange={(e) => setConfig({ ...config, nombre_consultorio: e.target.value })}
                  placeholder="Ej: Nutrición Dra. Martínez"
                  required
                />
                <small>Aparece como logo en las páginas de tus pacientes.</small>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="whatsapp">WhatsApp de contacto (opcional)</label>
                <input
                  type="text"
                  id="whatsapp"
                  value={config.whatsapp_publico || ''}
                  onChange={(e) => setConfig({ ...config, whatsapp_publico: e.target.value })}
                  placeholder="Ej: 5219511234567"
                />
                <small>
                  Solo dígitos con lada (52 para México). Es el botón flotante de WhatsApp de tus
                  páginas públicas. Si lo dejas vacío, el botón no aparece.
                </small>
              </div>
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
