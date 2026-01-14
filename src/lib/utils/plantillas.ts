/**
 * Utilidad para procesar plantillas con variables dinámicas
 */

interface VariablesPlantilla {
  // Variables del paciente
  nombre?: string
  email?: string
  telefono?: string
  edad?: number

  // Variables de cita
  fecha_cita?: string
  hora_cita?: string
  duracion_cita?: number
  motivo_cita?: string

  // Variables de consulta
  peso?: number
  imc?: number
  objetivo?: string

  // Variables generales
  nombre_nutriologo?: string
  direccion_consultorio?: string
  telefono_consultorio?: string

  // Permite otras variables personalizadas
  [key: string]: string | number | undefined
}

/**
 * Reemplaza las variables en una plantilla con los valores proporcionados
 *
 * @param plantilla - El texto de la plantilla con variables en formato {variable}
 * @param variables - Objeto con los valores de las variables
 * @returns El texto de la plantilla con las variables reemplazadas
 *
 * @example
 * const texto = "Hola {nombre}, tu cita es el {fecha_cita} a las {hora_cita}"
 * const resultado = procesarPlantilla(texto, {
 *   nombre: "Juan Pérez",
 *   fecha_cita: "15 de enero",
 *   hora_cita: "10:00 AM"
 * })
 * // Resultado: "Hola Juan Pérez, tu cita es el 15 de enero a las 10:00 AM"
 */
export function procesarPlantilla(
  plantilla: string,
  variables: VariablesPlantilla
): string {
  let resultado = plantilla

  // Reemplazar cada variable en la plantilla
  Object.keys(variables).forEach((key) => {
    const valor = variables[key]
    if (valor !== undefined && valor !== null) {
      // Crear regex para encontrar {variable} de forma case-insensitive
      const regex = new RegExp(`\\{${key}\\}`, 'gi')
      resultado = resultado.replace(regex, String(valor))
    }
  })

  return resultado
}

/**
 * Extrae las variables utilizadas en una plantilla
 *
 * @param plantilla - El texto de la plantilla
 * @returns Array con los nombres de las variables encontradas
 *
 * @example
 * const variables = extraerVariables("Hola {nombre}, tu cita es el {fecha_cita}")
 * // Resultado: ["nombre", "fecha_cita"]
 */
export function extraerVariables(plantilla: string): string[] {
  const regex = /\{([^}]+)\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(plantilla)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return variables
}

/**
 * Valida que todas las variables requeridas estén presentes
 *
 * @param plantilla - El texto de la plantilla
 * @param variables - Objeto con los valores de las variables
 * @returns Objeto con el resultado de la validación
 */
export function validarVariablesPlantilla(
  plantilla: string,
  variables: VariablesPlantilla
): { valido: boolean; faltantes: string[] } {
  const variablesRequeridas = extraerVariables(plantilla)
  const faltantes = variablesRequeridas.filter(
    (variable) => variables[variable] === undefined || variables[variable] === null
  )

  return {
    valido: faltantes.length === 0,
    faltantes,
  }
}

/**
 * Genera las variables para un paciente desde su información
 */
export function generarVariablesPaciente(paciente: {
  nombre: string
  email?: string
  telefono?: string
  fecha_nacimiento?: string | Date
}): VariablesPlantilla {
  const variables: VariablesPlantilla = {
    nombre: paciente.nombre,
    email: paciente.email,
    telefono: paciente.telefono,
  }

  // Calcular edad si hay fecha de nacimiento
  if (paciente.fecha_nacimiento) {
    const fechaNac = new Date(paciente.fecha_nacimiento)
    const hoy = new Date()
    let edad = hoy.getFullYear() - fechaNac.getFullYear()
    const mes = hoy.getMonth() - fechaNac.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--
    }
    variables.edad = edad
  }

  return variables
}

/**
 * Genera las variables para una cita
 */
export function generarVariablesCita(cita: {
  fecha_hora: string | Date
  duracion_minutos?: number
  motivo_consulta?: string
}): VariablesPlantilla {
  const fecha = new Date(cita.fecha_hora)

  return {
    fecha_cita: fecha.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    hora_cita: fecha.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
    duracion_cita: cita.duracion_minutos,
    motivo_cita: cita.motivo_consulta,
  }
}

/**
 * Lista de variables disponibles con sus descripciones
 */
export const VARIABLES_DISPONIBLES = {
  // Paciente
  nombre: 'Nombre completo del paciente',
  email: 'Correo electrónico del paciente',
  telefono: 'Teléfono del paciente',
  edad: 'Edad del paciente',

  // Cita
  fecha_cita: 'Fecha de la cita',
  hora_cita: 'Hora de la cita',
  duracion_cita: 'Duración de la cita en minutos',
  motivo_cita: 'Motivo de la consulta',

  // Consulta
  peso: 'Peso del paciente',
  imc: 'Índice de masa corporal',
  objetivo: 'Objetivo del tratamiento',

  // General
  nombre_nutriologo: 'Nombre del nutriólogo',
  direccion_consultorio: 'Dirección del consultorio',
  telefono_consultorio: 'Teléfono del consultorio',
}
