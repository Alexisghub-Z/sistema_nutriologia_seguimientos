'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import styles from './ConsultaForm.module.css'

interface ConsultaFormProps {
  pacienteId: string
  citaId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ConsultaForm({
  pacienteId,
  citaId,
  onSuccess,
  onCancel,
}: ConsultaFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
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
    monto_consulta: '',
    metodo_pago: 'EFECTIVO',
    estado_pago: 'PAGADO',
    notas_pago: '',
  })

  // Validación en tiempo real
  const validateField = (name: string, value: string) => {
    // Si el campo está vacío, no validar (campos opcionales)
    if (!value || value.trim() === '') {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
      return
    }

    const numValue = parseFloat(value)
    let errorMessage = ''

    // Validar según el campo
    switch (name) {
      // Mediciones básicas
      case 'peso':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 2.5) errorMessage = 'Mínimo 2.5 kg'
        else if (numValue > 600) errorMessage = 'Máximo 600 kg'
        break
      case 'talla':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 0.25) errorMessage = 'Mínimo 0.25 m'
        else if (numValue > 5) errorMessage = 'Máximo 5 m'
        break

      // Composición corporal
      case 'grasa_corporal':
      case 'porcentaje_agua':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 0) errorMessage = 'Mínimo 0%'
        else if (numValue > 100) errorMessage = 'Máximo 100%'
        break
      case 'masa_muscular_kg':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 0.5) errorMessage = 'Mínimo 0.5 kg'
        else if (numValue > 400) errorMessage = 'Máximo 400 kg'
        break
      case 'grasa_visceral':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 0) errorMessage = 'Mínimo 0'
        else if (numValue > 60) errorMessage = 'Máximo 60'
        else if (!Number.isInteger(numValue)) errorMessage = 'Debe ser un número entero'
        break

      // Perímetros
      case 'brazo_relajado':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 5) errorMessage = 'Mínimo 5 cm'
        else if (numValue > 160) errorMessage = 'Máximo 160 cm'
        break
      case 'brazo_flexionado':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 5) errorMessage = 'Mínimo 5 cm'
        else if (numValue > 180) errorMessage = 'Máximo 180 cm'
        break
      case 'cintura':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 15) errorMessage = 'Mínimo 15 cm'
        else if (numValue > 400) errorMessage = 'Máximo 400 cm'
        break
      case 'cadera_maximo':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 30) errorMessage = 'Mínimo 30 cm'
        else if (numValue > 400) errorMessage = 'Máximo 400 cm'
        break
      case 'muslo_maximo':
      case 'muslo_medio':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 10) errorMessage = 'Mínimo 10 cm'
        else if (numValue > 240) errorMessage = 'Máximo 240 cm'
        break
      case 'pantorrilla_maximo':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 10) errorMessage = 'Mínimo 10 cm'
        else if (numValue > 160) errorMessage = 'Máximo 160 cm'
        break

      // Pliegues cutáneos
      case 'pliegue_tricipital':
      case 'pliegue_subescapular':
      case 'pliegue_bicipital':
      case 'pliegue_cresta_iliaca':
      case 'pliegue_supraespinal':
      case 'pliegue_abdominal':
        if (isNaN(numValue)) errorMessage = 'Debe ser un número'
        else if (numValue < 0.5) errorMessage = 'Mínimo 0.5 mm'
        else if (numValue > 120) errorMessage = 'Máximo 120 mm'
        break
    }

    // Actualizar errores
    if (errorMessage) {
      setFieldErrors((prev) => ({ ...prev, [name]: errorMessage }))
    } else {
      setFieldErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Validar en tiempo real solo para campos numéricos
    const numericFields = [
      'peso', 'talla', 'grasa_corporal', 'porcentaje_agua', 'masa_muscular_kg', 'grasa_visceral',
      'brazo_relajado', 'brazo_flexionado', 'cintura', 'cadera_maximo',
      'muslo_maximo', 'muslo_medio', 'pantorrilla_maximo',
      'pliegue_tricipital', 'pliegue_subescapular', 'pliegue_bicipital',
      'pliegue_cresta_iliaca', 'pliegue_supraespinal', 'pliegue_abdominal'
    ]

    if (numericFields.includes(name)) {
      validateField(name, value)
    }
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      // Verificar si hay errores de validación
      if (Object.keys(fieldErrors).length > 0) {
        setError('Por favor corrige los errores en los campos marcados antes de guardar')
        setLoading(false)
        return
      }

      // Verificar si el formulario está completamente vacío
      const hasAnyData =
        formData.motivo ||
        formData.peso ||
        formData.talla ||
        formData.grasa_corporal ||
        formData.porcentaje_agua ||
        formData.masa_muscular_kg ||
        formData.grasa_visceral ||
        formData.brazo_relajado ||
        formData.brazo_flexionado ||
        formData.cintura ||
        formData.cadera_maximo ||
        formData.muslo_maximo ||
        formData.muslo_medio ||
        formData.pantorrilla_maximo ||
        formData.pliegue_tricipital ||
        formData.pliegue_subescapular ||
        formData.pliegue_bicipital ||
        formData.pliegue_cresta_iliaca ||
        formData.pliegue_supraespinal ||
        formData.pliegue_abdominal ||
        formData.notas ||
        formData.diagnostico ||
        formData.objetivo ||
        formData.plan ||
        formData.observaciones

      if (!hasAnyData) {
        const confirmar = window.confirm(
          '⚠️ ADVERTENCIA: Estás enviando una consulta SIN DATOS.\n\n' +
          'No has llenado ningún campo (peso, talla, mediciones, notas, etc.).\n\n' +
          '¿Estás seguro de que quieres crear una consulta vacía?'
        )

        if (!confirmar) {
          setLoading(false)
          return
        }
      }

      // Preparar datos
      const data: any = {
        cita_id: citaId,
        paciente_id: pacienteId,
        fecha: new Date().toISOString(),
        motivo: formData.motivo || undefined,
        notas: formData.notas || undefined,
        diagnostico: formData.diagnostico || undefined,
        objetivo: formData.objetivo || undefined,
        plan: formData.plan || undefined,
        observaciones: formData.observaciones || undefined,
        proxima_cita: formData.proxima_cita || undefined,
      }

      // Agregar mediciones numéricas si tienen valor
      if (formData.peso) data.peso = parseFloat(formData.peso)
      if (formData.talla) data.talla = parseFloat(formData.talla)
      if (formData.grasa_corporal) data.grasa_corporal = parseFloat(formData.grasa_corporal)
      if (formData.porcentaje_agua) data.porcentaje_agua = parseFloat(formData.porcentaje_agua)
      if (formData.masa_muscular_kg) data.masa_muscular_kg = parseFloat(formData.masa_muscular_kg)
      if (formData.grasa_visceral) data.grasa_visceral = parseInt(formData.grasa_visceral)
      if (formData.brazo_relajado) data.brazo_relajado = parseFloat(formData.brazo_relajado)
      if (formData.brazo_flexionado) data.brazo_flexionado = parseFloat(formData.brazo_flexionado)
      if (formData.cintura) data.cintura = parseFloat(formData.cintura)
      if (formData.cadera_maximo) data.cadera_maximo = parseFloat(formData.cadera_maximo)
      if (formData.muslo_maximo) data.muslo_maximo = parseFloat(formData.muslo_maximo)
      if (formData.muslo_medio) data.muslo_medio = parseFloat(formData.muslo_medio)
      if (formData.pantorrilla_maximo)
        data.pantorrilla_maximo = parseFloat(formData.pantorrilla_maximo)
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

      // Agregar información financiera
      if (formData.monto_consulta) data.monto_consulta = parseFloat(formData.monto_consulta)
      if (formData.metodo_pago) data.metodo_pago = formData.metodo_pago
      if (formData.estado_pago) data.estado_pago = formData.estado_pago
      if (formData.notas_pago) data.notas_pago = formData.notas_pago

      // Crear consulta
      const response = await fetch('/api/consultas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()

        // Si hay detalles de validación de Zod, extraer errores por campo
        if (errorData.details && Array.isArray(errorData.details)) {
          const errors: Record<string, string> = {}
          errorData.details.forEach((err: any) => {
            const field = err.path.join('.')
            errors[field] = err.message
          })
          setFieldErrors(errors)
          setError('Por favor corrige los errores en los campos marcados')
          setLoading(false)
          return
        }

        throw new Error(errorData.error || 'Error al crear consulta')
      }

      await response.json() // Consumir respuesta

      // Éxito
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/pacientes/${pacienteId}`)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  const calcularIMC = () => {
    if (formData.peso && formData.talla) {
      const peso = parseFloat(formData.peso)
      const talla = parseFloat(formData.talla)
      if (!isNaN(peso) && !isNaN(talla) && talla > 0) {
        const imc = peso / (talla * talla)
        return imc.toFixed(1)
      }
    }
    return null
  }

  const imc = calcularIMC()

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && (
        <Alert variant="error" className={styles.alert}>
          {error}
        </Alert>
      )}

      {/* Motivo */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Información General</h3>
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
            placeholder="Ej: Control de peso, Primera consulta..."
            disabled={loading}
          />
        </div>
      </div>

      {/* Mediciones Corporales */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Mediciones Básicas</h3>
        <div className={styles.gridTwo}>
          <div className={styles.formGroup}>
            <label htmlFor="peso" className={styles.label}>
              Peso actual (kg)
            </label>
            <input
              type="number"
              step="0.1"
              id="peso"
              name="peso"
              value={formData.peso}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.peso ? styles.inputError : ''}`}
              placeholder="2.5-600 kg"
              min="2.5"
              max="600"
              disabled={loading}
            />
            {fieldErrors.peso && (
              <span className={styles.errorText}>{fieldErrors.peso}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="talla" className={styles.label}>
              Talla (m)
            </label>
            <input
              type="number"
              step="0.01"
              id="talla"
              name="talla"
              value={formData.talla}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.talla ? styles.inputError : ''}`}
              placeholder="0.25-5 m"
              min="0.25"
              max="5"
              disabled={loading}
            />
            {fieldErrors.talla && (
              <span className={styles.errorText}>{fieldErrors.talla}</span>
            )}
          </div>
        </div>

        {imc && (
          <div className={styles.imcDisplay}>
            <strong>IMC:</strong> {imc}
            {parseFloat(imc) < 18.5 && ' (Bajo peso)'}
            {parseFloat(imc) >= 18.5 && parseFloat(imc) < 25 && ' (Normal)'}
            {parseFloat(imc) >= 25 && parseFloat(imc) < 30 && ' (Sobrepeso)'}
            {parseFloat(imc) >= 30 && ' (Obesidad)'}
          </div>
        )}
      </div>

      {/* Composición Corporal */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Composición Corporal</h3>
        <div className={styles.gridFour}>
          <div className={styles.formGroup}>
            <label htmlFor="grasa_corporal" className={styles.label}>
              % Grasa
            </label>
            <input
              type="number"
              step="0.1"
              id="grasa_corporal"
              name="grasa_corporal"
              value={formData.grasa_corporal}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.grasa_corporal ? styles.inputError : ''}`}
              placeholder="0-100%"
              min="0"
              max="100"
              disabled={loading}
            />
            {fieldErrors.grasa_corporal && (
              <span className={styles.errorText}>{fieldErrors.grasa_corporal}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="porcentaje_agua" className={styles.label}>
              % Agua
            </label>
            <input
              type="number"
              step="0.1"
              id="porcentaje_agua"
              name="porcentaje_agua"
              value={formData.porcentaje_agua}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.porcentaje_agua ? styles.inputError : ''}`}
              placeholder="0-100%"
              min="0"
              max="100"
              disabled={loading}
            />
            {fieldErrors.porcentaje_agua && (
              <span className={styles.errorText}>{fieldErrors.porcentaje_agua}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="masa_muscular_kg" className={styles.label}>
              M. Muscular (kg)
            </label>
            <input
              type="number"
              step="0.1"
              id="masa_muscular_kg"
              name="masa_muscular_kg"
              value={formData.masa_muscular_kg}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.masa_muscular_kg ? styles.inputError : ''}`}
              placeholder="0.5-400 kg"
              min="0.5"
              max="400"
              disabled={loading}
            />
            {fieldErrors.masa_muscular_kg && (
              <span className={styles.errorText}>{fieldErrors.masa_muscular_kg}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="grasa_visceral" className={styles.label}>
              G. Visceral (número)
            </label>
            <input
              type="number"
              id="grasa_visceral"
              name="grasa_visceral"
              value={formData.grasa_visceral}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.grasa_visceral ? styles.inputError : ''}`}
              placeholder="0-60"
              min="0"
              max="60"
              disabled={loading}
            />
            {fieldErrors.grasa_visceral && (
              <span className={styles.errorText}>{fieldErrors.grasa_visceral}</span>
            )}
          </div>
        </div>
      </div>

      {/* Perímetros */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Perímetros (cm)</h3>
        <div className={styles.gridFour}>
          <div className={styles.formGroup}>
            <label htmlFor="brazo_relajado" className={styles.label}>
              Brazo relajado
            </label>
            <input
              type="number"
              step="0.1"
              id="brazo_relajado"
              name="brazo_relajado"
              value={formData.brazo_relajado}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.brazo_relajado ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="5-160 cm"
              min="5"
              max="160"
            />
            {fieldErrors.brazo_relajado && (
              <span className={styles.errorText}>{fieldErrors.brazo_relajado}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="brazo_flexionado" className={styles.label}>
              Brazo flexionado
            </label>
            <input
              type="number"
              step="0.1"
              id="brazo_flexionado"
              name="brazo_flexionado"
              value={formData.brazo_flexionado}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.brazo_flexionado ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="5-180 cm"
              min="5"
              max="180"
            />
            {fieldErrors.brazo_flexionado && (
              <span className={styles.errorText}>{fieldErrors.brazo_flexionado}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cintura" className={styles.label}>
              Cintura
            </label>
            <input
              type="number"
              step="0.1"
              id="cintura"
              name="cintura"
              value={formData.cintura}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.cintura ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="15-400 cm"
              min="15"
              max="400"
            />
            {fieldErrors.cintura && (
              <span className={styles.errorText}>{fieldErrors.cintura}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cadera_maximo" className={styles.label}>
              Cadera máximo
            </label>
            <input
              type="number"
              step="0.1"
              id="cadera_maximo"
              name="cadera_maximo"
              value={formData.cadera_maximo}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.cadera_maximo ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="30-400 cm"
              min="30"
              max="400"
            />
            {fieldErrors.cadera_maximo && (
              <span className={styles.errorText}>{fieldErrors.cadera_maximo}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="muslo_maximo" className={styles.label}>
              Muslo máximo
            </label>
            <input
              type="number"
              step="0.1"
              id="muslo_maximo"
              name="muslo_maximo"
              value={formData.muslo_maximo}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.muslo_maximo ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="10-240 cm"
              min="10"
              max="240"
            />
            {fieldErrors.muslo_maximo && (
              <span className={styles.errorText}>{fieldErrors.muslo_maximo}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="muslo_medio" className={styles.label}>
              Muslo medio
            </label>
            <input
              type="number"
              step="0.1"
              id="muslo_medio"
              name="muslo_medio"
              value={formData.muslo_medio}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.muslo_medio ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="10-240 cm"
              min="10"
              max="240"
            />
            {fieldErrors.muslo_medio && (
              <span className={styles.errorText}>{fieldErrors.muslo_medio}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="pantorrilla_maximo" className={styles.label}>
              Pantorrilla máximo
            </label>
            <input
              type="number"
              step="0.1"
              id="pantorrilla_maximo"
              name="pantorrilla_maximo"
              value={formData.pantorrilla_maximo}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.pantorrilla_maximo ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="10-160 cm"
              min="10"
              max="160"
            />
            {fieldErrors.pantorrilla_maximo && (
              <span className={styles.errorText}>{fieldErrors.pantorrilla_maximo}</span>
            )}
          </div>
        </div>
      </div>

      {/* Pliegues Cutáneos */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Pliegues Cutáneos (mm)</h3>
        <div className={styles.gridFour}>
          <div className={styles.formGroup}>
            <label htmlFor="pliegue_tricipital" className={styles.label}>
              P. Tricipital
            </label>
            <input
              type="number"
              step="0.1"
              id="pliegue_tricipital"
              name="pliegue_tricipital"
              value={formData.pliegue_tricipital}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.pliegue_tricipital ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="0.5-120 mm"
              min="0.5"
              max="120"
            />
            {fieldErrors.pliegue_tricipital && (
              <span className={styles.errorText}>{fieldErrors.pliegue_tricipital}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="pliegue_subescapular" className={styles.label}>
              P. Subescapular
            </label>
            <input
              type="number"
              step="0.1"
              id="pliegue_subescapular"
              name="pliegue_subescapular"
              value={formData.pliegue_subescapular}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.pliegue_subescapular ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="0.5-120 mm"
              min="0.5"
              max="120"
            />
            {fieldErrors.pliegue_subescapular && (
              <span className={styles.errorText}>{fieldErrors.pliegue_subescapular}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="pliegue_bicipital" className={styles.label}>
              P. Bicipital
            </label>
            <input
              type="number"
              step="0.1"
              id="pliegue_bicipital"
              name="pliegue_bicipital"
              value={formData.pliegue_bicipital}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.pliegue_bicipital ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="0.5-120 mm"
              min="0.5"
              max="120"
            />
            {fieldErrors.pliegue_bicipital && (
              <span className={styles.errorText}>{fieldErrors.pliegue_bicipital}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="pliegue_cresta_iliaca" className={styles.label}>
              P. Cresta ilíaca
            </label>
            <input
              type="number"
              step="0.1"
              id="pliegue_cresta_iliaca"
              name="pliegue_cresta_iliaca"
              value={formData.pliegue_cresta_iliaca}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.pliegue_cresta_iliaca ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="0.5-120 mm"
              min="0.5"
              max="120"
            />
            {fieldErrors.pliegue_cresta_iliaca && (
              <span className={styles.errorText}>{fieldErrors.pliegue_cresta_iliaca}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="pliegue_supraespinal" className={styles.label}>
              P. Supraespinal
            </label>
            <input
              type="number"
              step="0.1"
              id="pliegue_supraespinal"
              name="pliegue_supraespinal"
              value={formData.pliegue_supraespinal}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.pliegue_supraespinal ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="0.5-120 mm"
              min="0.5"
              max="120"
            />
            {fieldErrors.pliegue_supraespinal && (
              <span className={styles.errorText}>{fieldErrors.pliegue_supraespinal}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="pliegue_abdominal" className={styles.label}>
              P. Abdominal
            </label>
            <input
              type="number"
              step="0.1"
              id="pliegue_abdominal"
              name="pliegue_abdominal"
              value={formData.pliegue_abdominal}
              onChange={handleChange}
              className={`${styles.input} ${fieldErrors.pliegue_abdominal ? styles.inputError : ''}`}
              disabled={loading}
              placeholder="0.5-120 mm"
              min="0.5"
              max="120"
            />
            {fieldErrors.pliegue_abdominal && (
              <span className={styles.errorText}>{fieldErrors.pliegue_abdominal}</span>
            )}
          </div>
        </div>
      </div>

      {/* Notas Clínicas */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Notas Clínicas</h3>

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
            placeholder="Diagnóstico del estado nutricional del paciente..."
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
            rows={2}
            placeholder="Ej: Reducir 5kg en 2 meses..."
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
            rows={3}
            placeholder="Plan alimenticio asignado..."
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
            rows={2}
            placeholder="Cualquier otra observación relevante..."
            disabled={loading}
          />
        </div>
      </div>

      {/* Información Financiera */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Información de Pago</h3>
        <div className={styles.gridTwo}>
          <div className={styles.formGroup}>
            <label htmlFor="monto_consulta" className={styles.label}>
              Monto de la Consulta (MXN)
            </label>
            <input
              type="number"
              step="0.01"
              id="monto_consulta"
              name="monto_consulta"
              value={formData.monto_consulta}
              onChange={handleChange}
              className={styles.input}
              placeholder="500.00 (dejar vacío para usar precio default)"
              disabled={loading}
            />
            <small style={{ color: '#666', fontSize: '0.875rem' }}>
              Si se deja vacío, se usará el precio configurado en el sistema
            </small>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="estado_pago" className={styles.label}>
              Estado del Pago
            </label>
            <select
              id="estado_pago"
              name="estado_pago"
              value={formData.estado_pago}
              onChange={handleChange}
              className={styles.input}
              disabled={loading}
            >
              <option value="PAGADO">Pagado</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="PARCIAL">Parcial</option>
            </select>
          </div>
        </div>

        <div className={styles.gridTwo}>
          <div className={styles.formGroup}>
            <label htmlFor="metodo_pago" className={styles.label}>
              Método de Pago
            </label>
            <select
              id="metodo_pago"
              name="metodo_pago"
              value={formData.metodo_pago}
              onChange={handleChange}
              className={styles.input}
              disabled={loading}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notas_pago" className={styles.label}>
              Notas de Pago (opcional)
            </label>
            <input
              type="text"
              id="notas_pago"
              name="notas_pago"
              value={formData.notas_pago}
              onChange={handleChange}
              className={styles.input}
              placeholder="Ej: Pagó con cambio de $500"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Seguimiento */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Seguimiento</h3>
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
            min={new Date().toISOString().split('T')[0]}
            disabled={loading}
          />
        </div>
      </div>

      {/* Botones */}
      <div className={styles.formActions}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Consulta'}
        </Button>
      </div>
    </form>
  )
}
