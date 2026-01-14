import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

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

    // Parsear fecha
    const fechaSolicitada = new Date(fechaParam)
    if (isNaN(fechaSolicitada.getTime())) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido' },
        { status: 400 }
      )
    }

    // Obtener configuración
    let config = await prisma.configuracionGeneral.findFirst()
    if (!config) {
      // Crear configuración por defecto si no existe
      config = await prisma.configuracionGeneral.create({
        data: {
          horario_inicio: '09:00',
          horario_fin: '18:00',
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
    if (fechaSolicitada < new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())) {
      return NextResponse.json({
        fecha: fechaParam,
        horarios: [],
        configuracion: {
          duracion_minutos: config.duracion_cita_default,
          horario_inicio: config.horario_inicio,
          horario_fin: config.horario_fin,
        },
      })
    }

    // Validar anticipación máxima
    const diasAnticipacion = Math.ceil(
      (fechaSolicitada.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diasAnticipacion > config.dias_anticipacion_max) {
      return NextResponse.json(
        { error: `Solo se pueden agendar citas con máximo ${config.dias_anticipacion_max} días de anticipación` },
        { status: 400 }
      )
    }

    // Validar que sea día laboral
    const diaSemana = fechaSolicitada.getDay()
    const diasLaborales = config.dias_laborales.split(',').map(d => parseInt(d))
    if (!diasLaborales.includes(diaSemana)) {
      return NextResponse.json({
        fecha: fechaParam,
        horarios: [],
        configuracion: {
          duracion_minutos: config.duracion_cita_default,
          horario_inicio: config.horario_inicio,
          horario_fin: config.horario_fin,
        },
      })
    }

    // Generar slots de tiempo
    const [horaInicio, minInicio] = config.horario_inicio.split(':').map(Number)
    const [horaFin, minFin] = config.horario_fin.split(':').map(Number)

    const minutosInicio = horaInicio * 60 + minInicio
    const minutosFin = horaFin * 60 + minFin
    const duracionTotal = config.duracion_cita_default + config.intervalo_entre_citas

    const slots: string[] = []
    for (let minutos = minutosInicio; minutos + config.duracion_cita_default <= minutosFin; minutos += duracionTotal) {
      const hora = Math.floor(minutos / 60)
      const min = minutos % 60
      const horaStr = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      slots.push(horaStr)
    }

    // Obtener citas existentes para esa fecha
    const inicioDia = new Date(fechaSolicitada)
    inicioDia.setHours(0, 0, 0, 0)
    const finDia = new Date(fechaSolicitada)
    finDia.setHours(23, 59, 59, 999)

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

    // Filtrar slots ocupados
    const horariosDisponibles = slots.filter((slot) => {
      const [hora, min] = slot.split(':').map(Number)
      const fechaSlot = new Date(fechaSolicitada)
      fechaSlot.setHours(hora, min, 0, 0)

      // Validar anticipación mínima (solo para hoy)
      if (fechaSolicitada.toDateString() === ahora.toDateString()) {
        const horasHastaSlot = (fechaSlot.getTime() - ahora.getTime()) / (1000 * 60 * 60)
        if (horasHastaSlot < config.horas_anticipacion_min) {
          return false
        }
      }

      // Contar citas en este slot
      const citasEnSlot = citasExistentes.filter((cita) => {
        const inicioCita = new Date(cita.fecha_hora)
        const finCita = new Date(inicioCita.getTime() + cita.duracion_minutos * 60000)
        const finSlot = new Date(fechaSlot.getTime() + config.duracion_cita_default * 60000)

        // Verificar solapamiento
        return (
          (fechaSlot >= inicioCita && fechaSlot < finCita) ||
          (finSlot > inicioCita && finSlot <= finCita) ||
          (fechaSlot <= inicioCita && finSlot >= finCita)
        )
      })

      return citasEnSlot.length < config.citas_simultaneas_max
    })

    return NextResponse.json({
      fecha: fechaParam,
      horarios: horariosDisponibles,
      configuracion: {
        duracion_minutos: config.duracion_cita_default,
        horario_inicio: config.horario_inicio,
        horario_fin: config.horario_fin,
      },
    })
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    return NextResponse.json(
      { error: 'Error al obtener disponibilidad' },
      { status: 500 }
    )
  }
}
