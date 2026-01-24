import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Fecha de hoy (inicio y fin del día)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const mañana = new Date(hoy)
    mañana.setDate(mañana.getDate() + 1)

    // Inicio del mes
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
    })
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error)
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}
