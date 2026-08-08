/**
 * Horarios disponibles para agendar.
 * ------------------------------------------------------------
 * Esta lógica vivía dentro de `/api/citas/disponibilidad`, donde no se podía
 * probar (estaba enterrada en un NextRequest) y arrastraba un error de zona
 * horaria: los huecos se construían con `new Date(y, m, d, hora)`, es decir en
 * la hora LOCAL DEL PROCESO, mientras que las citas se guardan ancladas a
 * México. En el VPS (Europe/Berlin) eso da ocho horas de diferencia, así que el
 * solape nunca coincidía y se ofrecían huecos ya ocupados. En una máquina en
 * horario de México las dos formas coinciden, y por eso el fallo era invisible
 * en desarrollo.
 *
 * REGLA DE ESTE MÓDULO: todo instante se construye con
 * `construirFechaHoraMexico`. Nada de `new Date(y, m, d, …)`, `setHours()` ni
 * `getDay()` sobre fechas locales: el resultado dependería de dónde corra el
 * servidor.
 */

import prisma from '@/lib/prisma'
import { listCalendarEvents, isGoogleCalendarConfigured } from '@/lib/services/google-calendar'
import { construirFechaHoraMexico } from '@/lib/utils/proxima-cita'

/** Un hueco concreto: día y hora, ambos en horario de México. */
export interface SlotDisponible {
  /** `YYYY-MM-DD` */
  fecha: string
  /** `HH:mm` en 24 h */
  hora: string
}

/** Lo que hace falta de la configuración para calcular huecos. */
export interface ConfigHorarios {
  horario_inicio: string
  horario_fin: string
  horario_sabado_inicio: string | null
  horario_sabado_fin: string | null
  horario_domingo_inicio: string | null
  horario_domingo_fin: string | null
  dias_laborales: string
  duracion_cita_default: number
  citas_simultaneas_max: number
  dias_anticipacion_max: number
  horas_anticipacion_min: number
}

/** Un tramo ya reservado (cita del sistema o evento del calendario). */
export interface Ocupacion {
  inicio: Date
  fin: Date
}

/** Configuración por defecto, la misma que usaba el endpoint. */
export const CONFIG_POR_DEFECTO: ConfigHorarios = {
  horario_inicio: '16:00',
  horario_fin: '20:00',
  horario_sabado_inicio: null,
  horario_sabado_fin: null,
  horario_domingo_inicio: null,
  horario_domingo_fin: null,
  dias_laborales: '1,2,3,4,5',
  duracion_cita_default: 60,
  citas_simultaneas_max: 1,
  dias_anticipacion_max: 30,
  horas_anticipacion_min: 24,
}

/**
 * Día de la semana (0=domingo) de una fecha `YYYY-MM-DD` en México.
 *
 * Se ancla al mediodía UTC a propósito: a esa hora el día civil es el mismo en
 * UTC y en México (UTC-6), así que el resultado no depende del huso del
 * servidor. Con `new Date(fecha).getDay()` un servidor en Europa podría
 * devolver el día anterior.
 */
export function diaSemanaEnMexico(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay()
}

/** Horario de atención que aplica a una fecha, según el día de la semana. */
export function horarioDelDia(
  fecha: string,
  config: ConfigHorarios
): { inicio: string; fin: string } {
  const dia = diaSemanaEnMexico(fecha)

  if (dia === 6 && config.horario_sabado_inicio && config.horario_sabado_fin) {
    return { inicio: config.horario_sabado_inicio, fin: config.horario_sabado_fin }
  }
  if (dia === 0 && config.horario_domingo_inicio && config.horario_domingo_fin) {
    return { inicio: config.horario_domingo_inicio, fin: config.horario_domingo_fin }
  }
  return { inicio: config.horario_inicio, fin: config.horario_fin }
}

/** ¿Se atiende ese día? */
export function esDiaLaboral(fecha: string, config: ConfigHorarios): boolean {
  const dia = diaSemanaEnMexico(fecha)
  const laborales = config.dias_laborales
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => !Number.isNaN(d))
  return laborales.includes(dia)
}

/**
 * Huecos teóricos de un día, sin mirar si están ocupados.
 * Devuelve `[]` si ese día no se atiende.
 */
export function generarSlotsDelDia(fecha: string, config: ConfigHorarios): string[] {
  if (!esDiaLaboral(fecha, config)) return []

  const { inicio, fin } = horarioDelDia(fecha, config)
  const [horaInicio, minInicio] = inicio.split(':').map(Number)
  const [horaFin, minFin] = fin.split(':').map(Number)
  if (horaInicio === undefined || horaFin === undefined) return []

  const minutosInicio = horaInicio * 60 + (minInicio ?? 0)
  const minutosFin = horaFin * 60 + (minFin ?? 0)
  const paso = config.duracion_cita_default
  if (paso <= 0) return []

  const slots: string[] = []
  // `<=` para que la última cita pueda empezar justo a la hora de cierre, que es
  // como venía funcionando la agenda.
  for (let m = minutosInicio; m <= minutosFin; m += paso) {
    const h = Math.floor(m / 60)
    const min = m % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }
  return slots
}

/**
 * Descarta los huecos ocupados y los que no cumplen la anticipación mínima.
 *
 * `ahora` se recibe en lugar de leerlo dentro para que las pruebas puedan fijar
 * el momento.
 */
export function filtrarSlotsOcupados(
  fecha: string,
  slots: string[],
  ocupaciones: Ocupacion[],
  opciones: { duracionMinutos: number; horasAnticipacionMin: number; ahora: Date }
): string[] {
  const { duracionMinutos, horasAnticipacionMin, ahora } = opciones

  return slots.filter((hora) => {
    // El instante real del hueco, anclado a México: es la misma referencia con
    // la que se guardaron las citas, y por eso ahora sí se pueden comparar.
    const inicio = construirFechaHoraMexico(fecha, hora)
    const fin = new Date(inicio.getTime() + duracionMinutos * 60000)

    const horasFaltantes = (inicio.getTime() - ahora.getTime()) / 3_600_000
    if (horasFaltantes < horasAnticipacionMin) return false

    const solapa = ocupaciones.some(
      (o) => inicio < o.fin && fin > o.inicio // solape estándar de dos intervalos
    )
    return !solapa
  })
}

/**
 * Reparte los huecos candidatos en unas pocas opciones variadas.
 *
 * Ofrecer tres horas seguidas de la misma tarde da la impresión de que no hay
 * agenda, así que primero se toma un hueco por día; solo si no se llega al
 * máximo se admite un segundo del mismo día, eligiendo el más separado.
 */
export function elegirSlotsVariados(
  candidatos: SlotDisponible[],
  maximo: number
): SlotDisponible[] {
  if (candidatos.length <= maximo) return [...candidatos]

  const porDia = new Map<string, SlotDisponible[]>()
  for (const c of candidatos) {
    const lista = porDia.get(c.fecha)
    if (lista) lista.push(c)
    else porDia.set(c.fecha, [c])
  }

  const elegidos: SlotDisponible[] = []
  const dias = [...porDia.keys()].sort()

  // Primera vuelta: un hueco por día, alternando la posición dentro del día
  // para no ofrecer siempre la primera hora de la tarde.
  dias.forEach((dia, i) => {
    if (elegidos.length >= maximo) return
    const delDia = porDia.get(dia)!
    const idx = i % 2 === 0 ? 0 : Math.floor(delDia.length / 2)
    elegidos.push(delDia[idx]!)
  })

  // Segunda vuelta: completar con huecos de días ya usados, el más alejado del
  // que ya se ofreció.
  for (const dia of dias) {
    if (elegidos.length >= maximo) break
    const delDia = porDia.get(dia)!
    const yaElegida = elegidos.find((e) => e.fecha === dia)?.hora
    const otro = delDia
      .filter((s) => s.hora !== yaElegida)
      .sort((a, b) => distanciaHoraria(b.hora, yaElegida) - distanciaHoraria(a.hora, yaElegida))[0]
    if (otro) elegidos.push(otro)
  }

  return elegidos.slice(0, maximo)
}

/** Minutos de separación entre dos horas `HH:mm`. */
function distanciaHoraria(a: string, b: string | undefined): number {
  if (!b) return 0
  const min = (h: string) => {
    const [hh, mm] = h.split(':').map(Number)
    return (hh ?? 0) * 60 + (mm ?? 0)
  }
  return Math.abs(min(a) - min(b))
}

/** Configuración de la agenda; la crea con valores por defecto si no existe. */
async function obtenerConfig(): Promise<ConfigHorarios> {
  const existente = await prisma.configuracionGeneral.findFirst()
  if (existente) return existente as unknown as ConfigHorarios

  const creada = await prisma.configuracionGeneral.create({
    data: {
      horario_inicio: CONFIG_POR_DEFECTO.horario_inicio,
      horario_fin: CONFIG_POR_DEFECTO.horario_fin,
      duracion_cita_default: CONFIG_POR_DEFECTO.duracion_cita_default,
      intervalo_entre_citas: 0,
      dias_laborales: CONFIG_POR_DEFECTO.dias_laborales,
      citas_simultaneas_max: CONFIG_POR_DEFECTO.citas_simultaneas_max,
      dias_anticipacion_max: CONFIG_POR_DEFECTO.dias_anticipacion_max,
      horas_anticipacion_min: CONFIG_POR_DEFECTO.horas_anticipacion_min,
    },
  })
  return creada as unknown as ConfigHorarios
}

/**
 * Tramos ya reservados de un día: citas del sistema y eventos del calendario.
 * El rango del día se delimita en horario de México, no en el del servidor.
 */
async function obtenerOcupaciones(fecha: string, duracionMinutos: number): Promise<Ocupacion[]> {
  const inicioDia = construirFechaHoraMexico(fecha, '00:00')
  const finDia = new Date(construirFechaHoraMexico(fecha, '23:59').getTime() + 59_000)

  const citas = await prisma.cita.findMany({
    where: {
      fecha_hora: { gte: inicioDia, lte: finDia },
      estado: { not: 'CANCELADA' },
    },
    select: { fecha_hora: true, duracion_minutos: true },
  })

  const ocupaciones: Ocupacion[] = citas.map((c) => ({
    inicio: c.fecha_hora,
    fin: new Date(c.fecha_hora.getTime() + (c.duracion_minutos ?? duracionMinutos) * 60000),
  }))

  // El calendario es opcional: si falla, se sigue con las citas del sistema en
  // lugar de dejar al paciente sin horarios.
  try {
    if (await isGoogleCalendarConfigured()) {
      const eventos = await listCalendarEvents(inicioDia, finDia)
      for (const evento of eventos) {
        if (!evento.start?.dateTime || !evento.end?.dateTime) continue // día completo
        ocupaciones.push({
          inicio: new Date(evento.start.dateTime),
          fin: new Date(evento.end.dateTime),
        })
      }
    }
  } catch (error) {
    console.error('No se pudieron leer los eventos del calendario:', error)
  }

  return ocupaciones
}

/** Horas libres de un día concreto, en formato `HH:mm`. */
export async function obtenerHorariosDisponibles(
  fecha: string,
  ahora: Date = new Date()
): Promise<{ horarios: string[]; config: ConfigHorarios }> {
  const config = await obtenerConfig()

  const slots = generarSlotsDelDia(fecha, config)
  if (slots.length === 0) return { horarios: [], config }

  const ocupaciones = await obtenerOcupaciones(fecha, config.duracion_cita_default)
  const horarios = filtrarSlotsOcupados(fecha, slots, ocupaciones, {
    duracionMinutos: config.duracion_cita_default,
    horasAnticipacionMin: config.horas_anticipacion_min,
    ahora,
  })

  return { horarios, config }
}

/** Suma días a una fecha `YYYY-MM-DD` sin pasar por husos horarios. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Fecha de hoy en México, como `YYYY-MM-DD`. */
export function hoyEnMexico(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)
}

/**
 * Busca los próximos huecos libres explorando día a día.
 *
 * Pensado para ofrecer opciones por WhatsApp: devuelve pocas y repartidas, no
 * la agenda entera.
 */
export async function buscarProximosSlots(
  opciones: { diasAExplorar?: number; maximo?: number; ahora?: Date } = {}
): Promise<SlotDisponible[]> {
  const { diasAExplorar = 14, maximo = 3, ahora = new Date() } = opciones

  const config = await obtenerConfig()
  const limite = Math.min(diasAExplorar, config.dias_anticipacion_max)
  const candidatos: SlotDisponible[] = []
  const hoy = hoyEnMexico(ahora)

  for (let i = 0; i <= limite; i++) {
    const fecha = sumarDias(hoy, i)
    if (!esDiaLaboral(fecha, config)) continue

    const { horarios } = await obtenerHorariosDisponibles(fecha, ahora)
    for (const hora of horarios) candidatos.push({ fecha, hora })

    // Con varios días cubiertos ya hay material de sobra para elegir opciones
    // variadas; seguir consultando solo añadiría carga.
    const diasConHuecos = new Set(candidatos.map((c) => c.fecha)).size
    if (diasConHuecos >= maximo + 1) break
  }

  return elegirSlotsVariados(candidatos, maximo)
}
