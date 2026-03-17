import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    if (!desde || !hasta) {
      return NextResponse.json({ error: 'Parámetros desde y hasta requeridos' }, { status: 400 })
    }

    const fechaDesde = new Date(desde)
    fechaDesde.setHours(0, 0, 0, 0)
    const fechaHasta = new Date(hasta)
    fechaHasta.setHours(23, 59, 59, 999)

    const configuracion = await prisma.configuracionGeneral.findFirst()
    const precioDefault = configuracion?.precio_consulta_default
      ? parseFloat(configuracion.precio_consulta_default.toString())
      : 500.0

    const consultas = await prisma.consulta.findMany({
      where: {
        fecha: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      select: {
        fecha: true,
        monto_consulta: true,
      },
    })

    // Generar todos los meses del rango
    const mesesMap = new Map<string, { ingresos: number; consultas: number }>()
    const cur = new Date(fechaDesde.getFullYear(), fechaDesde.getMonth(), 1)
    const end = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), 1)
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
      mesesMap.set(key, { ingresos: 0, consultas: 0 })
      cur.setMonth(cur.getMonth() + 1)
    }

    for (const c of consultas) {
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

    const data = Array.from(mesesMap.entries()).map(([mes, d]) => ({
      mes,
      ingresos: Math.round(d.ingresos * 100) / 100,
      consultas: d.consultas,
    }))

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error al obtener ingresos mensuales:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
