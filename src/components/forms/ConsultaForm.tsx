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
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([])

  const [formData, setFormData] = useState({
    motivo: '',
    peso: '',
    talla: '',
    cintura: '',
    cadera: '',
    brazo: '',
    muslo: '',
    grasa_corporal: '',
    presion_sistolica: '',
    presion_diastolica: '',
    notas: '',
    diagnostico: '',
    objetivo: '',
    plan: '',
    observaciones: '',
    proxima_cita: '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setArchivosSeleccionados((prev) => [...prev, ...newFiles])
    }
  }

  const handleRemoveFile = (index: number) => {
    setArchivosSeleccionados((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
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
      if (formData.cintura) data.cintura = parseFloat(formData.cintura)
      if (formData.cadera) data.cadera = parseFloat(formData.cadera)
      if (formData.brazo) data.brazo = parseFloat(formData.brazo)
      if (formData.muslo) data.muslo = parseFloat(formData.muslo)
      if (formData.grasa_corporal)
        data.grasa_corporal = parseFloat(formData.grasa_corporal)
      if (formData.presion_sistolica)
        data.presion_sistolica = parseInt(formData.presion_sistolica)
      if (formData.presion_diastolica)
        data.presion_diastolica = parseInt(formData.presion_diastolica)

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
        throw new Error(errorData.error || 'Error al crear consulta')
      }

      const consulta = await response.json()

      // Subir archivos si hay
      if (archivosSeleccionados.length > 0) {
        for (const archivo of archivosSeleccionados) {
          const formData = new FormData()
          formData.append('file', archivo)
          formData.append('categoria', 'DOCUMENTO')
          formData.append('descripcion', archivo.name)

          await fetch(`/api/consultas/${consulta.id}/archivos`, {
            method: 'POST',
            body: formData,
          })
        }
      }

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
        <h3 className={styles.sectionTitle}>Mediciones Corporales</h3>
        <div className={styles.gridTwo}>
          <div className={styles.formGroup}>
            <label htmlFor="peso" className={styles.label}>
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              id="peso"
              name="peso"
              value={formData.peso}
              onChange={handleChange}
              className={styles.input}
              placeholder="85.5"
              disabled={loading}
            />
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
              className={styles.input}
              placeholder="1.70"
              disabled={loading}
            />
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

        <div className={styles.gridFour}>
          <div className={styles.formGroup}>
            <label htmlFor="cintura" className={styles.label}>
              Cintura (cm)
            </label>
            <input
              type="number"
              step="0.1"
              id="cintura"
              name="cintura"
              value={formData.cintura}
              onChange={handleChange}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="cadera" className={styles.label}>
              Cadera (cm)
            </label>
            <input
              type="number"
              step="0.1"
              id="cadera"
              name="cadera"
              value={formData.cadera}
              onChange={handleChange}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="brazo" className={styles.label}>
              Brazo (cm)
            </label>
            <input
              type="number"
              step="0.1"
              id="brazo"
              name="brazo"
              value={formData.brazo}
              onChange={handleChange}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="muslo" className={styles.label}>
              Muslo (cm)
            </label>
            <input
              type="number"
              step="0.1"
              id="muslo"
              name="muslo"
              value={formData.muslo}
              onChange={handleChange}
              className={styles.input}
              disabled={loading}
            />
          </div>
        </div>

        <div className={styles.gridTwo}>
          <div className={styles.formGroup}>
            <label htmlFor="grasa_corporal" className={styles.label}>
              Grasa Corporal (%)
            </label>
            <input
              type="number"
              step="0.1"
              id="grasa_corporal"
              name="grasa_corporal"
              value={formData.grasa_corporal}
              onChange={handleChange}
              className={styles.input}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Presión Arterial */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Presión Arterial</h3>
        <div className={styles.gridTwo}>
          <div className={styles.formGroup}>
            <label htmlFor="presion_sistolica" className={styles.label}>
              Sistólica (mmHg)
            </label>
            <input
              type="number"
              id="presion_sistolica"
              name="presion_sistolica"
              value={formData.presion_sistolica}
              onChange={handleChange}
              className={styles.input}
              placeholder="120"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="presion_diastolica" className={styles.label}>
              Diastólica (mmHg)
            </label>
            <input
              type="number"
              id="presion_diastolica"
              name="presion_diastolica"
              value={formData.presion_diastolica}
              onChange={handleChange}
              className={styles.input}
              placeholder="80"
              disabled={loading}
            />
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

      {/* Archivos Adjuntos */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Archivos Adjuntos</h3>
        <div className={styles.infoBox}>
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
          <p>
            Puedes adjuntar análisis de laboratorio, fotos de progreso,
            estudios médicos, etc. Los archivos se subirán al guardar la
            consulta.
          </p>
        </div>

        <div className={styles.fileInputContainer}>
          <label htmlFor="archivos" className={styles.fileInputLabel}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Seleccionar Archivos
          </label>
          <input
            type="file"
            id="archivos"
            multiple
            onChange={handleFileSelect}
            className={styles.fileInput}
            disabled={loading}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          />
        </div>

        {archivosSeleccionados.length > 0 && (
          <div className={styles.fileList}>
            <h4 className={styles.fileListTitle}>
              Archivos seleccionados ({archivosSeleccionados.length})
            </h4>
            {archivosSeleccionados.map((file, index) => (
              <div key={index} className={styles.fileItem}>
                <div className={styles.fileInfo}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={styles.fileIcon}
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className={styles.fileRemoveButton}
                  disabled={loading}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botones */}
      <div className={styles.formActions}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
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
