import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id: pacienteId } = await params

    // Obtener todas las consultas del paciente con información financiera
    const consultas = await prisma.consulta.findMany({
      where: {
        paciente_id: pacienteId,
      },
      select: {
        monto_consulta: true,
        estado_pago: true,
        fecha: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    })

    // Obtener precio default de configuración
    const configuracion = await prisma.configuracionGeneral.findFirst()
    const precioDefault = configuracion?.precio_consulta_default
      ? parseFloat(configuracion.precio_consulta_default.toString())
      : 500.0

    // Calcular estadísticas
    let totalGastado = 0
    let totalPagado = 0
    let totalPendiente = 0
    let consultasPagadas = 0
    let consultasPendientes = 0

    consultas.forEach((consulta) => {
      const monto = consulta.monto_consulta
        ? parseFloat(consulta.monto_consulta.toString())
        : precioDefault

      totalGastado += monto

      if (consulta.estado_pago === 'PAGADO') {
        totalPagado += monto
        consultasPagadas++
      } else if (consulta.estado_pago === 'PENDIENTE' || consulta.estado_pago === 'PARCIAL') {
        totalPendiente += monto
        consultasPendientes++
      } else {
        // Si no tiene estado de pago, asumimos que está pagado
        totalPagado += monto
        consultasPagadas++
      }
    })

    const promedioConsulta = consultas.length > 0 ? totalGastado / consultas.length : 0

    return NextResponse.json({
      totalConsultas: consultas.length,
      totalGastado: parseFloat(totalGastado.toFixed(2)),
      totalPagado: parseFloat(totalPagado.toFixed(2)),
      totalPendiente: parseFloat(totalPendiente.toFixed(2)),
      consultasPagadas,
      consultasPendientes,
      promedioConsulta: parseFloat(promedioConsulta.toFixed(2)),
    })
  } catch (error) {
    console.error('Error al obtener estadísticas financieras:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas financieras' },
      { status: 500 }
    )
  }
}
