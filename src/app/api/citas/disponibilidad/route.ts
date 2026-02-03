import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { listCalendarEvents, isGoogleCalendarConfigured } from '@/lib/services/google-calendar'

/**
 * GET /api/citas/disponibilidad?fecha=YYYY-MM-DD
 * Retorna los horarios disponibles para una fecha específica
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fechaParam = searchParams.get('fecha')

    if (!fechaParam) {
      return NextResponse.json(
        { error: 'Parámetro fecha es requerido (formato: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Parsear fecha (YYYY-MM-DD)
    const [year, month, day] = fechaParam.split('-').map(Number)
    if (!year || !month || !day) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido (debe ser YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Crear fecha en hora local (no UTC)
    const fechaSolicitada = new Date(year, month - 1, day, 0, 0, 0, 0)

    // Obtener configuración
    let config = await prisma.configuracionGeneral.findFirst()
    if (!config) {
      // Crear configuración por defecto si no existe
      config = await prisma.configuracionGeneral.create({
        data: {
          horario_inicio: '16:00',
          horario_fin: '20:00',
          duracion_cita_default: 60,
          intervalo_entre_citas: 0,
          dias_laborales: '1,2,3,4,5', // Lun-Vie
          citas_simultaneas_max: 1,
          dias_anticipacion_max: 30,
          horas_anticipacion_min: 24,
        },
      })
    }

    // Validar que la fecha no sea pasada
    const ahora = new Date()

    // Validar que sea día laboral
    const diaSemana = fechaSolicitada.getDay()
    const diasLaborales = config.dias_laborales.split(',').map((d) => parseInt(d))

    // Determinar qué horarios usar según el día
    let horarioInicio = config.horario_inicio
    let horarioFin = config.horario_fin

    if (diaSemana === 6 && config.horario_sabado_inicio && config.horario_sabado_fin) {
      horarioInicio = config.horario_sabado_inicio
      horarioFin = config.horario_sabado_fin
    }

    if (fechaSolicitada < new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())) {
      return NextResponse.json({
        fecha: fechaParam,
        horarios: [],
        configuracion: {
          duracion_minutos: config.duracion_cita_default,
          horario_inicio: horarioInicio,
          horario_fin: horarioFin,
        },
      })
    }

    // Validar anticipación máxima
    const diasAnticipacion = Math.ceil(
      (fechaSolicitada.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diasAnticipacion > config.dias_anticipacion_max) {
      return NextResponse.json(
        {
          error: `Solo se pueden agendar citas con máximo ${config.dias_anticipacion_max} días de anticipación`,
        },
        { status: 400 }
      )
    }

    if (!diasLaborales.includes(diaSemana)) {
      return NextResponse.json({
        fecha: fechaParam,
        horarios: [],
        configuracion: {
          duracion_minutos: config.duracion_cita_default,
          horario_inicio: horarioInicio,
          horario_fin: horarioFin,
        },
      })
    }

    // Generar slots de tiempo
    const [horaInicio, minInicio] = horarioInicio.split(':').map(Number)
    const [horaFin, minFin] = horarioFin.split(':').map(Number)

    const minutosInicio = horaInicio! * 60 + minInicio!
    const minutosFin = horaFin! * 60 + minFin!
    const duracionTotal = config.duracion_cita_default // Sin intervalo entre citas (0 minutos)

    const slots: string[] = []
    // Permitir que la última cita inicie exactamente a la hora de fin
    for (let minutos = minutosInicio; minutos <= minutosFin; minutos += duracionTotal) {
      const hora = Math.floor(minutos / 60)
      const min = minutos % 60
      const horaStr = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      slots.push(horaStr)
    }

    // Obtener citas existentes para esa fecha
    // Crear fechas para inicio y fin del día en hora local
    const inicioDia = new Date(year, month - 1, day, 0, 0, 0, 0)
    const finDia = new Date(year, month - 1, day, 23, 59, 59, 999)

    const citasExistentes = await prisma.cita.findMany({
      where: {
        fecha_hora: {
          gte: inicioDia,
          lte: finDia,
        },
        estado: {
          not: 'CANCELADA',
        },
      },
      select: {
        fecha_hora: true,
        duracion_minutos: true,
      },
    })

    // Obtener eventos de Google Calendar si está configurado
    let eventosCalendar: Array<{ inicio: Date; fin: Date }> = []
    try {
      const isConfigured = await isGoogleCalendarConfigured()
      if (isConfigured) {
        const eventos = await listCalendarEvents(inicioDia, finDia)
        eventosCalendar = eventos
          .filter((evento: any) => {
            // Filtrar solo eventos con fecha/hora (no eventos de día completo)
            return evento.start?.dateTime && evento.end?.dateTime
          })
          .map((evento: any) => {
            // Convertir a Date (estos vienen en UTC)
            const inicioUTC = new Date(evento.start.dateTime)
            const finUTC = new Date(evento.end.dateTime)

            return {
              inicio: inicioUTC,
              fin: finUTC,
            }
          })

        console.log(`📅 ${eventosCalendar.length} eventos de Google Calendar para ${fechaParam}:`)
        eventosCalendar.forEach((evento, i) => {
          console.log(
            `  ${i + 1}. UTC: ${evento.inicio.toISOString()} - ${evento.fin.toISOString()}`
          )
          console.log(
            `      Local: ${evento.inicio.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} - ${evento.fin.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`
          )
        })
      }
    } catch (calendarError) {
      console.error('Error al obtener eventos de Google Calendar:', calendarError)
      // Continuar sin eventos de Google Calendar si hay error
    }

    // Filtrar slots ocupados
    const horariosDisponibles = slots.filter((slot) => {
      const [hora, min] = slot.split(':').map(Number)

      // IMPORTANTE: Crear fechas en UTC para comparación consistente
      // Los eventos de Google Calendar vienen en UTC, así que trabajamos todo en UTC

      // Convertir hora local de México (UTC-6) a UTC
      // Ejemplo: 17:00 hora local México = 23:00 UTC
      const offsetMexico = 6 // UTC-6
      const horaUTC = hora! + offsetMexico

      // Crear fecha del slot en UTC
      const fechaSlotUTC = new Date(Date.UTC(year!, month! - 1, day!, horaUTC, min!, 0, 0))
      const finSlotUTC = new Date(fechaSlotUTC.getTime() + config.duracion_cita_default * 60000)

      // Para validaciones en hora local
      const fechaSlotLocal = new Date(year, month - 1, day, hora, min, 0, 0)

      // Validar anticipación mínima (solo para hoy)
      if (fechaSolicitada.toDateString() === ahora.toDateString()) {
        const horasHastaSlot = (fechaSlotLocal.getTime() - ahora.getTime()) / (1000 * 60 * 60)
        if (horasHastaSlot < config.horas_anticipacion_min) {
          return false
        }
      }

      // Verificar solapamiento con eventos de Google Calendar
      const hayEventoEnSlot = eventosCalendar.some((evento) => {
        // Comparar timestamps en UTC
        const condicion1 = fechaSlotUTC >= evento.inicio && fechaSlotUTC < evento.fin
        const condicion2 = finSlotUTC > evento.inicio && finSlotUTC <= evento.fin
        const condicion3 = fechaSlotUTC <= evento.inicio && finSlotUTC >= evento.fin
        const solapa = condicion1 || condicion2 || condicion3

        if (solapa) {
          console.log(`❌ Slot ${slot} bloqueado por evento de Google Calendar`)
        }

        return solapa
      })

      if (slot === '17:00') {
        console.log(
          `   Resultado final para 17:00: ${hayEventoEnSlot ? 'BLOQUEADO' : 'DISPONIBLE'}`
        )
      }

      // Si hay un evento de Google Calendar, el slot no está disponible
      if (hayEventoEnSlot) {
        return false
      }

      // Contar citas en este slot (usar fechaSlotLocal para citas del sistema)
      const citasEnSlot = citasExistentes.filter((cita) => {
        const inicioCita = new Date(cita.fecha_hora)
        const finCita = new Date(inicioCita.getTime() + cita.duracion_minutos * 60000)

        // Verificar solapamiento (las citas del sistema están en hora local)
        const solapaCita =
          (fechaSlotLocal >= inicioCita && fechaSlotLocal < finCita) ||
          (fechaSlotLocal.getTime() + config.duracion_cita_default * 60000 > inicioCita.getTime() &&
            fechaSlotLocal.getTime() + config.duracion_cita_default * 60000 <= finCita.getTime()) ||
          (fechaSlotLocal <= inicioCita &&
            new Date(fechaSlotLocal.getTime() + config.duracion_cita_default * 60000) >= finCita)

        if (slot === '17:00' && solapaCita) {
          console.log(`   ⚠️ Slot 17:00 bloqueado por CITA del sistema:`)
          console.log(`      Cita: ${inicioCita.toISOString()} - ${finCita.toISOString()}`)
          console.log(
            `      Slot: ${fechaSlotLocal.toISOString()} - ${new Date(fechaSlotLocal.getTime() + config.duracion_cita_default * 60000).toISOString()}`
          )
        }

        return solapaCita
      })

      const CITAS_SIMULTANEAS_MAX = 1 // Solo 1 cita a la vez

      if (slot === '17:00') {
        console.log(
          `   Citas en slot 17:00: ${citasEnSlot.length} (máximo: ${CITAS_SIMULTANEAS_MAX})`
        )
        console.log(
          `   DECISION FINAL: ${citasEnSlot.length < CITAS_SIMULTANEAS_MAX ? 'DISPONIBLE' : 'BLOQUEADO POR CITAS'}`
        )
      }

      return citasEnSlot.length < CITAS_SIMULTANEAS_MAX
    })

    console.log(
      `✅ Horarios disponibles para ${fechaParam}: ${horariosDisponibles.length} de ${slots.length} slots`
    )

    return NextResponse.json({
      fecha: fechaParam,
      horarios: horariosDisponibles,
      configuracion: {
        duracion_minutos: config.duracion_cita_default,
        horario_inicio: horarioInicio,
        horario_fin: horarioFin,
      },
    })
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    return NextResponse.json({ error: 'Error al obtener disponibilidad' }, { status: 500 })
  }
}
