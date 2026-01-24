'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import styles from './agregar-historica.module.css'

export default function AgregarConsultaHistoricaPage() {
  const params = useParams()
  const router = useRouter()
  const pacienteId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    fecha: '',
    motivo: '',
    peso: '',
    talla: '',
    grasa_corporal: '',
    porcentaje_agua: '',
    masa_muscular_kg: '',
    grasa_visceral: '',
    brazo_relajado: '',
    brazo_flexionado: '',
    cintura: '',
    cadera_maximo: '',
    muslo_maximo: '',
    muslo_medio: '',
    pantorrilla_maximo: '',
    pliegue_tricipital: '',
    pliegue_subescapular: '',
    pliegue_bicipital: '',
    pliegue_cresta_iliaca: '',
    pliegue_supraespinal: '',
    pliegue_abdominal: '',
    notas: '',
    diagnostico: '',
    objetivo: '',
    plan: '',
    observaciones: '',
    proxima_cita: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validar que tenga fecha
      if (!formData.fecha) {
        throw new Error('La fecha de la consulta es requerida')
      }

      // Preparar datos
      const data: any = {
        paciente_id: pacienteId,
        fecha: new Date(formData.fecha).toISOString(),
        motivo: formData.motivo || undefined,
        notas: formData.notas || undefined,
        diagnostico: formData.diagnostico || undefined,
        objetivo: formData.objetivo || undefined,
        plan: formData.plan || undefined,
        observaciones: formData.observaciones || undefined,
        proxima_cita: formData.proxima_cita
          ? new Date(formData.proxima_cita).toISOString()
          : undefined,
      }

      // Agregar mediciones numéricas si tienen valor
      if (formData.peso) data.peso = parseFloat(formData.peso)
      if (formData.talla) data.talla = parseFloat(formData.talla)
      if (formData.grasa_corporal) data.grasa_corporal = parseFloat(formData.grasa_corporal)
      if (formData.porcentaje_agua) data.porcentaje_agua = parseFloat(formData.porcentaje_agua)
      if (formData.masa_muscular_kg) data.masa_muscular_kg = parseFloat(formData.masa_muscular_kg)
      if (formData.grasa_visceral) data.grasa_visceral = parseInt(formData.grasa_visceral)

      // Perímetros
      if (formData.brazo_relajado) data.brazo_relajado = parseFloat(formData.brazo_relajado)
      if (formData.brazo_flexionado) data.brazo_flexionado = parseFloat(formData.brazo_flexionado)
      if (formData.cintura) data.cintura = parseFloat(formData.cintura)
      if (formData.cadera_maximo) data.cadera_maximo = parseFloat(formData.cadera_maximo)
      if (formData.muslo_maximo) data.muslo_maximo = parseFloat(formData.muslo_maximo)
      if (formData.muslo_medio) data.muslo_medio = parseFloat(formData.muslo_medio)
      if (formData.pantorrilla_maximo)
        data.pantorrilla_maximo = parseFloat(formData.pantorrilla_maximo)

      // Pliegues
      if (formData.pliegue_tricipital)
        data.pliegue_tricipital = parseFloat(formData.pliegue_tricipital)
      if (formData.pliegue_subescapular)
        data.pliegue_subescapular = parseFloat(formData.pliegue_subescapular)
      if (formData.pliegue_bicipital)
        data.pliegue_bicipital = parseFloat(formData.pliegue_bicipital)
      if (formData.pliegue_cresta_iliaca)
        data.pliegue_cresta_iliaca = parseFloat(formData.pliegue_cresta_iliaca)
      if (formData.pliegue_supraespinal)
        data.pliegue_supraespinal = parseFloat(formData.pliegue_supraespinal)
      if (formData.pliegue_abdominal)
        data.pliegue_abdominal = parseFloat(formData.pliegue_abdominal)

      // Crear consulta histórica
      const response = await fetch('/api/consultas/historica', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear consulta')
      }

      // Redirigir al historial
      router.push(`/pacientes/${pacienteId}/consultas`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push(`/pacientes/${pacienteId}/consultas`)
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="outline"
            size="small"
            onClick={handleCancel}
            className={styles.backButton}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Volver
          </Button>
          <div>
            <h1 className={styles.title}>Agregar Consulta del Historial Previo</h1>
            <p className={styles.subtitle}>Registro de consulta realizada anteriormente</p>
          </div>
        </div>
      </div>

      {/* Info Alert */}
      <div className={styles.infoAlert}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={styles.infoIcon}
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <strong>Esta es una consulta de registro histórico</strong>
          <p>
            No se enviarán recordatorios ni mensajes automáticos. Solo se agregará al historial del
            paciente.
          </p>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Fecha de la Consulta */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Información General</h2>

          <div className={styles.formGroup}>
            <label htmlFor="fecha" className={styles.label}>
              Fecha de la Consulta <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              className={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="motivo" className={styles.label}>
              Motivo de la Consulta
            </label>
            <input
              type="text"
              id="motivo"
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
              className={styles.input}
              placeholder="Ej: Primera consulta, Control de peso, etc."
              disabled={loading}
            />
          </div>
        </section>

        {/* Mediciones Básicas */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mediciones Básicas</h2>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="peso" className={styles.label}>
                Peso (kg)
              </label>
              <input
                type="number"
                id="peso"
                name="peso"
                value={formData.peso}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                placeholder="Ej: 70.5"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="talla" className={styles.label}>
                Talla (m)
              </label>
              <input
                type="number"
                id="talla"
                name="talla"
                value={formData.talla}
                onChange={handleChange}
                className={styles.input}
                step="0.01"
                min="0"
                placeholder="Ej: 1.65"
                disabled={loading}
              />
            </div>
          </div>
        </section>

        {/* Composición Corporal */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Composición Corporal</h2>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="grasa_corporal" className={styles.label}>
                % Grasa Corporal
              </label>
              <input
                type="number"
                id="grasa_corporal"
                name="grasa_corporal"
                value={formData.grasa_corporal}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                max="100"
                placeholder="Ej: 25.5"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="porcentaje_agua" className={styles.label}>
                % Agua
              </label>
              <input
                type="number"
                id="porcentaje_agua"
                name="porcentaje_agua"
                value={formData.porcentaje_agua}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                max="100"
                placeholder="Ej: 60.0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="masa_muscular_kg" className={styles.label}>
                Masa Muscular (kg)
              </label>
              <input
                type="number"
                id="masa_muscular_kg"
                name="masa_muscular_kg"
                value={formData.masa_muscular_kg}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                placeholder="Ej: 35.0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="grasa_visceral" className={styles.label}>
                Grasa Visceral
              </label>
              <input
                type="number"
                id="grasa_visceral"
                name="grasa_visceral"
                value={formData.grasa_visceral}
                onChange={handleChange}
                className={styles.input}
                step="1"
                min="0"
                placeholder="Ej: 8"
                disabled={loading}
              />
            </div>
          </div>
        </section>

        {/* Perímetros */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Perímetros (cm)</h2>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="brazo_relajado" className={styles.label}>
                Brazo Relajado
              </label>
              <input
                type="number"
                id="brazo_relajado"
                name="brazo_relajado"
                value={formData.brazo_relajado}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="brazo_flexionado" className={styles.label}>
                Brazo Flexionado
              </label>
              <input
                type="number"
                id="brazo_flexionado"
                name="brazo_flexionado"
                value={formData.brazo_flexionado}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="cintura" className={styles.label}>
                Cintura
              </label>
              <input
                type="number"
                id="cintura"
                name="cintura"
                value={formData.cintura}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="cadera_maximo" className={styles.label}>
                Cadera Máximo
              </label>
              <input
                type="number"
                id="cadera_maximo"
                name="cadera_maximo"
                value={formData.cadera_maximo}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="muslo_maximo" className={styles.label}>
                Muslo Máximo
              </label>
              <input
                type="number"
                id="muslo_maximo"
                name="muslo_maximo"
                value={formData.muslo_maximo}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="muslo_medio" className={styles.label}>
                Muslo Medio
              </label>
              <input
                type="number"
                id="muslo_medio"
                name="muslo_medio"
                value={formData.muslo_medio}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pantorrilla_maximo" className={styles.label}>
                Pantorrilla Máximo
              </label>
              <input
                type="number"
                id="pantorrilla_maximo"
                name="pantorrilla_maximo"
                value={formData.pantorrilla_maximo}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>
          </div>
        </section>

        {/* Pliegues Cutáneos */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Pliegues Cutáneos (mm)</h2>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="pliegue_tricipital" className={styles.label}>
                P. Tricipital
              </label>
              <input
                type="number"
                id="pliegue_tricipital"
                name="pliegue_tricipital"
                value={formData.pliegue_tricipital}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pliegue_subescapular" className={styles.label}>
                P. Subescapular
              </label>
              <input
                type="number"
                id="pliegue_subescapular"
                name="pliegue_subescapular"
                value={formData.pliegue_subescapular}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pliegue_bicipital" className={styles.label}>
                P. Bicipital
              </label>
              <input
                type="number"
                id="pliegue_bicipital"
                name="pliegue_bicipital"
                value={formData.pliegue_bicipital}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="pliegue_cresta_iliaca" className={styles.label}>
                P. Cresta Ilíaca
              </label>
              <input
                type="number"
                id="pliegue_cresta_iliaca"
                name="pliegue_cresta_iliaca"
                value={formData.pliegue_cresta_iliaca}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pliegue_supraespinal" className={styles.label}>
                P. Supraespinal
              </label>
              <input
                type="number"
                id="pliegue_supraespinal"
                name="pliegue_supraespinal"
                value={formData.pliegue_supraespinal}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="pliegue_abdominal" className={styles.label}>
                P. Abdominal
              </label>
              <input
                type="number"
                id="pliegue_abdominal"
                name="pliegue_abdominal"
                value={formData.pliegue_abdominal}
                onChange={handleChange}
                className={styles.input}
                step="0.1"
                min="0"
                disabled={loading}
              />
            </div>
          </div>
        </section>

        {/* Notas Clínicas */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Notas Clínicas</h2>

          <div className={styles.formGroup}>
            <label htmlFor="notas" className={styles.label}>
              Notas de la Consulta
            </label>
            <textarea
              id="notas"
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              className={styles.textarea}
              rows={4}
              placeholder="Observaciones generales de la consulta..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="diagnostico" className={styles.label}>
              Diagnóstico Nutricional
            </label>
            <textarea
              id="diagnostico"
              name="diagnostico"
              value={formData.diagnostico}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
              placeholder="Diagnóstico nutricional del paciente..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="objetivo" className={styles.label}>
              Objetivo del Tratamiento
            </label>
            <textarea
              id="objetivo"
              name="objetivo"
              value={formData.objetivo}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
              placeholder="Objetivos planteados para el paciente..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="plan" className={styles.label}>
              Plan Nutricional
            </label>
            <textarea
              id="plan"
              name="plan"
              value={formData.plan}
              onChange={handleChange}
              className={styles.textarea}
              rows={4}
              placeholder="Plan nutricional asignado al paciente..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="observaciones" className={styles.label}>
              Observaciones Adicionales
            </label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
              placeholder="Cualquier otra observación relevante..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="proxima_cita" className={styles.label}>
              Próxima Cita Sugerida
            </label>
            <input
              type="date"
              id="proxima_cita"
              name="proxima_cita"
              value={formData.proxima_cita}
              onChange={handleChange}
              className={styles.input}
              disabled={loading}
            />
            <p className={styles.helpText}>
              Fecha sugerida registrada en ese momento (no se enviarán recordatorios)
            </p>
          </div>
        </section>

        {/* Botones */}
        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar en Historial'}
          </Button>
        </div>
      </form>
    </div>
  )
}
