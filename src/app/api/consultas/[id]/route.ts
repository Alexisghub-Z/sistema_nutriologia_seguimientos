import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { deleteCachePattern, CacheKeys, deleteCache } from '@/lib/redis'
import { cancelarJobsSeguimiento, programarSeguimiento } from '@/lib/queue/messages'

const consultaUpdateSchema = z.object({
  fecha: z
    .string()
    .refine((date) => !isNaN(new Date(date).getTime()), 'Fecha inválida')
    .optional(),

  // Mediciones básicas
  peso: z.number().min(2.5).max(600).nullable().optional(),
  talla: z.number().min(0.25).max(5).nullable().optional(),

  // Composición corporal
  grasa_corporal: z.number().min(0).max(100).nullable().optional(),
  porcentaje_agua: z.number().min(0).max(100).nullable().optional(),
  masa_muscular_kg: z.number().min(0.5).max(400).nullable().optional(),
  grasa_visceral: z.number().int().min(0).max(60).nullable().optional(),

  // Perímetros (cm)
  brazo_relajado: z.number().min(5).max(160).nullable().optional(),
  brazo_flexionado: z.number().min(5).max(180).nullable().optional(),
  cintura: z.number().min(15).max(400).nullable().optional(),
  cadera_maximo: z.number().min(30).max(400).nullable().optional(),
  muslo_maximo: z.number().min(10).max(240).nullable().optional(),
  muslo_medio: z.number().min(10).max(240).nullable().optional(),
  pantorrilla_maximo: z.number().min(10).max(160).nullable().optional(),

  // Pliegues cutáneos (mm)
  pliegue_tricipital: z.number().min(0.5).max(120).nullable().optional(),
  pliegue_subescapular: z.number().min(0.5).max(120).nullable().optional(),
  pliegue_bicipital: z.number().min(0.5).max(120).nullable().optional(),
  pliegue_cresta_iliaca: z.number().min(0.5).max(120).nullable().optional(),
  pliegue_supraespinal: z.number().min(0.5).max(120).nullable().optional(),
  pliegue_abdominal: z.number().min(0.5).max(120).nullable().optional(),

  // Notas clínicas
  notas: z.string().nullable().optional(),
  diagnostico: z.string().nullable().optional(),
  objetivo: z.string().nullable().optional(),
  plan: z.string().nullable().optional(),
  observaciones: z.string().nullable().optional(),

  // Próxima cita
  proxima_cita: z.string().nullable().optional(),

  // Información financiera
  monto_consulta: z.number().positive().nullable().optional(),
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO']).nullable().optional(),
  estado_pago: z.enum(['PAGADO', 'PENDIENTE', 'PARCIAL']).nullable().optional(),
  notas_pago: z.string().nullable().optional(),
})

// PATCH /api/consultas/[id] - Actualizar consulta existente
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const body = await request.json()
    const result = consultaUpdateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: result.error.errors }, { status: 400 })
    }

    const validatedData = result.data

    // Verificar que la consulta existe
    const existingConsulta = await prisma.consulta.findUnique({
      where: { id },
      select: {
        id: true,
        paciente_id: true,
        peso: true,
        talla: true,
        proxima_cita: true,
        seguimiento_programado: true,
        tipo_seguimiento: true,
      },
    })

    if (!existingConsulta) {
      return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 })
    }

    // Recalcular IMC: usar los valores enviados si existen, si no usar los guardados en DB
    const pesoFinal =
      validatedData.peso !== undefined ? validatedData.peso : existingConsulta.peso
    const tallaFinal =
      validatedData.talla !== undefined ? validatedData.talla : existingConsulta.talla

    let imc: number | null = null
    if (pesoFinal && tallaFinal) {
      imc = Math.round((pesoFinal / (tallaFinal * tallaFinal)) * 10) / 10
    }

    // Construir objeto de actualización solo con campos presentes
    const updateData: Record<string, unknown> = { imc }

    if (validatedData.fecha !== undefined) {
      // Mediodía UTC para evitar desplazamiento de día por zona horaria
      updateData.fecha = new Date(`${validatedData.fecha}T12:00:00.000Z`)
    }
    if (validatedData.peso !== undefined) updateData.peso = validatedData.peso
    if (validatedData.talla !== undefined) updateData.talla = validatedData.talla
    if (validatedData.grasa_corporal !== undefined) updateData.grasa_corporal = validatedData.grasa_corporal
    if (validatedData.porcentaje_agua !== undefined) updateData.porcentaje_agua = validatedData.porcentaje_agua
    if (validatedData.masa_muscular_kg !== undefined) updateData.masa_muscular_kg = validatedData.masa_muscular_kg
    if (validatedData.grasa_visceral !== undefined) updateData.grasa_visceral = validatedData.grasa_visceral
    if (validatedData.brazo_relajado !== undefined) updateData.brazo_relajado = validatedData.brazo_relajado
    if (validatedData.brazo_flexionado !== undefined) updateData.brazo_flexionado = validatedData.brazo_flexionado
    if (validatedData.cintura !== undefined) updateData.cintura = validatedData.cintura
    if (validatedData.cadera_maximo !== undefined) updateData.cadera_maximo = validatedData.cadera_maximo
    if (validatedData.muslo_maximo !== undefined) updateData.muslo_maximo = validatedData.muslo_maximo
    if (validatedData.muslo_medio !== undefined) updateData.muslo_medio = validatedData.muslo_medio
    if (validatedData.pantorrilla_maximo !== undefined) updateData.pantorrilla_maximo = validatedData.pantorrilla_maximo
    if (validatedData.pliegue_tricipital !== undefined) updateData.pliegue_tricipital = validatedData.pliegue_tricipital
    if (validatedData.pliegue_subescapular !== undefined) updateData.pliegue_subescapular = validatedData.pliegue_subescapular
    if (validatedData.pliegue_bicipital !== undefined) updateData.pliegue_bicipital = validatedData.pliegue_bicipital
    if (validatedData.pliegue_cresta_iliaca !== undefined) updateData.pliegue_cresta_iliaca = validatedData.pliegue_cresta_iliaca
    if (validatedData.pliegue_supraespinal !== undefined) updateData.pliegue_supraespinal = validatedData.pliegue_supraespinal
    if (validatedData.pliegue_abdominal !== undefined) updateData.pliegue_abdominal = validatedData.pliegue_abdominal
    if (validatedData.notas !== undefined) updateData.notas = validatedData.notas
    if (validatedData.diagnostico !== undefined) updateData.diagnostico = validatedData.diagnostico
    if (validatedData.objetivo !== undefined) updateData.objetivo = validatedData.objetivo
    if (validatedData.plan !== undefined) updateData.plan = validatedData.plan
    if (validatedData.observaciones !== undefined) updateData.observaciones = validatedData.observaciones
    if (validatedData.proxima_cita !== undefined) {
      // Parsear como mediodía UTC para evitar desplazamiento de día por zona horaria
      updateData.proxima_cita = validatedData.proxima_cita
        ? new Date(`${validatedData.proxima_cita}T12:00:00.000Z`)
        : null
    }
    if (validatedData.monto_consulta !== undefined) updateData.monto_consulta = validatedData.monto_consulta
    if (validatedData.metodo_pago !== undefined) updateData.metodo_pago = validatedData.metodo_pago
    if (validatedData.estado_pago !== undefined) updateData.estado_pago = validatedData.estado_pago
    if (validatedData.notas_pago !== undefined) updateData.notas_pago = validatedData.notas_pago

    const consulta = await prisma.consulta.update({
      where: { id },
      data: updateData,
      include: { archivos: true },
    })

    // Si cambia proxima_cita y hay seguimiento activo, reprogramar los jobs
    if (validatedData.proxima_cita !== undefined && existingConsulta.seguimiento_programado) {
      const nuevaFecha = validatedData.proxima_cita
        ? new Date(`${validatedData.proxima_cita}T12:00:00.000Z`)
        : null

      // Cancelar jobs actuales
      await cancelarJobsSeguimiento(id)

      if (nuevaFecha && nuevaFecha > new Date()) {
        // Reprogramar con la nueva fecha y el mismo tipo de seguimiento
        const tipoSeguimiento = existingConsulta.tipo_seguimiento ?? 'SOLO_RECORDATORIO'
        await programarSeguimiento(id, nuevaFecha, tipoSeguimiento)
        console.log(`[Queue] Seguimiento reprogramado para consulta ${id} con nueva fecha: ${nuevaFecha.toISOString()}`)
      } else {
        // La nueva fecha es nula o ya pasó: dejar el seguimiento como cancelado
        await prisma.consulta.update({
          where: { id },
          data: { seguimiento_programado: false, tipo_seguimiento: null },
        })
        console.log(`[Queue] Seguimiento cancelado para consulta ${id} (fecha nula o pasada)`)
      }
    }

    // Invalidar caché de consultas del paciente y detalle del paciente
    await deleteCachePattern(`consultations:${existingConsulta.paciente_id}:*`)
    await deleteCache(CacheKeys.patientDetail(existingConsulta.paciente_id))
    console.log('🗑️  Cache invalidated: consultations and patient detail after update', id)

    return NextResponse.json(consulta)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error al actualizar consulta:', error)
    return NextResponse.json({ error: 'Error al actualizar consulta' }, { status: 500 })
  }
}
