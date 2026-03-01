'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './EditarConsultaModal.module.css'

interface ConsultaDetalle {
  id: string
  fecha: string
  motivo: string | null
  peso: number | null
  talla: number | null
  imc: number | null
  grasa_corporal: number | null
  porcentaje_agua: number | null
  masa_muscular_kg: number | null
  grasa_visceral: number | null
  brazo_relajado: number | null
  brazo_flexionado: number | null
  cintura: number | null
  cadera_maximo: number | null
  muslo_maximo: number | null
  muslo_medio: number | null
  pantorrilla_maximo: number | null
  pliegue_tricipital: number | null
  pliegue_subescapular: number | null
  pliegue_bicipital: number | null
  pliegue_cresta_iliaca: number | null
  pliegue_supraespinal: number | null
  pliegue_abdominal: number | null
  notas: string | null
  diagnostico: string | null
  antecedentes_familiares: string | null
  estudios_laboratorio: string | null
  observaciones: string | null
  objetivo: string | null
  plan: string | null
  proxima_cita: string | null
  monto_consulta: any
  metodo_pago: string | null
  estado_pago: string | null
  notas_pago: string | null
}

interface EditarConsultaModalProps {
  consulta: ConsultaDetalle | null
  esConsultaReciente: boolean
  onClose: () => void
  onActualizar: () => void
}

// Extrae solo la parte YYYY-MM-DD de un string ISO sin convertir a hora local
function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function toNumberInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

function toMontoInput(value: any): string {
  if (!value) return ''
  const num = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(num) ? '' : String(num)
}

// Misma lógica de validación que ConsultaForm
function validateField(name: string, value: string): string {
  if (!value || value.trim() === '') return ''

  const numValue = parseFloat(value)

  switch (name) {
    case 'peso':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 2.5) return 'Mínimo 2.5 kg'
      if (numValue > 600) return 'Máximo 600 kg'
      break
    case 'talla':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 0.25) return 'Mínimo 0.25 m'
      if (numValue > 5) return 'Máximo 5 m'
      break
    case 'grasa_corporal':
    case 'porcentaje_agua':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 0) return 'Mínimo 0%'
      if (numValue > 100) return 'Máximo 100%'
      break
    case 'masa_muscular_kg':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 0.5) return 'Mínimo 0.5 kg'
      if (numValue > 400) return 'Máximo 400 kg'
      break
    case 'grasa_visceral':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 0) return 'Mínimo 0'
      if (numValue > 60) return 'Máximo 60'
      if (!Number.isInteger(numValue)) return 'Debe ser un número entero'
      break
    case 'brazo_relajado':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 5) return 'Mínimo 5 cm'
      if (numValue > 160) return 'Máximo 160 cm'
      break
    case 'brazo_flexionado':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 5) return 'Mínimo 5 cm'
      if (numValue > 180) return 'Máximo 180 cm'
      break
    case 'cintura':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 15) return 'Mínimo 15 cm'
      if (numValue > 400) return 'Máximo 400 cm'
      break
    case 'cadera_maximo':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 30) return 'Mínimo 30 cm'
      if (numValue > 400) return 'Máximo 400 cm'
      break
    case 'muslo_maximo':
    case 'muslo_medio':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 10) return 'Mínimo 10 cm'
      if (numValue > 240) return 'Máximo 240 cm'
      break
    case 'pantorrilla_maximo':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 10) return 'Mínimo 10 cm'
      if (numValue > 160) return 'Máximo 160 cm'
      break
    case 'pliegue_tricipital':
    case 'pliegue_subescapular':
    case 'pliegue_bicipital':
    case 'pliegue_cresta_iliaca':
    case 'pliegue_supraespinal':
    case 'pliegue_abdominal':
      if (isNaN(numValue)) return 'Debe ser un número'
      if (numValue < 0.5) return 'Mínimo 0.5 mm'
      if (numValue > 120) return 'Máximo 120 mm'
      break
  }

  return ''
}


export default function EditarConsultaModal({
  consulta,
  esConsultaReciente,
  onClose,
  onActualizar,
}: EditarConsultaModalProps) {
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD en hora local
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form state
  const [peso, setPeso] = useState('')
  const [talla, setTalla] = useState('')
  const [grasaCorporal, setGrasaCorporal] = useState('')
  const [porcentajeAgua, setPorcentajeAgua] = useState('')
  const [masaMuscularKg, setMasaMuscularKg] = useState('')
  const [grasaVisceral, setGrasaVisceral] = useState('')
  const [brazoRelajado, setBrazoRelajado] = useState('')
  const [brazoFlexionado, setBrazoFlexionado] = useState('')
  const [cintura, setCintura] = useState('')
  const [caderaMaximo, setCaderaMaximo] = useState('')
  const [musloMaximo, setMusloMaximo] = useState('')
  const [musloMedio, setMusloMedio] = useState('')
  const [pantorrillaMaximo, setPantorrillaMaximo] = useState('')
  const [pliegue_tricipital, setPliegue_tricipital] = useState('')
  const [pliegue_subescapular, setPliegue_subescapular] = useState('')
  const [pliegue_bicipital, setPliegue_bicipital] = useState('')
  const [pliegue_cresta_iliaca, setPliegue_cresta_iliaca] = useState('')
  const [pliegue_supraespinal, setPliegue_supraespinal] = useState('')
  const [pliegue_abdominal, setPliegue_abdominal] = useState('')
  const [notas, setNotas] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [antecedentes_familiares, setAntecedentesFamiliares] = useState('')
  const [estudios_laboratorio, setEstudiosLaboratorio] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [plan, setPlan] = useState('')
  const [proximaCita, setProximaCita] = useState('')
  const [montoConsulta, setMontoConsulta] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [estadoPago, setEstadoPago] = useState('')
  const [notasPago, setNotasPago] = useState('')

  // Pre-populate fields when consulta changes
  useEffect(() => {
    if (!consulta) return

    setPeso(toNumberInput(consulta.peso))
    setTalla(toNumberInput(consulta.talla))
    setGrasaCorporal(toNumberInput(consulta.grasa_corporal))
    setPorcentajeAgua(toNumberInput(consulta.porcentaje_agua))
    setMasaMuscularKg(toNumberInput(consulta.masa_muscular_kg))
    setGrasaVisceral(toNumberInput(consulta.grasa_visceral))
    setBrazoRelajado(toNumberInput(consulta.brazo_relajado))
    setBrazoFlexionado(toNumberInput(consulta.brazo_flexionado))
    setCintura(toNumberInput(consulta.cintura))
    setCaderaMaximo(toNumberInput(consulta.cadera_maximo))
    setMusloMaximo(toNumberInput(consulta.muslo_maximo))
    setMusloMedio(toNumberInput(consulta.muslo_medio))
    setPantorrillaMaximo(toNumberInput(consulta.pantorrilla_maximo))
    setPliegue_tricipital(toNumberInput(consulta.pliegue_tricipital))
    setPliegue_subescapular(toNumberInput(consulta.pliegue_subescapular))
    setPliegue_bicipital(toNumberInput(consulta.pliegue_bicipital))
    setPliegue_cresta_iliaca(toNumberInput(consulta.pliegue_cresta_iliaca))
    setPliegue_supraespinal(toNumberInput(consulta.pliegue_supraespinal))
    setPliegue_abdominal(toNumberInput(consulta.pliegue_abdominal))
    setNotas(consulta.notas ?? '')
    setDiagnostico(consulta.diagnostico ?? '')
    setAntecedentesFamiliares(consulta.antecedentes_familiares ?? '')
    setEstudiosLaboratorio(consulta.estudios_laboratorio ?? '')
    setObservaciones(consulta.observaciones ?? '')
    setObjetivo(consulta.objetivo ?? '')
    setPlan(consulta.plan ?? '')
    setProximaCita(toDateInputValue(consulta.proxima_cita))
    setMontoConsulta(toMontoInput(consulta.monto_consulta))
    setMetodoPago(consulta.metodo_pago ?? '')
    setEstadoPago(consulta.estado_pago ?? '')
    setNotasPago(consulta.notas_pago ?? '')
    setError('')
    setFieldErrors({})
  }, [consulta])

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!consulta) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [consulta])

  if (!consulta) return null

  // Mapa de nombre de campo → setter, para el handler genérico
  const setterMap: Record<string, (v: string) => void> = {
    peso: setPeso,
    talla: setTalla,
    grasa_corporal: setGrasaCorporal,
    porcentaje_agua: setPorcentajeAgua,
    masa_muscular_kg: setMasaMuscularKg,
    grasa_visceral: setGrasaVisceral,
    brazo_relajado: setBrazoRelajado,
    brazo_flexionado: setBrazoFlexionado,
    cintura: setCintura,
    cadera_maximo: setCaderaMaximo,
    muslo_maximo: setMusloMaximo,
    muslo_medio: setMusloMedio,
    pantorrilla_maximo: setPantorrillaMaximo,
    pliegue_tricipital: setPliegue_tricipital,
    pliegue_subescapular: setPliegue_subescapular,
    pliegue_bicipital: setPliegue_bicipital,
    pliegue_cresta_iliaca: setPliegue_cresta_iliaca,
    pliegue_supraespinal: setPliegue_supraespinal,
    pliegue_abdominal: setPliegue_abdominal,
  }

  const handleNumericChange = (name: string, value: string) => {
    setterMap[name]?.(value)
    const msg = validateField(name, value)
    setFieldErrors((prev) => {
      if (!msg) {
        const next = { ...prev }
        delete next[name]
        return next
      }
      return { ...prev, [name]: msg }
    })
  }

  // IMC en tiempo real
  const imcPreview = (() => {
    const p = parseFloat(peso)
    const t = parseFloat(talla)
    if (!isNaN(p) && !isNaN(t) && t > 0) return (p / (t * t)).toFixed(1)
    return null
  })()

  const imcLabel = imcPreview
    ? parseFloat(imcPreview) < 18.5 ? 'Bajo peso'
      : parseFloat(imcPreview) < 25 ? 'Normal'
      : parseFloat(imcPreview) < 30 ? 'Sobrepeso'
      : 'Obesidad'
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (Object.keys(fieldErrors).length > 0) {
      setError('Corrige los errores en los campos marcados antes de guardar')
      return
    }

    setSaving(true)
    setError('')

    if (esConsultaReciente && proximaCita && proximaCita < today) {
      setError('La fecha sugerida debe ser una fecha futura para la consulta más reciente')
      setSaving(false)
      return
    }

    const parseOptionalNumber = (val: string) => {
      if (val === '') return null
      const num = parseFloat(val)
      return isNaN(num) ? null : num
    }

    const parseOptionalInt = (val: string) => {
      if (val === '') return null
      const num = parseInt(val, 10)
      return isNaN(num) ? null : num
    }

    const body: Record<string, unknown> = {
      peso: parseOptionalNumber(peso),
      talla: parseOptionalNumber(talla),
      grasa_corporal: parseOptionalNumber(grasaCorporal),
      porcentaje_agua: parseOptionalNumber(porcentajeAgua),
      masa_muscular_kg: parseOptionalNumber(masaMuscularKg),
      grasa_visceral: parseOptionalInt(grasaVisceral),
      brazo_relajado: parseOptionalNumber(brazoRelajado),
      brazo_flexionado: parseOptionalNumber(brazoFlexionado),
      cintura: parseOptionalNumber(cintura),
      cadera_maximo: parseOptionalNumber(caderaMaximo),
      muslo_maximo: parseOptionalNumber(musloMaximo),
      muslo_medio: parseOptionalNumber(musloMedio),
      pantorrilla_maximo: parseOptionalNumber(pantorrillaMaximo),
      pliegue_tricipital: parseOptionalNumber(pliegue_tricipital),
      pliegue_subescapular: parseOptionalNumber(pliegue_subescapular),
      pliegue_bicipital: parseOptionalNumber(pliegue_bicipital),
      pliegue_cresta_iliaca: parseOptionalNumber(pliegue_cresta_iliaca),
      pliegue_supraespinal: parseOptionalNumber(pliegue_supraespinal),
      pliegue_abdominal: parseOptionalNumber(pliegue_abdominal),
      notas: notas || null,
      diagnostico: diagnostico || null,
      antecedentes_familiares: antecedentes_familiares || null,
      estudios_laboratorio: estudios_laboratorio || null,
      observaciones: observaciones || null,
      objetivo: objetivo || null,
      plan: plan || null,
      ...(esConsultaReciente ? { proxima_cita: proximaCita || null } : {}),
      monto_consulta: parseOptionalNumber(montoConsulta),
      metodo_pago: metodoPago || null,
      estado_pago: estadoPago || null,
      notas_pago: notasPago || null,
    }

    try {
      const response = await fetch(`/api/consultas/${consulta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar los cambios')
      }

      onActualizar()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  // Helper para clase del input con error
  const inputClass = (name: string) =>
    `${styles.input}${fieldErrors[name] ? ` ${styles.inputError}` : ''}`

  const modalContent = (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Editar consulta</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Mediciones básicas */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Mediciones básicas</h3>
            <div className={styles.grid3}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="peso">Peso (kg)</label>
                <input
                  id="peso"
                  type="number"
                  step="0.1"
                  className={inputClass('peso')}
                  value={peso}
                  onChange={(e) => handleNumericChange('peso', e.target.value)}
                  placeholder="2.5–600 kg"
                />
                {fieldErrors.peso && <span className={styles.errorText}>{fieldErrors.peso}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="talla">Talla (m)</label>
                <input
                  id="talla"
                  type="number"
                  step="0.01"
                  className={inputClass('talla')}
                  value={talla}
                  onChange={(e) => handleNumericChange('talla', e.target.value)}
                  placeholder="0.25–5 m"
                />
                {fieldErrors.talla && <span className={styles.errorText}>{fieldErrors.talla}</span>}
              </div>
            </div>
            {imcPreview && (
              <div className={styles.imcDisplay}>
                <strong>IMC:</strong> {imcPreview} <span className={styles.imcLabel}>({imcLabel})</span>
              </div>
            )}
          </div>

          {/* Composición corporal */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Composición corporal</h3>
            <div className={styles.grid3}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="grasa_corporal">% Grasa corporal</label>
                <input
                  id="grasa_corporal"
                  type="number"
                  step="0.1"
                  className={inputClass('grasa_corporal')}
                  value={grasaCorporal}
                  onChange={(e) => handleNumericChange('grasa_corporal', e.target.value)}
                  placeholder="0–100%"
                />
                {fieldErrors.grasa_corporal && <span className={styles.errorText}>{fieldErrors.grasa_corporal}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="porcentaje_agua">% Agua</label>
                <input
                  id="porcentaje_agua"
                  type="number"
                  step="0.1"
                  className={inputClass('porcentaje_agua')}
                  value={porcentajeAgua}
                  onChange={(e) => handleNumericChange('porcentaje_agua', e.target.value)}
                  placeholder="0–100%"
                />
                {fieldErrors.porcentaje_agua && <span className={styles.errorText}>{fieldErrors.porcentaje_agua}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="masa_muscular_kg">Masa muscular (kg)</label>
                <input
                  id="masa_muscular_kg"
                  type="number"
                  step="0.1"
                  className={inputClass('masa_muscular_kg')}
                  value={masaMuscularKg}
                  onChange={(e) => handleNumericChange('masa_muscular_kg', e.target.value)}
                  placeholder="0.5–400 kg"
                />
                {fieldErrors.masa_muscular_kg && <span className={styles.errorText}>{fieldErrors.masa_muscular_kg}</span>}
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="grasa_visceral">Grasa visceral (nivel)</label>
                <input
                  id="grasa_visceral"
                  type="number"
                  step="1"
                  className={inputClass('grasa_visceral')}
                  value={grasaVisceral}
                  onChange={(e) => handleNumericChange('grasa_visceral', e.target.value)}
                  placeholder="0–60"
                />
                {fieldErrors.grasa_visceral && <span className={styles.errorText}>{fieldErrors.grasa_visceral}</span>}
              </div>
            </div>
          </div>

          {/* Perímetros */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Perímetros (cm)</h3>
            <div className={styles.grid3}>
              {[
                { id: 'brazo_relajado',      label: 'Brazo relajado',      val: brazoRelajado,      set: setBrazoRelajado },
                { id: 'brazo_flexionado',    label: 'Brazo flexionado',    val: brazoFlexionado,    set: setBrazoFlexionado },
                { id: 'cintura',             label: 'Cintura',             val: cintura,            set: setCintura },
                { id: 'cadera_maximo',       label: 'Cadera máximo',       val: caderaMaximo,       set: setCaderaMaximo },
                { id: 'muslo_maximo',        label: 'Muslo máximo',        val: musloMaximo,        set: setMusloMaximo },
                { id: 'muslo_medio',         label: 'Muslo medio',         val: musloMedio,         set: setMusloMedio },
                { id: 'pantorrilla_maximo',  label: 'Pantorrilla máximo',  val: pantorrillaMaximo,  set: setPantorrillaMaximo },
              ].map(({ id, label, val }) => (
                <div key={id} className={styles.field}>
                  <label className={styles.label} htmlFor={id}>{label}</label>
                  <input
                    id={id}
                    type="number"
                    step="0.1"
                    className={inputClass(id)}
                    value={val}
                    onChange={(e) => handleNumericChange(id, e.target.value)}
                  />
                  {fieldErrors[id] && <span className={styles.errorText}>{fieldErrors[id]}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Pliegues cutáneos */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Pliegues cutáneos (mm)</h3>
            <div className={styles.grid3}>
              {[
                { id: 'pliegue_tricipital',    label: 'Tricipital',    val: pliegue_tricipital },
                { id: 'pliegue_subescapular',  label: 'Subescapular',  val: pliegue_subescapular },
                { id: 'pliegue_bicipital',     label: 'Bicipital',     val: pliegue_bicipital },
                { id: 'pliegue_cresta_iliaca', label: 'Cresta ilíaca', val: pliegue_cresta_iliaca },
                { id: 'pliegue_supraespinal',  label: 'Supraespinal',  val: pliegue_supraespinal },
                { id: 'pliegue_abdominal',     label: 'Abdominal',     val: pliegue_abdominal },
              ].map(({ id, label, val }) => (
                <div key={id} className={styles.field}>
                  <label className={styles.label} htmlFor={id}>{label}</label>
                  <input
                    id={id}
                    type="number"
                    step="0.1"
                    className={inputClass(id)}
                    value={val}
                    onChange={(e) => handleNumericChange(id, e.target.value)}
                  />
                  {fieldErrors[id] && <span className={styles.errorText}>{fieldErrors[id]}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Notas clínicas */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Notas clínicas</h3>
            <div className={styles.grid2}>
              {[
                { id: 'diagnostico',           label: '1. Diagnóstico y tratamiento médico', val: diagnostico,            set: setDiagnostico,            placeholder: 'Diagnóstico del estado nutricional y tratamiento médico' },
                { id: 'antecedentes_familiares', label: '2. Antecedentes Familiares',         val: antecedentes_familiares, set: setAntecedentesFamiliares, placeholder: 'Antecedentes familiares relevantes' },
                { id: 'estudios_laboratorio',   label: '3. Estudios de laboratorio',          val: estudios_laboratorio,   set: setEstudiosLaboratorio,   placeholder: 'Resultados o descripción de estudios de laboratorio' },
                { id: 'notas',                  label: '4. Hábitos alimenticios',             val: notas,                  set: setNotas,                  placeholder: 'Descripción de los hábitos alimenticios del paciente' },
                { id: 'observaciones',          label: '5. Hábitos de Ejercicio',             val: observaciones,          set: setObservaciones,          placeholder: 'Descripción de los hábitos de ejercicio del paciente' },
                { id: 'objetivo',               label: '6. Objetivos de tratamiento',         val: objetivo,               set: setObjetivo,               placeholder: 'Objetivos planteados para el paciente' },
                { id: 'plan',                   label: '7. Plan nutricional',                 val: plan,                   set: setPlan,                   placeholder: 'Plan de alimentación asignado' },
              ].map(({ id, label, val, set, placeholder }) => (
                <div key={id} className={styles.fieldFull}>
                  <label className={styles.label} htmlFor={id}>{label}</label>
                  <textarea
                    id={id}
                    className={styles.textarea}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Información de pago */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Información de pago</h3>
            <div className={styles.grid3}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="monto_consulta">Monto ($)</label>
                <input
                  id="monto_consulta"
                  type="number"
                  step="0.01"
                  min="0"
                  className={styles.input}
                  value={montoConsulta}
                  onChange={(e) => setMontoConsulta(e.target.value)}
                  placeholder="ej. 500.00"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="metodo_pago">Método de pago</label>
                <select id="metodo_pago" className={styles.select} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  <option value="">Sin especificar</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="estado_pago">Estado de pago</label>
                <select id="estado_pago" className={styles.select} value={estadoPago} onChange={(e) => setEstadoPago(e.target.value)}>
                  <option value="">Sin especificar</option>
                  <option value="PAGADO">Pagado</option>
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="PARCIAL">Parcial</option>
                </select>
              </div>
              <div className={styles.fieldFull}>
                <label className={styles.label} htmlFor="notas_pago">Notas de pago</label>
                <input
                  id="notas_pago"
                  type="text"
                  className={styles.input}
                  value={notasPago}
                  onChange={(e) => setNotasPago(e.target.value)}
                  placeholder="Notas sobre el pago"
                />
              </div>
            </div>
          </div>

          {/* Próxima cita */}
          <div className={`${styles.section} ${!esConsultaReciente ? styles.sectionDisabled : ''}`}>
            <h3 className={styles.sectionTitle}>Próxima cita sugerida</h3>
            {!esConsultaReciente ? (
              <p className={styles.sectionBlockedMsg}>
                Solo se puede modificar la fecha sugerida de la consulta más reciente, ya que es la
                que activa los recordatorios automáticos.
              </p>
            ) : (
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="proxima_cita">Fecha sugerida</label>
                  <input
                    id="proxima_cita"
                    type="date"
                    className={styles.input}
                    value={proximaCita}
                    min={today}
                    onChange={(e) => setProximaCita(e.target.value)}
                  />
                  <span className={styles.fieldHint}>Debe ser una fecha futura</span>
                </div>
              </div>
            )}
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </form>

        <div className={styles.footer}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnSave}
            disabled={saving || Object.keys(fieldErrors).length > 0}
            onClick={handleSubmit}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
