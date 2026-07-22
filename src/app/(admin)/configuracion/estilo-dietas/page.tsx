'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import styles from '../calendario/calendario.module.css'

interface PerfilEstilo {
  region: string
  alimentos_tipicos: string
  alimentos_evitar: string
  estructura_notas: string
  reglas_propias: string
  tono: string
  instrucciones_libres: string
  indicaciones_inicio: string
}

export default function EstiloDietasPage() {
  const router = useRouter()
  const [perfil, setPerfil] = useState<PerfilEstilo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/dietas/perfil-estilo')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setPerfil({
            region: data.region || '',
            alimentos_tipicos: data.alimentos_tipicos || '',
            alimentos_evitar: data.alimentos_evitar || '',
            estructura_notas: data.estructura_notas || '',
            reglas_propias: data.reglas_propias || '',
            tono: data.tono || '',
            instrucciones_libres: data.instrucciones_libres || '',
            indicaciones_inicio: data.indicaciones_inicio || '',
          })
        } else {
          setError('Error al cargar el perfil')
        }
      })
      .catch(() => setError('Error de conexión'))
      .finally(() => setLoading(false))
  }, [])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perfil) return
    try {
      setSaving(true)
      setError('')
      setSuccess(false)
      const res = await fetch('/api/dietas/perfil-estilo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(perfil),
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

  const setCampo = (campo: keyof PerfilEstilo, valor: string) => {
    setPerfil((p) => (p ? { ...p, [campo]: valor } : p))
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <p>Cargando perfil…</p>
        </div>
      </div>
    )
  }

  if (!perfil) {
    return (
      <div className={styles.container}>
        <Alert variant="error">No se pudo cargar el perfil de estilo</Alert>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} onClick={() => router.push('/configuracion')}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 4l-6 6 6 6" />
            </svg>
            Volver a Configuración
          </button>
          <h1 className={styles.title}>Estilo de mis dietas (IA)</h1>
          <p className={styles.subtitle}>
            Describe cómo haces tú las dietas. La IA usará esto para proponer dietas a tu estilo,
            con tus alimentos y tus reglas. Puedes dejar campos vacíos.
          </p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Perfil guardado</Alert>}

      <form onSubmit={guardar}>
        <div className={styles.grid}>
          <Card>
            <CardHeader>
              <CardTitle>Indicaciones de inicio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.formGroup}>
                <label htmlFor="indicaciones_inicio">
                  Recomendaciones generales que van al inicio de cada dieta
                </label>
                <textarea
                  id="indicaciones_inicio"
                  rows={8}
                  value={perfil.indicaciones_inicio}
                  onChange={(e) => setCampo('indicaciones_inicio', e.target.value)}
                  placeholder={
                    'Ej: Puedes utilizar sal, ajo y hierbas de aroma y sabor. Evita salsas y aderezos ' +
                    'con azúcar o mayonesa. Evita alimentos fritos, capeados o empanizados. Cocina ' +
                    'carnes y huevo sin aceite (salvo aceite en aerosol). Prefiere alimentos asados, al ' +
                    'vapor, horneados o en caldos. Evita el azúcar; puedes endulzar con sustituto ' +
                    '(Svetia, Splenda). No combines: tortillas, pan, arroz, frijoles, lentejas, avena, ' +
                    'papas. Bebe mínimo 2 L de agua natural al día…'
                  }
                />
                <small>
                  Este texto aparecerá al inicio de las dietas que genere la IA. Escríbelo con tus
                  propias palabras y recomendaciones.
                </small>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cómo hago mis dietas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.formGroup}>
                <label htmlFor="region">Región / contexto</label>
                <input
                  type="text"
                  id="region"
                  value={perfil.region}
                  onChange={(e) => setCampo('region', e.target.value)}
                  placeholder="Ej: Oaxaca, México"
                />
                <small>Para que la IA sugiera alimentos típicos de tu zona.</small>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="alimentos_tipicos">Alimentos que suelo usar</label>
                <textarea
                  id="alimentos_tipicos"
                  rows={3}
                  value={perfil.alimentos_tipicos}
                  onChange={(e) => setCampo('alimentos_tipicos', e.target.value)}
                  placeholder="Ej: tlayudas, quintoniles, frijol negro, quesillo, memelas, chapulines…"
                />
                <small>Sepáralos con comas. Entre más pongas, mejor imita tu estilo.</small>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="alimentos_evitar">Alimentos que evito o no recomiendo</label>
                <textarea
                  id="alimentos_evitar"
                  rows={2}
                  value={perfil.alimentos_evitar}
                  onChange={(e) => setCampo('alimentos_evitar', e.target.value)}
                  placeholder="Ej: ultraprocesados, refrescos, embutidos…"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="estructura_notas">Cómo estructuro mis dietas</label>
                <textarea
                  id="estructura_notas"
                  rows={2}
                  value={perfil.estructura_notas}
                  onChange={(e) => setCampo('estructura_notas', e.target.value)}
                  placeholder="Ej: 5 tiempos de comida, porciones caseras (tazas, piezas, cucharadas)…"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="reglas_propias">Reglas propias</label>
                <textarea
                  id="reglas_propias"
                  rows={2}
                  value={perfil.reglas_propias}
                  onChange={(e) => setCampo('reglas_propias', e.target.value)}
                  placeholder="Ej: siempre incluyo verdura en comida y cena; nunca fruta en la noche…"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="tono">Tono de las indicaciones al paciente</label>
                <input
                  type="text"
                  id="tono"
                  value={perfil.tono}
                  onChange={(e) => setCampo('tono', e.target.value)}
                  placeholder="Ej: cercano, explico el porqué de cada recomendación"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="instrucciones_libres">Instrucciones adicionales (opcional)</label>
                <textarea
                  id="instrucciones_libres"
                  rows={3}
                  value={perfil.instrucciones_libres}
                  onChange={(e) => setCampo('instrucciones_libres', e.target.value)}
                  placeholder="Cualquier otra indicación para la IA sobre cómo armar tus dietas."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar perfil'}
          </Button>
        </div>
      </form>
    </div>
  )
}
