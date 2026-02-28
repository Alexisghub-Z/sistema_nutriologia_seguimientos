import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import path from 'path'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getCache, setCache, deleteCache, deleteCachePattern, CacheKeys } from '@/lib/redis'
import { normalizarTelefonoMexico } from '@/lib/utils/phone'
import { cancelarJobsCita, cancelarJobsSeguimiento } from '@/lib/queue/messages'
import { unsyncCitaFromGoogleCalendar } from '@/lib/services/google-calendar'

// Schema de validación para actualizar paciente
const pacienteUpdateSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z
    .string()
    .regex(/^\d{10}$/, 'El teléfono debe tener exactamente 10 dígitos')
    .transform((val) => normalizarTelefonoMexico(val)),
  fecha_nacimiento: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime()) && parsed < new Date()
  }, 'Fecha de nacimiento inválida'),
})

// GET /api/pacientes/[id] - Obtener un paciente específico (con caché)
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Await params (Next.js 15)
    const { id } = await context.params

    // Generar clave de caché
    const cacheKey = CacheKeys.patientDetail(id)

    // Intentar obtener del caché
    const cached = await getCache<any>(cacheKey)
    if (cached) {
      console.log('✅ Cache HIT: patient detail', id)
      return NextResponse.json(cached)
    }

    console.log('❌ Cache MISS: patient detail', id)

    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        citas: {
          orderBy: { fecha_hora: 'desc' },
        },
        consultas: {
          orderBy: { fecha: 'desc' },
          select: {
            id: true,
            fecha: true,
            motivo: true,
            peso: true,
            talla: true,
            imc: true,
            grasa_corporal: true,
            masa_muscular_kg: true,
            diagnostico: true,
            objetivo: true,
            proxima_cita: true,
            seguimiento_programado: true,
            tipo_seguimiento: true,
          },
        },
        _count: {
          select: {
            citas: {
              where: {
                estado: 'COMPLETADA',
              },
            },
            consultas: true,
            mensajes: true,
          },
        },
      },
    })

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    // Guardar en caché (5 minutos para detalles)
    await setCache(cacheKey, paciente, 300)

    return NextResponse.json(paciente)
  } catch (error) {
    console.error('Error al obtener paciente:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener paciente', details: errorMessage },
      { status: 500 }
    )
  }
}

// PUT /api/pacientes/[id] - Actualizar paciente
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Await params (Next.js 15)
    const { id } = await context.params

    const body = await request.json()
    const validatedData = pacienteUpdateSchema.parse(body)

    // Verificar que el paciente existe
    const existingPaciente = await prisma.paciente.findUnique({
      where: { id },
    })

    if (!existingPaciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    // Verificar que el email no esté en uso por otro paciente
    if (validatedData.email !== existingPaciente.email) {
      const emailInUse = await prisma.paciente.findUnique({
        where: { email: validatedData.email },
      })

      if (emailInUse) {
        return NextResponse.json({ error: 'Ya existe un paciente con este email' }, { status: 400 })
      }
    }

    // Verificar que el teléfono no esté en uso por otro paciente
    if (validatedData.telefono !== existingPaciente.telefono) {
      const phoneInUse = await prisma.paciente.findUnique({
        where: { telefono: validatedData.telefono },
      })

      if (phoneInUse) {
        return NextResponse.json(
          { error: 'Ya existe un paciente con este teléfono' },
          { status: 400 }
        )
      }
    }

    // Si cambió el teléfono, buscar si existe un prospecto con el NUEVO teléfono
    if (validatedData.telefono !== existingPaciente.telefono) {
      const prospectoExistente = await prisma.prospecto.findUnique({
        where: { telefono: validatedData.telefono },
      })

      // Si existe y no está ya registrado, convertirlo
      if (prospectoExistente && prospectoExistente.estado !== 'REGISTRADO') {
        await prisma.prospecto.update({
          where: { id: prospectoExistente.id },
          data: {
            estado: 'REGISTRADO',
            convertido_a_paciente_id: id,
            fecha_conversion: new Date(),
          },
        })
        console.log(`✅ Prospecto ${prospectoExistente.id} convertido en paciente ${id}`)
      }
    }

    // Actualizar paciente
    const paciente = await prisma.paciente.update({
      where: { id },
      data: {
        nombre: validatedData.nombre,
        email: validatedData.email,
        telefono: validatedData.telefono,
        fecha_nacimiento: new Date(validatedData.fecha_nacimiento),
      },
      include: {
        _count: {
          select: {
            citas: true,
            consultas: true,
          },
        },
      },
    })

    // Invalidar caché del paciente y de la lista
    await deleteCache(CacheKeys.patientDetail(id))
    await deleteCachePattern('patients:list:*')
    console.log('🗑️  Cache invalidated: patient detail and list', id)

    return NextResponse.json(paciente)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }

    console.error('Error al actualizar paciente:', error)
    return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 })
  }
}

// DELETE /api/pacientes/[id] - Eliminar paciente (borrado completo con todas sus referencias)
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Await params (Next.js 15)
    const { id } = await context.params

    // Obtener paciente con todas sus citas y consultas (incluyendo archivos adjuntos)
    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        citas: {
          select: { id: true, google_event_id: true },
        },
        consultas: {
          select: {
            id: true,
            archivos: {
              select: { id: true, ruta_archivo: true },
            },
          },
        },
      },
    })

    if (!paciente) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
    }

    // 1. Cancelar jobs de Redis y desincronizar Google Calendar por cada cita
    for (const cita of paciente.citas) {
      await cancelarJobsCita(cita.id)

      if (cita.google_event_id) {
        try {
          await unsyncCitaFromGoogleCalendar(cita.id)
        } catch (error) {
          console.error(`Error al desincronizar cita ${cita.id} de Google Calendar:`, error)
          // No interrumpe el proceso
        }
      }
    }

    // 2. Cancelar jobs de seguimiento y eliminar archivos físicos por cada consulta
    for (const consulta of paciente.consultas) {
      await cancelarJobsSeguimiento(consulta.id)

      for (const archivo of consulta.archivos) {
        try {
          const filePath = path.join(process.cwd(), archivo.ruta_archivo)
          await unlink(filePath)
          console.log(`🗑️  Archivo eliminado: ${filePath}`)
        } catch (error) {
          console.error(`Error al eliminar archivo ${archivo.ruta_archivo}:`, error)
          // No interrumpe el proceso
        }
      }
    }

    // 3. Eliminar paciente (cascade elimina Cita, Consulta, ArchivoAdjunto, MensajeWhatsApp, ConfiguracionMensajePaciente)
    await prisma.paciente.delete({
      where: { id },
    })

    // 4. Invalidar caché del paciente y de la lista
    await deleteCache(CacheKeys.patientDetail(id))
    await deleteCachePattern('patients:list:*')
    console.log('🗑️  Cache invalidated: patient deleted', id)

    return NextResponse.json({ message: 'Paciente eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar paciente:', error)
    return NextResponse.json({ error: 'Error al eliminar paciente' }, { status: 500 })
  }
}
