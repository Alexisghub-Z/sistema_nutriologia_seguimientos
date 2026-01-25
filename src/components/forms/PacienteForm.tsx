'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import {
  extraerDigitosTelefono,
  validarTelefonoMexico,
  normalizarTelefonoMexico,
} from '@/lib/utils/phone'
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

export default function PacienteForm({ pacienteId, initialData }: PacienteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || '',
    email: initialData?.email || '',
    // Extraer solo los 10 dígitos del teléfono (quitar +521)
    telefono: initialData?.telefono ? extraerDigitosTelefono(initialData.telefono) : '',
    fecha_nacimiento: initialData?.fecha_nacimiento
      ? new Date(initialData.fecha_nacimiento).toISOString().split('T')[0]
      : '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = !!pacienteId

  // Validación del formulario
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Validar nombre
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido'
    } else if (formData.nombre.trim().length < 3) {
      newErrors.nombre = 'El nombre debe tener al menos 3 caracteres'
    } else if (formData.nombre.trim().length > 100) {
      newErrors.nombre = 'El nombre no puede exceder 100 caracteres'
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(formData.nombre)) {
      newErrors.nombre = 'El nombre solo puede contener letras y espacios'
    }

    // Validar email
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del email es inválido'
    } else if (formData.email.length > 100) {
      newErrors.email = 'El email no puede exceder 100 caracteres'
    }

    // Validar teléfono (debe ser exactamente 10 dígitos)
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido'
    } else if (!validarTelefonoMexico(formData.telefono)) {
      const digitos = formData.telefono.replace(/\D/g, '')
      if (digitos.length < 10) {
        newErrors.telefono = `El teléfono debe tener 10 dígitos (tienes ${digitos.length})`
      } else if (digitos.length > 10) {
        newErrors.telefono = `El teléfono debe tener 10 dígitos (tienes ${digitos.length})`
      } else {
        newErrors.telefono = 'El teléfono solo puede contener números'
      }
    }

    // Validar fecha de nacimiento
    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es requerida'
    } else {
      const fecha = new Date(formData.fecha_nacimiento)
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0) // Normalizar a medianoche

      if (isNaN(fecha.getTime())) {
        newErrors.fecha_nacimiento = 'Fecha inválida'
      } else if (fecha >= hoy) {
        newErrors.fecha_nacimiento = 'La fecha de nacimiento debe ser anterior a hoy'
      } else if (fecha < new Date('1900-01-01')) {
        newErrors.fecha_nacimiento = 'La fecha debe ser posterior a 1900'
      } else {
        // Validar que la persona tenga al menos 1 año
        const edad = hoy.getFullYear() - fecha.getFullYear()
        if (edad < 1) {
          newErrors.fecha_nacimiento = 'El paciente debe tener al menos 1 año'
        } else if (edad > 120) {
          newErrors.fecha_nacimiento = 'Edad inválida (mayor a 120 años)'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let processedValue = value

    // Procesar teléfono: solo permitir números
    if (name === 'telefono') {
      // Eliminar todo lo que no sea dígito
      processedValue = value.replace(/\D/g, '')
      // Limitar a 10 dígitos
      if (processedValue.length > 10) {
        processedValue = processedValue.substring(0, 10)
      }
    }

    // Procesar nombre: eliminar números y caracteres especiales
    if (name === 'nombre') {
      // Solo permitir letras, espacios y acentos
      processedValue = value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
    }

    setFormData((prev) => ({ ...prev, [name]: processedValue }))

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
      const url = isEditing ? `/api/pacientes/${pacienteId}` : '/api/pacientes'
      const method = isEditing ? 'PUT' : 'POST'

      // Normalizar teléfono antes de enviar (convertir 10 dígitos a +521XXXXXXXXXX)
      const dataToSend = {
        ...formData,
        nombre: formData.nombre.trim(),
        email: formData.email.trim().toLowerCase(),
        telefono: normalizarTelefonoMexico(formData.telefono),
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
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
      <h2 className={styles.formTitle}>{isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}</h2>

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
            placeholder="Juan Pérez García"
            maxLength={100}
            disabled={loading}
            autoComplete="name"
          />
          {!errors.nombre && formData.nombre && (
            <span className={styles.helpText}>{formData.nombre.length}/100 caracteres</span>
          )}
          {errors.nombre && <span className={styles.errorMessage}>{errors.nombre}</span>}
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
            maxLength={100}
            disabled={loading}
            autoComplete="email"
          />
          {!errors.email && formData.email && (
            <span className={styles.helpText}>{formData.email.length}/100 caracteres</span>
          )}
          {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
        </div>

        {/* Teléfono */}
        <div className={styles.formGroup}>
          <label htmlFor="telefono" className={styles.label}>
            Teléfono (10 dígitos) <span className={styles.required}>*</span>
          </label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className={`${styles.input} ${errors.telefono ? styles.inputError : ''}`}
            placeholder="9515886761"
            maxLength={10}
            pattern="[0-9]{10}"
            disabled={loading}
          />
          {!errors.telefono && formData.telefono && (
            <span className={styles.helpText}>
              {formData.telefono.length}/10 dígitos
            </span>
          )}
          {errors.telefono && <span className={styles.errorMessage}>{errors.telefono}</span>}
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
            <span className={styles.errorMessage}>{errors.fecha_nacimiento}</span>
          )}
        </div>

        {/* Botones */}
        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
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
