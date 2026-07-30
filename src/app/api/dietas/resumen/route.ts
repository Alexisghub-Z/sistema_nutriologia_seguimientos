import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'

/**
 * Resumen de la sección de dietas.
 * GET /api/dietas/resumen
 *
 * Alimenta el panel que se ve al entrar a /dietas (sin paciente seleccionado):
 * métricas del trabajo hecho + las últimas dietas y los borradores por cerrar.
 */

/** Cuántas filas se muestran en cada tabla del resumen. */
const LIMITE_FILAS = 6

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Rango del mes en curso y del anterior, anclado a UTC: el servidor de
  // producción no corre en la zona de México, así que no podemos fiarnos de la
  // hora local del proceso.
  const ahora = new Date()
  const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1))
  const inicioMesAnterior = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 1, 1))
  const finMesAnterior = new Date(inicioMes.getTime() - 1)

  // Datos de paciente y cuadro que necesitan las dos tablas.
  const seleccionFila = {
    id: true,
    cuadro_id: true,
    paciente_id: true,
    modo: true,
    estado: true,
    createdAt: true,
    updatedAt: true,
    // El email permite abrir el paciente desde el resumen sin pedirlo aparte.
    paciente: { select: { nombre: true, email: true } },
    cuadro: { select: { kcal_meta: true, objetivo: true } },
  } as const

  // Ventana de 6 meses para las series (gráfica y sparklines).
  const MESES_SERIE = 6
  const inicioSerie = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - (MESES_SERIE - 1), 1)
  )

  const [
    dietasEsteMes,
    dietasMesAnterior,
    porEstado,
    totalPacientes,
    pacientesConDieta,
    promedios,
    ultimasDietas,
    borradores,
    dietasSerie,
    cuadrosSerie,
  ] = await Promise.all([
    prisma.dietaGenerada.count({ where: { createdAt: { gte: inicioMes } } }),
    prisma.dietaGenerada.count({
      where: { createdAt: { gte: inicioMesAnterior, lte: finMesAnterior } },
    }),
    prisma.dietaGenerada.groupBy({ by: ['estado'], _count: { _all: true } }),
    prisma.paciente.count(),
    prisma.paciente.count({ where: { dietas_generadas: { some: {} } } }),
    prisma.cuadroDietosintetico.aggregate({ _avg: { kcal_meta: true, imc: true } }),
    prisma.dietaGenerada.findMany({
      take: LIMITE_FILAS,
      orderBy: { createdAt: 'desc' },
      select: seleccionFila,
    }),
    prisma.dietaGenerada.findMany({
      where: { estado: 'BORRADOR' },
      take: LIMITE_FILAS,
      // Por última edición: el borrador que más interesa es el que se tocó al final.
      orderBy: { updatedAt: 'desc' },
      select: seleccionFila,
    }),
    // Series de los últimos meses, para la gráfica y los sparklines.
    prisma.dietaGenerada.findMany({
      where: { createdAt: { gte: inicioSerie } },
      select: { createdAt: true },
    }),
    prisma.cuadroDietosintetico.findMany({
      where: { createdAt: { gte: inicioSerie } },
      select: { createdAt: true, paciente_id: true },
    }),
  ])

  const finalizadas = porEstado.find((g) => g.estado === 'FINALIZADA')?._count._all ?? 0
  const enBorrador = porEstado.find((g) => g.estado === 'BORRADOR')?._count._all ?? 0

  // Variación respecto al mes anterior. Si el mes pasado no hubo dietas, no
  // mostramos porcentaje: un "+100%" partiendo de cero no dice nada útil.
  const dietasDelta =
    dietasMesAnterior > 0
      ? Math.round(((dietasEsteMes - dietasMesAnterior) / dietasMesAnterior) * 100)
      : null

  const kcalPromedio =
    promedios._avg.kcal_meta != null ? Math.round(promedios._avg.kcal_meta) : null
  const imcPromedio =
    promedios._avg.imc != null ? Math.round(promedios._avg.imc * 10) / 10 : null

  // Serie por mes. Se pre-siembran los 6 meses con ceros para que la gráfica no
  // tenga huecos cuando algún mes no tuvo actividad (mismo criterio que el
  // dashboard principal).
  const NOMBRE_MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const claveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`

  const meses = new Map<string, { label: string; dietas: number; cuadros: number }>()
  for (let i = 0; i < MESES_SERIE; i++) {
    const d = new Date(Date.UTC(inicioSerie.getUTCFullYear(), inicioSerie.getUTCMonth() + i, 1))
    meses.set(claveMes(d), { label: NOMBRE_MES[d.getUTCMonth()] ?? '', dietas: 0, cuadros: 0 })
  }
  for (const d of dietasSerie) {
    const fila = meses.get(claveMes(d.createdAt))
    if (fila) fila.dietas += 1
  }
  for (const c of cuadrosSerie) {
    const fila = meses.get(claveMes(c.createdAt))
    if (fila) fila.cuadros += 1
  }
  const serieMensual = Array.from(meses.values())

  const aFila = (d: (typeof ultimasDietas)[number]) => ({
    id: d.id,
    cuadro_id: d.cuadro_id,
    paciente_id: d.paciente_id,
    paciente: d.paciente.nombre,
    email: d.paciente.email,
    modo: d.modo,
    estado: d.estado,
    kcal_meta: Math.round(d.cuadro.kcal_meta),
    objetivo: d.cuadro.objetivo,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    // Cuánto lleva sin tocarse (solo tiene sentido para los borradores).
    dias_sin_tocar: Math.floor((Date.now() - d.updatedAt.getTime()) / 86_400_000),
  })

  return NextResponse.json(
    {
      metricas: {
        dietasEsteMes,
        dietasDelta,
        pacientesConDieta,
        totalPacientes,
        dietasFinalizadas: finalizadas,
        dietasBorrador: enBorrador,
        kcalPromedio,
        imcPromedio,
      },
      serieMensual,
      ultimasDietas: ultimasDietas.map(aFila),
      borradores: borradores.map(aFila),
    },
    { status: 200 }
  )
}
