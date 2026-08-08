import { NextRequest, NextResponse } from 'next/server'
import {
  obtenerHorariosDisponibles,
  horarioDelDia,
  hoyEnMexico,
  CONFIG_POR_DEFECTO,
} from '@/lib/services/disponibilidad'

/**
 * GET /api/citas/disponibilidad?fecha=YYYY-MM-DD
 * Horarios libres de un día.
 *
 * El cálculo vive en `@/lib/services/disponibilidad` para poder reutilizarlo
 * desde el servidor (el asistente de WhatsApp también propone horarios) y, sobre
 * todo, para poder probarlo: aquí dentro arrastraba un error de zona horaria que
 * solo se manifestaba en producción.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')

    if (!fecha) {
      return NextResponse.json(
        { error: 'Parámetro fecha es requerido (formato: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido (debe ser YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Una fecha ya pasada no tiene huecos, pero no es un error: se responde con
    // la lista vacía para que el calendario la pinte sin disponibilidad.
    if (fecha < hoyEnMexico()) {
      const horario = horarioDelDia(fecha, CONFIG_POR_DEFECTO)
      return NextResponse.json({
        fecha,
        horarios: [],
        configuracion: {
          duracion_minutos: CONFIG_POR_DEFECTO.duracion_cita_default,
          horario_inicio: horario.inicio,
          horario_fin: horario.fin,
        },
      })
    }

    const { horarios, config } = await obtenerHorariosDisponibles(fecha)
    const horario = horarioDelDia(fecha, config)

    return NextResponse.json({
      fecha,
      horarios,
      configuracion: {
        duracion_minutos: config.duracion_cita_default,
        horario_inicio: horario.inicio,
        horario_fin: horario.fin,
      },
    })
  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)
    return NextResponse.json({ error: 'Error al obtener disponibilidad' }, { status: 500 })
  }
}
