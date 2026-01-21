import prisma from '@/lib/prisma'

/**
 * Tipos de plantillas disponibles
 */
export enum TipoPlantilla {
  CONFIRMACION = 'AUTOMATICO_CONFIRMACION',
  RECORDATORIO_24H = 'AUTOMATICO_RECORDATORIO',
  RECORDATORIO_1H = 'AUTOMATICO_RECORDATORIO',
  SEGUIMIENTO = 'AUTOMATICO_SEGUIMIENTO', // Legacy - mantener por compatibilidad

  // Nuevas plantillas de seguimiento post-consulta
  SEGUIMIENTO_INICIAL = 'AUTOMATICO_SEGUIMIENTO',
  SEGUIMIENTO_INTERMEDIO = 'AUTOMATICO_SEGUIMIENTO',
  SEGUIMIENTO_PREVIO_CITA = 'AUTOMATICO_SEGUIMIENTO',
  RECORDATORIO_AGENDAR = 'AUTOMATICO_RECORDATORIO',
}

/**
 * Variables disponibles para reemplazar en plantillas
 */
export interface VariablesPlantilla {
  nombre: string
  email?: string
  telefono?: string
  fecha_cita: Date
  hora_cita: string
  codigo_cita: string
  motivo?: string
  url_portal?: string
}

/**
 * Configuración de plantillas aprobadas por Meta
 */
interface PlantillaAprobada {
  contentSid: string
  variables: string[] // Orden de variables requerido por la plantilla
}

/**
 * Mapeo de tipos a plantillas aprobadas (se configura en .env)
 */
const PLANTILLAS_APROBADAS: Record<string, PlantillaAprobada | null> = {
  [TipoPlantilla.CONFIRMACION]: process.env.TEMPLATE_CONFIRMACION_SID
    ? {
        contentSid: process.env.TEMPLATE_CONFIRMACION_SID,
        variables: ['nombre', 'fecha_cita', 'hora_cita', 'codigo_cita', 'url_portal'],
      }
    : null,
  [TipoPlantilla.RECORDATORIO_24H]: process.env.TEMPLATE_RECORDATORIO_24H_SID
    ? {
        contentSid: process.env.TEMPLATE_RECORDATORIO_24H_SID,
        variables: ['nombre', 'fecha_cita', 'hora_cita', 'codigo_cita', 'url_portal'],
      }
    : null,
  [TipoPlantilla.RECORDATORIO_1H]: process.env.TEMPLATE_RECORDATORIO_1H_SID
    ? {
        contentSid: process.env.TEMPLATE_RECORDATORIO_1H_SID,
        variables: ['nombre', 'hora_cita'],
      }
    : null,
  [TipoPlantilla.SEGUIMIENTO]: process.env.TEMPLATE_SEGUIMIENTO_SID
    ? {
        contentSid: process.env.TEMPLATE_SEGUIMIENTO_SID,
        variables: ['nombre'],
      }
    : null,

  // Nuevas plantillas de seguimiento post-consulta
  [TipoPlantilla.SEGUIMIENTO_INICIAL]: process.env.TEMPLATE_SEGUIMIENTO_INICIAL_SID
    ? {
        contentSid: process.env.TEMPLATE_SEGUIMIENTO_INICIAL_SID,
        variables: ['nombre'],
      }
    : null,
  [TipoPlantilla.SEGUIMIENTO_INTERMEDIO]: process.env.TEMPLATE_SEGUIMIENTO_INTERMEDIO_SID
    ? {
        contentSid: process.env.TEMPLATE_SEGUIMIENTO_INTERMEDIO_SID,
        variables: ['nombre'],
      }
    : null,
  [TipoPlantilla.SEGUIMIENTO_PREVIO_CITA]: process.env.TEMPLATE_SEGUIMIENTO_PREVIO_CITA_SID
    ? {
        contentSid: process.env.TEMPLATE_SEGUIMIENTO_PREVIO_CITA_SID,
        variables: ['nombre', 'fecha_cita'],
      }
    : null,
  [TipoPlantilla.RECORDATORIO_AGENDAR]: process.env.TEMPLATE_RECORDATORIO_AGENDAR_SID
    ? {
        contentSid: process.env.TEMPLATE_RECORDATORIO_AGENDAR_SID,
        variables: ['nombre', 'fecha_cita', 'url_portal'],
      }
    : null,
}

/**
 * Formatea una fecha en formato legible en español
 * Ejemplo: "20 de Enero, 2025"
 */
export function formatearFecha(fecha: Date): string {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ]

  const dia = fecha.getDate()
  const mes = meses[fecha.getMonth()]
  const año = fecha.getFullYear()

  return `${dia} de ${mes}, ${año}`
}

/**
 * Formatea una fecha en formato corto
 * Ejemplo: "Mañana 20 de Enero" o "Hoy"
 */
export function formatearFechaRelativa(fecha: Date): string {
  const hoy = new Date()
  const mañana = new Date(hoy)
  mañana.setDate(mañana.getDate() + 1)

  // Normalizar fechas a medianoche para comparación
  const fechaNormalizada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const hoyNormalizado = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const mañanaNormalizado = new Date(mañana.getFullYear(), mañana.getMonth(), mañana.getDate())

  if (fechaNormalizada.getTime() === hoyNormalizado.getTime()) {
    return 'Hoy'
  } else if (fechaNormalizada.getTime() === mañanaNormalizado.getTime()) {
    return 'Mañana'
  } else {
    return formatearFecha(fecha)
  }
}

/**
 * Formatea una hora en formato 12h
 * Ejemplo: "16:00" → "4:00 PM"
 */
export function formatearHora(hora: string): string {
  const [hours, minutes] = hora.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12

  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Reemplaza variables en el contenido de una plantilla
 */
export function reemplazarVariables(
  contenido: string,
  variables: VariablesPlantilla
): string {
  let resultado = contenido

  // Reemplazar cada variable
  resultado = resultado.replace(/{nombre}/g, variables.nombre)
  resultado = resultado.replace(/{email}/g, variables.email || '')
  resultado = resultado.replace(/{telefono}/g, variables.telefono || '')
  resultado = resultado.replace(/{fecha_cita}/g, formatearFecha(variables.fecha_cita))
  resultado = resultado.replace(/{fecha_relativa}/g, formatearFechaRelativa(variables.fecha_cita))
  resultado = resultado.replace(/{hora_cita}/g, variables.hora_cita)
  resultado = resultado.replace(/{hora_formateada}/g, formatearHora(variables.hora_cita))
  resultado = resultado.replace(/{codigo_cita}/g, variables.codigo_cita)
  resultado = resultado.replace(/{motivo}/g, variables.motivo || '')
  resultado = resultado.replace(
    /{url_portal}/g,
    variables.url_portal || process.env.NEXT_PUBLIC_APP_URL || 'https://tudominio.com'
  )

  return resultado
}

/**
 * Obtiene una plantilla de la base de datos según su tipo
 */
export async function obtenerPlantilla(tipo: TipoPlantilla): Promise<string | null> {
  try {
    const plantilla = await prisma.plantillaMensaje.findFirst({
      where: {
        tipo,
        activa: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!plantilla) {
      console.warn(`⚠️  No se encontró plantilla activa para tipo: ${tipo}`)
      return null
    }

    return plantilla.contenido
  } catch (error) {
    console.error('Error al obtener plantilla:', error)
    return null
  }
}

/**
 * Verifica si se deben usar plantillas aprobadas por Meta
 */
export function usarPlantillasAprobadas(): boolean {
  return process.env.USE_APPROVED_TEMPLATES === 'true'
}

/**
 * Obtiene el contentSid de una plantilla aprobada
 */
export function obtenerContentSid(tipo: TipoPlantilla): string | null {
  const plantilla = PLANTILLAS_APROBADAS[tipo]
  return plantilla?.contentSid || null
}

/**
 * Prepara las variables para una plantilla aprobada de Meta
 * Las variables deben estar en el orden correcto según la plantilla
 */
export function prepararVariablesAprobadas(
  tipo: TipoPlantilla,
  variables: VariablesPlantilla
): Record<string, string> {
  const plantilla = PLANTILLAS_APROBADAS[tipo]
  if (!plantilla) return {}

  const resultado: Record<string, string> = {}

  plantilla.variables.forEach((nombreVar, index) => {
    const numeroVar = (index + 1).toString()

    switch (nombreVar) {
      case 'nombre':
        resultado[numeroVar] = variables.nombre
        break
      case 'fecha_cita':
        resultado[numeroVar] = formatearFecha(variables.fecha_cita)
        break
      case 'fecha_relativa':
        resultado[numeroVar] = formatearFechaRelativa(variables.fecha_cita)
        break
      case 'hora_cita':
        resultado[numeroVar] = variables.hora_cita
        break
      case 'hora_formateada':
        resultado[numeroVar] = formatearHora(variables.hora_cita)
        break
      case 'codigo_cita':
        resultado[numeroVar] = variables.codigo_cita
        break
      case 'url_portal':
        resultado[numeroVar] =
          variables.url_portal || process.env.NEXT_PUBLIC_APP_URL || 'https://tudominio.com'
        break
      default:
        break
    }
  })

  return resultado
}

/**
 * Genera el mensaje completo listo para enviar
 * Devuelve el contenido procesado o los datos para plantilla aprobada
 */
export async function generarMensaje(
  tipo: TipoPlantilla,
  variables: VariablesPlantilla
): Promise<{
  modo: 'sandbox' | 'produccion'
  contenido?: string // Para sandbox
  contentSid?: string // Para producción
  contentVariables?: string // Para producción (JSON string)
}> {
  const usarAprobadas = usarPlantillasAprobadas()

  if (usarAprobadas) {
    // Modo producción: Usar plantilla aprobada por Meta
    const contentSid = obtenerContentSid(tipo)

    if (!contentSid) {
      throw new Error(`No se encontró contentSid para plantilla tipo: ${tipo}`)
    }

    const contentVariables = prepararVariablesAprobadas(tipo, variables)

    return {
      modo: 'produccion',
      contentSid,
      contentVariables: JSON.stringify(contentVariables),
    }
  } else {
    // Modo sandbox: Usar plantilla de BD con reemplazo de variables
    const plantillaContenido = await obtenerPlantilla(tipo)

    if (!plantillaContenido) {
      throw new Error(`No se encontró plantilla activa para tipo: ${tipo}`)
    }

    const contenido = reemplazarVariables(plantillaContenido, variables)

    return {
      modo: 'sandbox',
      contenido,
    }
  }
}
