import type {
  Usuario,
  Paciente,
  Cita,
  Consulta,
  ArchivoAdjunto,
  MensajeWhatsApp,
  PlantillaWhatsApp,
  ConfiguracionSistema,
  ConfiguracionMensajeCita,
  ConfiguracionMensajePaciente,
  EstadoCita,
  EstadoMensaje,
  DireccionMensaje,
  TipoMensaje,
  CategoriaPlantilla,
  Rol,
} from '@prisma/client'

// Re-export Prisma types
export type {
  Usuario,
  Paciente,
  Cita,
  Consulta,
  ArchivoAdjunto,
  MensajeWhatsApp,
  PlantillaWhatsApp,
  ConfiguracionSistema,
  ConfiguracionMensajeCita,
  ConfiguracionMensajePaciente,
  EstadoCita,
  EstadoMensaje,
  DireccionMensaje,
  TipoMensaje,
  CategoriaPlantilla,
  Rol,
}

// Extended types with relations
export type PacienteConRelaciones = Paciente & {
  citas: Cita[]
  consultas: Consulta[]
  mensajes: MensajeWhatsApp[]
}

export type CitaConRelaciones = Cita & {
  paciente: Paciente
  consulta?: Consulta | null
  configuracion_msg?: ConfiguracionMensajeCita | null
}

export type ConsultaConRelaciones = Consulta & {
  cita: Cita
  paciente: Paciente
  archivos: ArchivoAdjunto[]
}

export type MensajeConPaciente = MensajeWhatsApp & {
  paciente: Paciente
}

// API Response types
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Form types
export type AgendarCitaForm = {
  nombre: string
  email: string
  telefono: string
  fecha_nacimiento: Date
  fecha_hora: Date
  motivo_consulta: string
}

export type CrearConsultaForm = {
  cita_id: string
  paciente_id: string
  fecha: Date
  peso?: number
  notas?: string
  observaciones?: string
}

export type EnviarMensajeForm = {
  paciente_id: string
  contenido: string
}

// Webhook types
export type TwilioWebhookPayload = {
  MessageSid: string
  From: string
  To: string
  Body: string
  NumMedia: string
  SmsStatus?: string
}

export type GoogleCalendarWebhookPayload = {
  kind: string
  id: string
  resourceId: string
  resourceUri: string
  channelId: string
  expiration: string
}

// Queue job types
export type RecordatorioJob = {
  citaId: string
  pacienteId: string
  tipo: 'recordatorio' | 'confirmacion'
}

export type SeguimientoJob = {
  consultaId: string
  pacienteId: string
}
