'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import styles from './PacienteForm.module.css'

interface PacienteFormProps {
  pacienteId?: string
  initialData?: {
    nombre: string
    email: string
    telefono: string
    fecha_nacimiento: string
  }
}

export default function PacienteForm({
  pacienteId,
  initialData,
}: PacienteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    email: initialData?.email || '',
    telefono: initialData?.telefono || '',
    fecha_nacimiento: initialData?.fecha_nacimiento
      ? new Date(initialData.fecha_nacimiento).toISOString().split('T')[0]
      : '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!pacienteId

  // Validación del formulario
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre || formData.nombre.length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    if (
      !formData.telefono ||
      formData.telefono.length < 10 ||
      !/^[0-9+\-\s()]+$/.test(formData.telefono)
    ) {
      newErrors.telefono =
        'Teléfono inválido (mínimo 10 dígitos, solo números, +, -, espacios y paréntesis)'
    }

    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es requerida'
    } else {
      const fecha = new Date(formData.fecha_nacimiento)
      if (fecha >= new Date()) {
        newErrors.fecha_nacimiento =
          'La fecha de nacimiento debe ser anterior a hoy'
      }
      if (fecha < new Date('1900-01-01')) {
        newErrors.fecha_nacimiento = 'Fecha de nacimiento inválida'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Limpiar error del campo al editarlo
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = isEditing
        ? `/api/pacientes/${pacienteId}`
        : '/api/pacientes'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar paciente')
      }

      // Redirigir a la lista o al detalle
      router.push('/pacientes')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  // Cancelar
  const handleCancel = () => {
    if (isEditing) {
      router.push(`/pacientes/${pacienteId}`)
    } else {
      router.push('/pacientes')
    }
  }

  return (
    <Card className={styles.formCard}>
      <h2 className={styles.formTitle}>
        {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
      </h2>

      {error && (
        <Alert variant="error" className={styles.alert}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Nombre */}
        <div className={styles.formGroup}>
          <label htmlFor="nombre" className={styles.label}>
            Nombre Completo <span className={styles.required}>*</span>
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={`${styles.input} ${errors.nombre ? styles.inputError : ''}`}
            placeholder="Ej: Juan Pérez García"
            disabled={loading}
          />
          {errors.nombre && (
            <span className={styles.errorMessage}>{errors.nombre}</span>
          )}
        </div>

        {/* Email */}
        <div className={styles.formGroup}>
          <label htmlFor="email" className={styles.label}>
            Email <span className={styles.required}>*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
            placeholder="ejemplo@correo.com"
            disabled={loading}
          />
          {errors.email && (
            <span className={styles.errorMessage}>{errors.email}</span>
          )}
        </div>

        {/* Teléfono */}
        <div className={styles.formGroup}>
          <label htmlFor="telefono" className={styles.label}>
            Teléfono <span className={styles.required}>*</span>
          </label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className={`${styles.input} ${errors.telefono ? styles.inputError : ''}`}
            placeholder="5512345678 o +52 55 1234 5678"
            disabled={loading}
          />
          {errors.telefono && (
            <span className={styles.errorMessage}>{errors.telefono}</span>
          )}
        </div>

        {/* Fecha de Nacimiento */}
        <div className={styles.formGroup}>
          <label htmlFor="fecha_nacimiento" className={styles.label}>
            Fecha de Nacimiento <span className={styles.required}>*</span>
          </label>
          <input
            type="date"
            id="fecha_nacimiento"
            name="fecha_nacimiento"
            value={formData.fecha_nacimiento}
            onChange={handleChange}
            className={`${styles.input} ${errors.fecha_nacimiento ? styles.inputError : ''}`}
            max={new Date().toISOString().split('T')[0]}
            disabled={loading}
          />
          {errors.fecha_nacimiento && (
            <span className={styles.errorMessage}>
              {errors.fecha_nacimiento}
            </span>
          )}
        </div>

        {/* Botones */}
        <div className={styles.formActions}>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? isEditing
                ? 'Guardando...'
                : 'Creando...'
              : isEditing
                ? 'Guardar Cambios'
                : 'Crear Paciente'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
