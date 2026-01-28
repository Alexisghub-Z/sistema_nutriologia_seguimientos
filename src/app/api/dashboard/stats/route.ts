import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros de fecha del query string
    const { searchParams } = new URL(request.url)
    const rangoParam = searchParams.get('rango') || 'mes' // mes, semana, hoy, personalizado
    const fechaInicioParam = searchParams.get('fechaInicio')
    const fechaFinParam = searchParams.get('fechaFin')

    // Fecha de hoy (inicio y fin del día)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const mañana = new Date(hoy)
    mañana.setDate(mañana.getDate() + 1)

    // Determinar el rango de fechas según el parámetro
    let fechaInicio: Date
    let fechaFin: Date = new Date() // Fin es siempre ahora
    fechaFin.setHours(23, 59, 59, 999)

    switch (rangoParam) {
      case 'hoy':
        fechaInicio = new Date(hoy)
        fechaFin = new Date(mañana)
        fechaFin.setMilliseconds(-1)
        break
      case 'semana':
        fechaInicio = new Date()
        fechaInicio.setDate(fechaInicio.getDate() - 7)
        fechaInicio.setHours(0, 0, 0, 0)
        break
      case 'mes':
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        break
      case 'trimestre':
        fechaInicio = new Date()
        fechaInicio.setMonth(fechaInicio.getMonth() - 3)
        fechaInicio.setHours(0, 0, 0, 0)
        break
      case 'anio':
        fechaInicio = new Date(hoy.getFullYear(), 0, 1)
        break
      case 'personalizado':
        if (fechaInicioParam && fechaFinParam) {
          fechaInicio = new Date(fechaInicioParam)
          fechaInicio.setHours(0, 0, 0, 0)
          fechaFin = new Date(fechaFinParam)
          fechaFin.setHours(23, 59, 59, 999)
        } else {
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        }
        break
      default:
        fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    }

    // Inicio del mes (para estadísticas que siempre son del mes)
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

    // Hace 30 días para tasa de asistencia
    const hace30Dias = new Date()
    hace30Dias.setDate(hace30Dias.getDate() - 30)

    // Ejecutar todas las queries en paralelo
    const [
      totalPacientes,
      citasHoy,
      consultasEsteMes,
      citasUltimos30Dias,
      mensajesPendientes,
      ultimasConsultas,
      configuracionGeneral,
      consultasEsteMesCompletas,
      consultasHoyCompletas,
    ] = await Promise.all([
      // Total de pacientes
      prisma.paciente.count(),

      // Citas de hoy con detalles
      prisma.cita.findMany({
        where: {
          fecha_hora: {
            gte: hoy,
            lt: mañana,
          },
        },
        include: {
          paciente: {
            select: {
              nombre: true,
              telefono: true,
            },
          },
        },
        orderBy: {
          fecha_hora: 'asc',
        },
      }),

      // Consultas este mes
      prisma.consulta.count({
        where: {
          fecha: {
            gte: inicioMes,
          },
        },
      }),

      // Citas de los últimos 30 días para calcular asistencia
      prisma.cita.findMany({
        where: {
          fecha_hora: {
            gte: hace30Dias,
            lt: hoy,
          },
        },
        select: {
          estado: true,
        },
      }),

      // Citas pendientes de confirmación (próximos 7 días)
      prisma.cita.count({
        where: {
          estado_confirmacion: 'PENDIENTE',
          fecha_hora: {
            gte: hoy,
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Últimas 5 consultas realizadas
      prisma.consulta.findMany({
        take: 5,
        orderBy: {
          fecha: 'desc',
        },
        include: {
          paciente: {
            select: {
              nombre: true,
            },
          },
        },
      }),

      // Configuración general (para obtener precio default)
      prisma.configuracionGeneral.findFirst(),

      // Consultas del rango seleccionado con datos financieros
      prisma.consulta.findMany({
        where: {
          fecha: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        select: {
          id: true,
          monto_consulta: true,
          estado_pago: true,
          fecha: true,
        },
      }),

      // Consultas de hoy con datos financieros (siempre mostrar)
      prisma.consulta.findMany({
        where: {
          fecha: {
            gte: hoy,
            lt: mañana,
          },
        },
        select: {
          id: true,
          monto_consulta: true,
          estado_pago: true,
        },
      }),
    ])

    // Calcular estadísticas de citas de hoy
    const citasConfirmadas = citasHoy.filter((c) => c.estado_confirmacion === 'CONFIRMADA').length
    const citasPendientes = citasHoy.filter(
      (c) =>
        c.estado_confirmacion === 'PENDIENTE' || c.estado_confirmacion === 'RECORDATORIO_ENVIADO'
    ).length
    const citasCompletadas = citasHoy.filter((c) => c.estado === 'COMPLETADA').length
    const citasCanceladas = citasHoy.filter(
      (c) => c.estado === 'CANCELADA' || c.estado_confirmacion === 'CANCELADA_PACIENTE'
    ).length

    // Calcular tasa de asistencia (últimos 30 días)
    const totalCitasPasadas = citasUltimos30Dias.length
    const citasAsistidas = citasUltimos30Dias.filter((c) => c.estado === 'COMPLETADA').length
    const tasaAsistencia =
      totalCitasPasadas > 0 ? Math.round((citasAsistidas / totalCitasPasadas) * 100) : 0

    // Formatear citas de hoy para el frontend
    const citasHoyFormateadas = citasHoy.map((cita) => ({
      id: cita.id,
      paciente: cita.paciente.nombre,
      telefono: cita.paciente.telefono,
      fecha_hora: cita.fecha_hora,
      estado: cita.estado,
      estado_confirmacion: cita.estado_confirmacion,
      motivo_consulta: cita.motivo_consulta,
    }))

    // Formatear últimas consultas
    const ultimasConsultasFormateadas = ultimasConsultas.map((consulta) => ({
      id: consulta.id,
      paciente: consulta.paciente.nombre,
      paciente_id: consulta.paciente_id,
      fecha: consulta.fecha,
      peso: consulta.peso,
      imc: consulta.imc,
    }))

    // Calcular estadísticas financieras
    const precioDefault = configuracionGeneral?.precio_consulta_default
      ? parseFloat(configuracionGeneral.precio_consulta_default.toString())
      : 500.0

    // Ingresos del rango seleccionado
    const ingresosDelRango = consultasEsteMesCompletas.reduce((total, consulta) => {
      const monto = consulta.monto_consulta
        ? parseFloat(consulta.monto_consulta.toString())
        : precioDefault
      return total + monto
    }, 0)

    // Ingresos de hoy
    const ingresosDeHoy = consultasHoyCompletas.reduce((total, consulta) => {
      const monto = consulta.monto_consulta
        ? parseFloat(consulta.monto_consulta.toString())
        : precioDefault
      return total + monto
    }, 0)

    // Promedio por consulta en el rango
    const promedioConsulta =
      consultasEsteMesCompletas.length > 0
        ? ingresosDelRango / consultasEsteMesCompletas.length
        : 0

    // Pagos pendientes en el rango
    const consultasPendientes = consultasEsteMesCompletas.filter(
      (c) => c.estado_pago === 'PENDIENTE' || c.estado_pago === 'PARCIAL'
    )
    const montosPendientes = consultasPendientes.reduce((total, consulta) => {
      const monto = consulta.monto_consulta
        ? parseFloat(consulta.monto_consulta.toString())
        : precioDefault
      return total + monto
    }, 0)

    // Contar consultas por estado de pago
    const consultasPagadas = consultasEsteMesCompletas.filter((c) => c.estado_pago === 'PAGADO')
      .length

    return NextResponse.json({
      totalPacientes,
      citasHoy: {
        total: citasHoy.length,
        confirmadas: citasConfirmadas,
        pendientes: citasPendientes,
        completadas: citasCompletadas,
        canceladas: citasCanceladas,
        detalles: citasHoyFormateadas,
      },
      consultasEsteMes,
      tasaAsistencia,
      mensajesPendientes,
      ultimasConsultas: ultimasConsultasFormateadas,
      finanzas: {
        rango: rangoParam,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        totalConsultas: consultasEsteMesCompletas.length,
        ingresosDelRango: Math.round(ingresosDelRango * 100) / 100,
        ingresosDeHoy: Math.round(ingresosDeHoy * 100) / 100,
        promedioConsulta: Math.round(promedioConsulta * 100) / 100,
        consultasPagadas,
        pagosPendientes: {
          cantidad: consultasPendientes.length,
          monto: Math.round(montosPendientes * 100) / 100,
        },
      },
    })
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
