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
    antecedentes_familiares: '',
    estudios_laboratorio: '',
    observaciones: '',
    objetivo: '',
    plan: '',
  })

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const validateField = (name: string, value: string): string => {
    if (!value || value.trim() === '') return ''
    const num = parseFloat(value)
    switch (name) {
      case 'peso':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 2.5) return 'Mínimo 2.5 kg'
        if (num > 600) return 'Máximo 600 kg'
        break
      case 'talla':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 0.25) return 'Mínimo 0.25 m'
        if (num > 5) return 'Máximo 5 m'
        break
      case 'grasa_corporal':
      case 'porcentaje_agua':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 0) return 'Mínimo 0%'
        if (num > 100) return 'Máximo 100%'
        break
      case 'masa_muscular_kg':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 0.5) return 'Mínimo 0.5 kg'
        if (num > 400) return 'Máximo 400 kg'
        break
      case 'grasa_visceral':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 0) return 'Mínimo 0'
        if (num > 60) return 'Máximo 60'
        break
      case 'brazo_relajado':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 5) return 'Mínimo 5 cm'
        if (num > 160) return 'Máximo 160 cm'
        break
      case 'brazo_flexionado':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 5) return 'Mínimo 5 cm'
        if (num > 180) return 'Máximo 180 cm'
        break
      case 'cintura':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 15) return 'Mínimo 15 cm'
        if (num > 400) return 'Máximo 400 cm'
        break
      case 'cadera_maximo':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 30) return 'Mínimo 30 cm'
        if (num > 400) return 'Máximo 400 cm'
        break
      case 'muslo_maximo':
      case 'muslo_medio':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 10) return 'Mínimo 10 cm'
        if (num > 240) return 'Máximo 240 cm'
        break
      case 'pantorrilla_maximo':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 10) return 'Mínimo 10 cm'
        if (num > 160) return 'Máximo 160 cm'
        break
      case 'pliegue_tricipital':
      case 'pliegue_subescapular':
      case 'pliegue_bicipital':
      case 'pliegue_cresta_iliaca':
      case 'pliegue_supraespinal':
      case 'pliegue_abdominal':
        if (isNaN(num)) return 'Debe ser un número'
        if (num < 0.5) return 'Mínimo 0.5 mm'
        if (num > 120) return 'Máximo 120 mm'
        break
    }
    return ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumericChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    const err = validateField(name, value)
    setFieldErrors((prev) => {
      if (!err) {
        const { [name]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [name]: err }
    })
  }

  const inputClass = (name: string) =>
    `${styles.input}${fieldErrors[name] ? ` ${styles.inputError}` : ''}`

  // IMC calculado en tiempo real
  const pesoNum = parseFloat(formData.peso)
  const tallaNum = parseFloat(formData.talla)
  const imcPreview =
    formData.peso && formData.talla && !isNaN(pesoNum) && !isNaN(tallaNum) && tallaNum > 0
      ? (pesoNum / (tallaNum * tallaNum)).toFixed(1)
      : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Object.keys(fieldErrors).length > 0) return
    setLoading(true)
    setError(null)

    try {
      if (!formData.fecha) throw new Error('La fecha de la consulta es requerida')

      const pf = (v: string) => (v ? parseFloat(v) : undefined)

      const data: any = {
        paciente_id: pacienteId,
        fecha: `${formData.fecha}T12:00:00.000Z`,
        motivo: formData.motivo || undefined,
        peso: pf(formData.peso),
        talla: pf(formData.talla),
        grasa_corporal: pf(formData.grasa_corporal),
        porcentaje_agua: pf(formData.porcentaje_agua),
        masa_muscular_kg: pf(formData.masa_muscular_kg),
        grasa_visceral: pf(formData.grasa_visceral),
        brazo_relajado: pf(formData.brazo_relajado),
        brazo_flexionado: pf(formData.brazo_flexionado),
        cintura: pf(formData.cintura),
        cadera_maximo: pf(formData.cadera_maximo),
        muslo_maximo: pf(formData.muslo_maximo),
        muslo_medio: pf(formData.muslo_medio),
        pantorrilla_maximo: pf(formData.pantorrilla_maximo),
        pliegue_tricipital: pf(formData.pliegue_tricipital),
        pliegue_subescapular: pf(formData.pliegue_subescapular),
        pliegue_bicipital: pf(formData.pliegue_bicipital),
        pliegue_cresta_iliaca: pf(formData.pliegue_cresta_iliaca),
        pliegue_supraespinal: pf(formData.pliegue_supraespinal),
        pliegue_abdominal: pf(formData.pliegue_abdominal),
        notas: formData.notas || undefined,
        diagnostico: formData.diagnostico || undefined,
        antecedentes_familiares: formData.antecedentes_familiares || undefined,
        estudios_laboratorio: formData.estudios_laboratorio || undefined,
        observaciones: formData.observaciones || undefined,
        objetivo: formData.objetivo || undefined,
        plan: formData.plan || undefined,
      }

      // Limpiar undefined
      Object.keys(data).forEach((k) => data[k] === undefined && delete data[k])

      const response = await fetch('/api/consultas/historica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear consulta')
      }

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
                onChange={(e) => handleNumericChange('peso', e.target.value)}
                className={inputClass('peso')}
                step="0.1"
                min="0"
                placeholder="Ej: 70.5"
                disabled={loading}
              />
              {fieldErrors.peso && <span className={styles.errorText}>{fieldErrors.peso}</span>}
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
                onChange={(e) => handleNumericChange('talla', e.target.value)}
                className={inputClass('talla')}
                step="0.01"
                min="0"
                placeholder="Ej: 1.65"
                disabled={loading}
              />
              {fieldErrors.talla && <span className={styles.errorText}>{fieldErrors.talla}</span>}
            </div>
          </div>
          {imcPreview && (
            <div className={styles.imcPreview}>
              IMC calculado: <strong>{imcPreview}</strong>
            </div>
          )}
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
                onChange={(e) => handleNumericChange('grasa_corporal', e.target.value)}
                className={inputClass('grasa_corporal')}
                step="0.1"
                min="0"
                max="100"
                placeholder="Ej: 25.5"
                disabled={loading}
              />
              {fieldErrors.grasa_corporal && <span className={styles.errorText}>{fieldErrors.grasa_corporal}</span>}
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
                onChange={(e) => handleNumericChange('porcentaje_agua', e.target.value)}
                className={inputClass('porcentaje_agua')}
                step="0.1"
                min="0"
                max="100"
                placeholder="Ej: 60.0"
                disabled={loading}
              />
              {fieldErrors.porcentaje_agua && <span className={styles.errorText}>{fieldErrors.porcentaje_agua}</span>}
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
                onChange={(e) => handleNumericChange('masa_muscular_kg', e.target.value)}
                className={inputClass('masa_muscular_kg')}
                step="0.1"
                min="0"
                placeholder="Ej: 35.0"
                disabled={loading}
              />
              {fieldErrors.masa_muscular_kg && <span className={styles.errorText}>{fieldErrors.masa_muscular_kg}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="grasa_visceral" className={styles.label}>
                Grasa Visceral (nivel)
              </label>
              <input
                type="number"
                id="grasa_visceral"
                name="grasa_visceral"
                value={formData.grasa_visceral}
                onChange={(e) => handleNumericChange('grasa_visceral', e.target.value)}
                className={inputClass('grasa_visceral')}
                step="0.1"
                min="0"
                placeholder="Ej: 8.5"
                disabled={loading}
              />
              {fieldErrors.grasa_visceral && <span className={styles.errorText}>{fieldErrors.grasa_visceral}</span>}
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
                onChange={(e) => handleNumericChange('brazo_relajado', e.target.value)}
                className={inputClass('brazo_relajado')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.brazo_relajado && <span className={styles.errorText}>{fieldErrors.brazo_relajado}</span>}
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
                onChange={(e) => handleNumericChange('brazo_flexionado', e.target.value)}
                className={inputClass('brazo_flexionado')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.brazo_flexionado && <span className={styles.errorText}>{fieldErrors.brazo_flexionado}</span>}
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
                onChange={(e) => handleNumericChange('cintura', e.target.value)}
                className={inputClass('cintura')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.cintura && <span className={styles.errorText}>{fieldErrors.cintura}</span>}
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
                onChange={(e) => handleNumericChange('cadera_maximo', e.target.value)}
                className={inputClass('cadera_maximo')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.cadera_maximo && <span className={styles.errorText}>{fieldErrors.cadera_maximo}</span>}
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
                onChange={(e) => handleNumericChange('muslo_maximo', e.target.value)}
                className={inputClass('muslo_maximo')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.muslo_maximo && <span className={styles.errorText}>{fieldErrors.muslo_maximo}</span>}
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
                onChange={(e) => handleNumericChange('muslo_medio', e.target.value)}
                className={inputClass('muslo_medio')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.muslo_medio && <span className={styles.errorText}>{fieldErrors.muslo_medio}</span>}
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
                onChange={(e) => handleNumericChange('pantorrilla_maximo', e.target.value)}
                className={inputClass('pantorrilla_maximo')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.pantorrilla_maximo && <span className={styles.errorText}>{fieldErrors.pantorrilla_maximo}</span>}
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
                onChange={(e) => handleNumericChange('pliegue_tricipital', e.target.value)}
                className={inputClass('pliegue_tricipital')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.pliegue_tricipital && <span className={styles.errorText}>{fieldErrors.pliegue_tricipital}</span>}
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
                onChange={(e) => handleNumericChange('pliegue_subescapular', e.target.value)}
                className={inputClass('pliegue_subescapular')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.pliegue_subescapular && <span className={styles.errorText}>{fieldErrors.pliegue_subescapular}</span>}
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
                onChange={(e) => handleNumericChange('pliegue_bicipital', e.target.value)}
                className={inputClass('pliegue_bicipital')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.pliegue_bicipital && <span className={styles.errorText}>{fieldErrors.pliegue_bicipital}</span>}
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
                onChange={(e) => handleNumericChange('pliegue_cresta_iliaca', e.target.value)}
                className={inputClass('pliegue_cresta_iliaca')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.pliegue_cresta_iliaca && <span className={styles.errorText}>{fieldErrors.pliegue_cresta_iliaca}</span>}
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
                onChange={(e) => handleNumericChange('pliegue_supraespinal', e.target.value)}
                className={inputClass('pliegue_supraespinal')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.pliegue_supraespinal && <span className={styles.errorText}>{fieldErrors.pliegue_supraespinal}</span>}
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
                onChange={(e) => handleNumericChange('pliegue_abdominal', e.target.value)}
                className={inputClass('pliegue_abdominal')}
                step="0.1"
                min="0"
                disabled={loading}
              />
              {fieldErrors.pliegue_abdominal && <span className={styles.errorText}>{fieldErrors.pliegue_abdominal}</span>}
            </div>
          </div>
        </section>

        {/* Notas Clínicas */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Notas Clínicas</h2>

          <div className={styles.formGroup}>
            <label htmlFor="diagnostico" className={styles.label}>
              1. Diagnóstico y tratamiento médico
            </label>
            <textarea
              id="diagnostico"
              name="diagnostico"
              value={formData.diagnostico}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
              placeholder="Diagnóstico del estado nutricional y tratamiento médico..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="antecedentes_familiares" className={styles.label}>
              2. Antecedentes Familiares
            </label>
            <textarea
              id="antecedentes_familiares"
              name="antecedentes_familiares"
              value={formData.antecedentes_familiares}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
              placeholder="Antecedentes familiares relevantes..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="estudios_laboratorio" className={styles.label}>
              3. Estudios de laboratorio
            </label>
            <textarea
              id="estudios_laboratorio"
              name="estudios_laboratorio"
              value={formData.estudios_laboratorio}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
              placeholder="Resultados o descripción de estudios de laboratorio..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notas" className={styles.label}>
              4. Hábitos alimenticios
            </label>
            <textarea
              id="notas"
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
              placeholder="Descripción de los hábitos alimenticios del paciente..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="observaciones" className={styles.label}>
              5. Hábitos de Ejercicio
            </label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              className={styles.textarea}
              rows={3}
              placeholder="Descripción de los hábitos de ejercicio del paciente..."
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="objetivo" className={styles.label}>
              6. Objetivos de tratamiento
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
              7. Plan nutricional
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
            <label className={styles.label}>
              Próxima Cita Sugerida
            </label>
            <input
              type="date"
              className={`${styles.input} ${styles.inputDisabled}`}
              disabled
            />
            <p className={styles.helpText}>
              No disponible en consultas históricas — usa el panel del paciente para programar seguimiento
            </p>
          </div>
        </section>

        {/* Botones */}
        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || Object.keys(fieldErrors).length > 0}>
            {loading ? 'Guardando...' : 'Guardar en Historial'}
          </Button>
        </div>
      </form>
    </div>
  )
}
