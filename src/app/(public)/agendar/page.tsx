'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CalendarioCitas from '@/components/calendario/CalendarioCitas'
import { extraerDigitosTelefono } from '@/lib/utils/phone'
import styles from './agendar.module.css'

interface PacienteExistente {
  id: string
  nombre: string
  email: string
  telefono: string
  fecha_nacimiento: string
  total_citas: number
}

interface CitaActiva {
  id: string
  codigo_cita: string
  fecha_hora: string
  duracion_minutos: number
  motivo_consulta: string
}

export default function AgendarCitaPage() {
  const router = useRouter()
  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [verificandoEmail, setVerificandoEmail] = useState(false)
  const [error, setError] = useState('')
  const [esReagendado, setEsReagendado] = useState(false)

  // Estado para paciente existente
  const [pacienteExistente, setPacienteExistente] = useState<PacienteExistente | null>(null)
  const [emailIngresado, setEmailIngresado] = useState('')
  const [citaActiva, setCitaActiva] = useState<CitaActiva | null>(null)

  // Datos del formulario
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [horaSeleccionada, setHoraSeleccionada] = useState('')
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    fecha_nacimiento: '',
    motivo: '',
  })

  // Cargar datos de reagendado si existen
  useEffect(() => {
    const datosGuardados = localStorage.getItem('datosReagendar')
    if (datosGuardados) {
      try {
        const datos = JSON.parse(datosGuardados)

        // Formatear fecha de nacimiento para input type="date" (YYYY-MM-DD)
        let fechaNacimientoFormateada = ''
        if (datos.fecha_nacimiento) {
          const fecha = new Date(datos.fecha_nacimiento)
          fechaNacimientoFormateada = fecha.toISOString().split('T')[0]
        }

        setFormData({
          nombre: datos.nombre || '',
          email: datos.email || '',
          telefono: datos.telefono ? extraerDigitosTelefono(datos.telefono) : '',
          fecha_nacimiento: fechaNacimientoFormateada,
          motivo: datos.motivo || '',
        })
        setEmailIngresado(datos.email || '')
        setEsReagendado(true)
        // Limpiar localStorage después de cargar
        localStorage.removeItem('datosReagendar')
      } catch (err) {
        console.error('Error al cargar datos de reagendado:', err)
      }
    }
  }, [])

  const handleSeleccionarFechaHora = (fecha: string, hora: string) => {
    setFechaSeleccionada(fecha)
    setHoraSeleccionada(hora)
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const continuarAPaso2 = () => {
    if (!fechaSeleccionada || !horaSeleccionada) {
      setError('Por favor, selecciona una fecha y hora')
      return
    }
    setError('')
    setPaso(2)
  }

  const volverAPaso1 = () => {
    setPaso(1)
    setError('')
    setPacienteExistente(null)
    setEmailIngresado('')
  }

  const volverAPaso2 = () => {
    setPaso(2)
    setError('')
  }

  // Verificar si el email existe en la base de datos
  const verificarEmail = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!emailIngresado || !emailIngresado.includes('@')) {
      setError('Por favor, ingresa un email válido')
      return
    }

    setError('')
    setVerificandoEmail(true)
    setCitaActiva(null)

    try {
      // 1. Verificar si el paciente existe
      const responseVerificar = await fetch('/api/pacientes/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailIngresado }),
      })

      const dataVerificar = await responseVerificar.json()

      if (!responseVerificar.ok) {
        setError(dataVerificar.error || 'Error al verificar email')
        return
      }

      // 2. Si el paciente existe, verificar si tiene una cita activa
      if (dataVerificar.existe) {
        const responseCitaActiva = await fetch('/api/pacientes/cita-activa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailIngresado }),
        })

        const dataCitaActiva = await responseCitaActiva.json()

        if (responseCitaActiva.ok && dataCitaActiva.existe && dataCitaActiva.cita) {
          // Tiene cita activa - mostrar advertencia
          setCitaActiva(dataCitaActiva.cita)
          // No avanzar al paso 3, quedarse en paso 2 con advertencia
          return
        }

        // No tiene cita activa - continuar normalmente
        setPacienteExistente(dataVerificar.paciente)

        // Formatear fecha de nacimiento
        const fechaNacimiento = new Date(dataVerificar.paciente.fecha_nacimiento)
        const fechaFormateada = fechaNacimiento.toISOString().split('T')[0]

        setFormData({
          nombre: dataVerificar.paciente.nombre,
          email: dataVerificar.paciente.email,
          telefono: extraerDigitosTelefono(dataVerificar.paciente.telefono),
          fecha_nacimiento: fechaFormateada,
          motivo: '',
        })
      } else {
        // Paciente nuevo - solo pre-llenar email
        setPacienteExistente(null)
        setFormData({
          ...formData,
          email: emailIngresado,
        })
      }

      setPaso(3)
    } catch (err) {
      setError('Error de conexión. Por favor, intenta de nuevo.')
    } finally {
      setVerificandoEmail(false)
    }
  }

  const agendarCita = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/citas/publica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fecha_cita: fechaSeleccionada,
          hora_cita: horaSeleccionada,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/cita/${data.cita.codigo_cita}?nuevo=true`)
      } else {
        setError(data.error || 'Error al agendar la cita')
      }
    } catch (err) {
      setError('Error de conexión. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const formatearFecha = (fecha: string) => {
    // Parsear fecha manualmente para evitar problemas de zona horaria
    const [year, month, day] = fecha.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  const formatearHora12h = (hora24: string): string => {
    const [horas, minutos] = hora24.split(':')
    const horasNum = parseInt(horas)
    const periodo = horasNum >= 12 ? 'PM' : 'AM'
    const horas12 = horasNum === 0 ? 12 : horasNum > 12 ? horasNum - 12 : horasNum
    return `${horas12}:${minutos} ${periodo}`
  }

  return (
    <main className={styles.main}>
      {/* Top Header */}
      <div className={styles.topHeader}>
        <div className={styles.logo}>
          <span className={styles.logoText}>Dr. Paul</span>
        </div>
        <button onClick={() => router.push('/')} className={styles.backButton}>
          Volver
        </button>
      </div>

      {/* Hero Section - Solo paso 1 */}
      {paso === 1 && (
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            {esReagendado ? 'Reagenda tu Consulta' : 'Agenda tu Consulta'}
          </h1>
          <p className={styles.heroSubtitle}>
            {esReagendado
              ? 'Selecciona una nueva fecha y hora para tu consulta'
              : 'Selecciona el día y hora que mejor te convenga'}
          </p>
        </div>
      )}

      <div className={styles.container}>
        {/* Progress bar */}
        <div className={styles.progress}>
          <div className={`${styles.step} ${paso >= 1 ? styles.stepActive : ''}`}>
            <div className={styles.stepNumber}>1</div>
            <span>Fecha y hora</span>
          </div>
          <div className={styles.progressLine}></div>
          <div className={`${styles.step} ${paso >= 2 ? styles.stepActive : ''}`}>
            <div className={styles.stepNumber}>2</div>
            <span>Tu email</span>
          </div>
          <div className={styles.progressLine}></div>
          <div className={`${styles.step} ${paso >= 3 ? styles.stepActive : ''}`}>
            <div className={styles.stepNumber}>3</div>
            <span>Confirmar</span>
          </div>
        </div>

        {/* Paso 1: Seleccionar fecha y hora */}
        {paso === 1 && (
          <div className={styles.paso}>
            <h2 className={styles.pasoTitle}>Selecciona fecha y hora</h2>

            <CalendarioCitas
              onSeleccionarFechaHora={handleSeleccionarFechaHora}
              fechaSeleccionada={fechaSeleccionada}
              horaSeleccionada={horaSeleccionada}
            />

            {error && <div className={styles.error}>{error}</div>}

            {fechaSeleccionada && horaSeleccionada && (
              <div className={styles.resumen}>
                <p>Seleccionaste:</p>
                <p className={styles.resumenFecha}>
                  {formatearFecha(fechaSeleccionada)} a las {formatearHora12h(horaSeleccionada)}
                </p>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => router.push('/')}
                className={styles.btnSecondary}
              >
                {esReagendado ? 'Volver atrás' : 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={continuarAPaso2}
                className={styles.btnPrimary}
                disabled={!fechaSeleccionada || !horaSeleccionada}
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Verificar email */}
        {paso === 2 && (
          <div className={styles.paso}>
            <h2 className={styles.pasoTitle}>Ingresa tu email</h2>

            <div className={styles.resumenCompacto}>
              <span>{formatearFecha(fechaSeleccionada)}</span>
              <span className={styles.separator}>·</span>
              <span>{formatearHora12h(horaSeleccionada)}</span>
            </div>

            <div className={styles.emailVerificacion}>
              <p className={styles.emailVerificacionTexto}>
                Ingresa tu email para continuar:
              </p>

              <div className={styles.emailInstrucciones}>
                <div className={styles.instruccionItem}>
                  <span className={styles.instruccionIcono}>✓</span>
                  <span>Si es tu <strong>primera cita</strong>, usa tu email personal y lo recordaremos para futuras consultas</span>
                </div>
                <div className={styles.instruccionItem}>
                  <span className={styles.instruccionIcono}>✓</span>
                  <span>Si <strong>ya agendaste antes</strong>, usa el mismo email y cargaremos tus datos automáticamente</span>
                </div>
              </div>

              <form onSubmit={verificarEmail} className={styles.emailForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="email_verificar">Tu Email</label>
                  <input
                    type="email"
                    id="email_verificar"
                    value={emailIngresado}
                    onChange={(e) => setEmailIngresado(e.target.value)}
                    required
                    placeholder="ejemplo@email.com"
                    className={styles.emailInput}
                  />
                  <small>Este email te identificará en nuestro sistema</small>
                </div>

                {error && <div className={styles.error}>{error}</div>}

                {/* Advertencia de cita activa */}
                {citaActiva && (
                  <div className={styles.citaActivaWarning}>
                    <div className={styles.warningHeader}>
                      <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <h3>Ya tienes una cita pendiente</h3>
                    </div>
                    <p className={styles.warningMessage}>
                      Solo puedes tener una cita activa a la vez. Aquí están los detalles de tu cita actual:
                    </p>
                    <div className={styles.citaDetalles}>
                      <div className={styles.citaDetalle}>
                        <strong>Código:</strong>
                        <span>{citaActiva.codigo_cita}</span>
                      </div>
                      <div className={styles.citaDetalle}>
                        <strong>Fecha:</strong>
                        <span>{new Date(citaActiva.fecha_hora).toLocaleDateString('es-MX', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      <div className={styles.citaDetalle}>
                        <strong>Motivo:</strong>
                        <span>{citaActiva.motivo_consulta}</span>
                      </div>
                    </div>
                    <div className={styles.warningActions}>
                      <button
                        type="button"
                        onClick={() => router.push(`/cita/${citaActiva.codigo_cita}`)}
                        className={styles.btnVerCita}
                      >
                        Ver mi cita
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push('/')}
                        className={styles.btnVolver}
                      >
                        Volver al inicio
                      </button>
                    </div>
                  </div>
                )}

                {/* Solo mostrar botones si NO hay cita activa */}
                {!citaActiva && (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      onClick={volverAPaso1}
                      className={styles.btnSecondary}
                      disabled={verificandoEmail}
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      className={styles.btnPrimary}
                      disabled={verificandoEmail || !emailIngresado}
                    >
                      {verificandoEmail ? 'Verificando...' : 'Continuar'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Paso 3: Formulario de datos (confirmación o completar) */}
        {paso === 3 && (
          <div className={styles.paso}>
            {pacienteExistente ? (
              <>
                <h2 className={styles.pasoTitle}>¡Te reconocemos!</h2>

                <div className={styles.pacienteEncontrado}>
                  <div className={styles.bienvenida}>
                    <p className={styles.bienvenidaNombre}>Hola, {pacienteExistente.nombre}</p>
                    <p className={styles.bienvenidaSubtexto}>
                      Esta será tu cita número {pacienteExistente.total_citas + 1} con nosotros
                    </p>
                  </div>

                  <div className={styles.resumenCompacto}>
                    <span>{formatearFecha(fechaSeleccionada)}</span>
                    <span className={styles.separator}>·</span>
                    <span>{formatearHora12h(horaSeleccionada)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className={styles.pasoTitle}>Completa tus datos</h2>

                <div className={styles.resumenCompacto}>
                  <span>{formatearFecha(fechaSeleccionada)}</span>
                  <span className={styles.separator}>·</span>
                  <span>{formatearHora12h(horaSeleccionada)}</span>
                </div>
              </>
            )}

            <form onSubmit={agendarCita} className={styles.form}>
              {pacienteExistente && (
                <div className={styles.datosActualesCard}>
                  <p className={styles.datosActualesTitle}>Tus datos actuales:</p>
                  <div className={styles.datosActualesGrid}>
                    <div className={styles.datoActual}>
                      <span className={styles.datoLabel}>Email:</span>
                      <span className={styles.datoValue}>{pacienteExistente.email}</span>
                    </div>
                    <div className={styles.datoActual}>
                      <span className={styles.datoLabel}>Teléfono:</span>
                      <span className={styles.datoValue}>{pacienteExistente.telefono}</span>
                    </div>
                  </div>
                  <p className={styles.datosActualesNota}>
                    Si algún dato cambió, puedes actualizarlo abajo
                  </p>
                </div>
              )}

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="nombre">Nombre completo</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                    minLength={3}
                    placeholder="Ej: Juan Pérez García"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="tu@email.com"
                    disabled
                    className={styles.inputDisabled}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="telefono">Teléfono (WhatsApp)</label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    required
                    placeholder="9515886761"
                    pattern="[0-9]{10}"
                    maxLength={10}
                  />
                  <small>10 dígitos sin espacios (ej: 9515886761)</small>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fecha_nacimiento">Fecha de nacimiento</label>
                  <input
                    type="date"
                    id="fecha_nacimiento"
                    name="fecha_nacimiento"
                    value={formData.fecha_nacimiento}
                    onChange={handleInputChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="motivo">Motivo de la consulta</label>
                <textarea
                  id="motivo"
                  name="motivo"
                  value={formData.motivo}
                  onChange={handleInputChange}
                  required
                  minLength={10}
                  rows={4}
                  placeholder="Describe brevemente el motivo de tu consulta..."
                />
                <small>Mínimo 10 caracteres</small>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={volverAPaso2}
                  className={styles.btnSecondary}
                  disabled={loading}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={loading}
                >
                  {loading
                    ? (esReagendado ? 'Reagendando...' : 'Agendando...')
                    : (esReagendado ? 'Confirmar Reagendado' : 'Agendar Cita')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
