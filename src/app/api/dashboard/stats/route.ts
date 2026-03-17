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
    const rangoParam = searchParams.get('rango') || 'mes'
    const fechaInicioParam = searchParams.get('fechaInicio')
    const fechaFinParam = searchParams.get('fechaFin')

    // Fecha de hoy (inicio y fin del día)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const mañana = new Date(hoy)
    mañana.setDate(mañana.getDate() + 1)

    // Determinar el rango de fechas según el parámetro
    let fechaInicio: Date
    let fechaFin: Date = new Date()
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

    // Hace 12 meses para tendencias (se filtra en frontend para 6/12/año)
    const hace12Meses = new Date(hoy.getFullYear(), hoy.getMonth() - 12, 1)

    // Hace 28 días para tendencia semanal de citas
    const hace28Dias = new Date()
    hace28Dias.setDate(hace28Dias.getDate() - 28)
    hace28Dias.setHours(0, 0, 0, 0)

    // Calcular período anterior (misma duración, justo antes)
    const duracionMs = fechaFin.getTime() - fechaInicio.getTime()
    const periodoAnteriorInicio = new Date(fechaInicio.getTime() - duracionMs)
    const periodoAnteriorFin = new Date(fechaInicio.getTime() - 1)

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
      // Nuevas queries para tendencias
      consultasUltimos12Meses,
      citasUltimos28Dias,
      pacientesUltimos12Meses,
      pacientesBaseline,
      consultasPeriodoAnterior,
      citasPeriodoAnterior,
      citasDelPeriodo,
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

      // Últimas 5 consultas realizadas (con estado_pago y monto)
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
          paciente_id: true,
          paciente: {
            select: {
              nombre: true,
            },
          },
        },
      }),

      // Consultas de hoy con datos financieros
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

      // --- Nuevas queries para tendencias ---

      // Consultas últimos 12 meses (para tendencia ingresos mensual)
      prisma.consulta.findMany({
        where: {
          fecha: {
            gte: hace12Meses,
          },
        },
        select: {
          fecha: true,
          monto_consulta: true,
        },
      }),

      // Citas últimos 28 días (para tendencia semanal)
      prisma.cita.findMany({
        where: {
          fecha_hora: {
            gte: hace28Dias,
          },
        },
        select: {
          fecha_hora: true,
          estado: true,
          estado_confirmacion: true,
        },
      }),

      // Pacientes últimos 12 meses (para crecimiento)
      prisma.paciente.findMany({
        where: {
          createdAt: {
            gte: hace12Meses,
          },
        },
        select: {
          createdAt: true,
        },
      }),

      // Pacientes antes de los 12 meses (baseline)
      prisma.paciente.count({
        where: {
          createdAt: {
            lt: hace12Meses,
          },
        },
      }),

      // Consultas del período anterior (para delta)
      prisma.consulta.findMany({
        where: {
          fecha: {
            gte: periodoAnteriorInicio,
            lte: periodoAnteriorFin,
          },
        },
        select: {
          monto_consulta: true,
        },
      }),

      // Citas del período anterior (para delta asistencia)
      prisma.cita.findMany({
        where: {
          fecha_hora: {
            gte: periodoAnteriorInicio,
            lte: periodoAnteriorFin,
          },
        },
        select: {
          estado: true,
        },
      }),

      // Citas del período seleccionado (para donut por período)
      prisma.cita.findMany({
        where: {
          fecha_hora: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        select: {
          estado: true,
          estado_confirmacion: true,
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
      paciente_id: cita.paciente_id,
      telefono: cita.paciente.telefono,
      fecha_hora: cita.fecha_hora,
      estado: cita.estado,
      estado_confirmacion: cita.estado_confirmacion,
      motivo_consulta: cita.motivo_consulta,
    }))

    // Formatear últimas consultas (incluir estado_pago y monto)
    const ultimasConsultasFormateadas = ultimasConsultas.map((consulta) => ({
      id: consulta.id,
      paciente: consulta.paciente.nombre,
      paciente_id: consulta.paciente_id,
      fecha: consulta.fecha,
      peso: consulta.peso,
      imc: consulta.imc,
      estado_pago: consulta.estado_pago,
      monto_consulta: consulta.monto_consulta
        ? parseFloat(consulta.monto_consulta.toString())
        : null,
    }))

    // Calcular estadísticas financieras
    const precioDefault = configuracionGeneral?.precio_consulta_default
      ? parseFloat(configuracionGeneral.precio_consulta_default.toString())
      : 500.0

    const ingresosDelRango = consultasEsteMesCompletas.reduce((total, consulta) => {
      const monto = consulta.monto_consulta
        ? parseFloat(consulta.monto_consulta.toString())
        : precioDefault
      return total + monto
    }, 0)

    const ingresosDeHoy = consultasHoyCompletas.reduce((total, consulta) => {
      const monto = consulta.monto_consulta
        ? parseFloat(consulta.monto_consulta.toString())
        : precioDefault
      return total + monto
    }, 0)

    const promedioConsulta =
      consultasEsteMesCompletas.length > 0
        ? ingresosDelRango / consultasEsteMesCompletas.length
        : 0

    const consultasPendientesArr = consultasEsteMesCompletas.filter(
      (c) => c.estado_pago === 'PENDIENTE' || c.estado_pago === 'PARCIAL'
    )
    const montosPendientes = consultasPendientesArr.reduce((total, consulta) => {
      const monto = consulta.monto_consulta
        ? parseFloat(consulta.monto_consulta.toString())
        : precioDefault
      return total + monto
    }, 0)

    const consultasPagadas = consultasEsteMesCompletas.filter((c) => c.estado_pago === 'PAGADO')
      .length

    // Lista de deudores (agrupar por paciente)
    const deudoresMap = new Map<string, { nombre: string; paciente_id: string; monto: number; consultas: number }>()
    for (const c of consultasPendientesArr) {
      const pid = c.paciente_id
      const existing = deudoresMap.get(pid)
      const monto = c.monto_consulta ? parseFloat(c.monto_consulta.toString()) : precioDefault
      if (existing) {
        existing.monto += monto
        existing.consultas++
      } else {
        deudoresMap.set(pid, {
          nombre: c.paciente.nombre,
          paciente_id: pid,
          monto,
          consultas: 1,
        })
      }
    }
    const deudores = Array.from(deudoresMap.values())
      .sort((a, b) => b.monto - a.monto)

    // --- Calcular tendencias ---

    // Tendencia ingresos mensual (últimos 6 meses)
    const mesesMap = new Map<string, { ingresos: number; consultas: number }>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      mesesMap.set(key, { ingresos: 0, consultas: 0 })
    }
    for (const c of consultasUltimos12Meses) {
      const f = new Date(c.fecha)
      const key = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`
      if (mesesMap.has(key)) {
        const entry = mesesMap.get(key)!
        entry.consultas++
        entry.ingresos += c.monto_consulta
          ? parseFloat(c.monto_consulta.toString())
          : precioDefault
      }
    }
    const tendenciaIngresosMensual = Array.from(mesesMap.entries()).map(([mes, data]) => ({
      mes,
      ingresos: Math.round(data.ingresos * 100) / 100,
      consultas: data.consultas,
    }))

    // Tendencia citas semanal (últimas 4 semanas)
    const semanasArr: Array<{ semana: string; total: number; completadas: number; canceladas: number }> = []
    for (let i = 3; i >= 0; i--) {
      const inicio = new Date(hoy)
      inicio.setDate(inicio.getDate() - (i + 1) * 7)
      inicio.setHours(0, 0, 0, 0)
      const fin = new Date(hoy)
      fin.setDate(fin.getDate() - i * 7)
      fin.setHours(0, 0, 0, 0)

      const citasSemana = citasUltimos28Dias.filter((c) => {
        const f = new Date(c.fecha_hora)
        return f >= inicio && f < fin
      })

      const label = `${inicio.getDate()}/${inicio.getMonth() + 1} - ${fin.getDate()}/${fin.getMonth() + 1}`
      semanasArr.push({
        semana: label,
        total: citasSemana.length,
        completadas: citasSemana.filter((c) => c.estado === 'COMPLETADA').length,
        canceladas: citasSemana.filter(
          (c) => c.estado === 'CANCELADA' || c.estado_confirmacion === 'CANCELADA_PACIENTE'
        ).length,
      })
    }

    // Crecimiento de pacientes (últimos 12 meses)
    let acumulado = pacientesBaseline
    const crecimientoPacientes = Array.from(mesesMap.keys()).map((mes) => {
      const [y, m] = mes.split('-').map(Number)
      const nuevos = pacientesUltimos12Meses.filter((p) => {
        const f = new Date(p.createdAt)
        return f.getFullYear() === y && f.getMonth() + 1 === m
      }).length
      acumulado += nuevos
      return { mes, nuevos, total: acumulado }
    })

    // Comparación vs período anterior
    const ingresosPeriodoAnterior = consultasPeriodoAnterior.reduce((total, c) => {
      const monto = c.monto_consulta ? parseFloat(c.monto_consulta.toString()) : precioDefault
      return total + monto
    }, 0)

    const totalCitasAnterior = citasPeriodoAnterior.length
    const citasAsistidasAnterior = citasPeriodoAnterior.filter((c) => c.estado === 'COMPLETADA').length
    const asistenciaAnterior = totalCitasAnterior > 0
      ? Math.round((citasAsistidasAnterior / totalCitasAnterior) * 100)
      : 0

    const ingresosDelta = ingresosPeriodoAnterior > 0
      ? Math.round(((ingresosDelRango - ingresosPeriodoAnterior) / ingresosPeriodoAnterior) * 100)
      : ingresosDelRango > 0 ? 100 : 0

    const consultasDelta = consultasPeriodoAnterior.length > 0
      ? Math.round(((consultasEsteMesCompletas.length - consultasPeriodoAnterior.length) / consultasPeriodoAnterior.length) * 100)
      : consultasEsteMesCompletas.length > 0 ? 100 : 0

    const asistenciaDelta = asistenciaAnterior > 0
      ? tasaAsistencia - asistenciaAnterior
      : 0

    // Conteos de citas del período seleccionado
    const citasPeriodoCompletadas = citasDelPeriodo.filter((c) => c.estado === 'COMPLETADA').length
    const citasPeriodoConfirmadas = citasDelPeriodo.filter((c) => c.estado_confirmacion === 'CONFIRMADA').length
    const citasPeriodoPendientes = citasDelPeriodo.filter(
      (c) => c.estado_confirmacion === 'PENDIENTE' || c.estado_confirmacion === 'RECORDATORIO_ENVIADO'
    ).length
    const citasPeriodoCanceladas = citasDelPeriodo.filter(
      (c) => c.estado === 'CANCELADA' || c.estado_confirmacion === 'CANCELADA_PACIENTE'
    ).length

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
      citasPeriodo: {
        total: citasDelPeriodo.length,
        completadas: citasPeriodoCompletadas,
        confirmadas: citasPeriodoConfirmadas,
        pendientes: citasPeriodoPendientes,
        canceladas: citasPeriodoCanceladas,
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
          cantidad: consultasPendientesArr.length,
          monto: Math.round(montosPendientes * 100) / 100,
          deudores,
        },
      },
      tendenciaIngresosMensual,
      tendenciaCitasSemanal: semanasArr,
      crecimientoPacientes,
      comparacion: {
        ingresosDelta,
        consultasDelta,
        asistenciaDelta,
      },
    })
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
