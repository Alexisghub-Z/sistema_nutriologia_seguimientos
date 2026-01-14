import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getCache, setCache, deleteCache, deleteCachePattern, CacheKeys } from '@/lib/redis'

// Schema de validación para actualizar paciente
const pacienteUpdateSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z
    .string()
    .min(10, 'El teléfono debe tener al menos 10 dígitos')
    .regex(/^[0-9+\-\s()]+$/, 'Formato de teléfono inválido'),
  fecha_nacimiento: z.string().refine((date) => {
    const parsed = new Date(date)
    return !isNaN(parsed.getTime()) && parsed < new Date()
  }, 'Fecha de nacimiento inválida'),
})

// GET /api/pacientes/[id] - Obtener un paciente específico (con caché)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Await params si es una Promise (Next.js 15)
    const { id } = params instanceof Promise ? await params : params

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
          take: 5,
        },
        consultas: {
          orderBy: { fecha: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            citas: true,
            consultas: true,
            mensajes: true,
          },
        },
      },
    })

    if (!paciente) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      )
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
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Await params si es una Promise (Next.js 15)
    const { id } = params instanceof Promise ? await params : params

    const body = await request.json()
    const validatedData = pacienteUpdateSchema.parse(body)

    // Verificar que el paciente existe
    const existingPaciente = await prisma.paciente.findUnique({
      where: { id },
    })

    if (!existingPaciente) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el email no esté en uso por otro paciente
    if (validatedData.email !== existingPaciente.email) {
      const emailInUse = await prisma.paciente.findUnique({
        where: { email: validatedData.email },
      })

      if (emailInUse) {
        return NextResponse.json(
          { error: 'Ya existe un paciente con este email' },
          { status: 400 }
        )
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
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al actualizar paciente:', error)
    return NextResponse.json(
      { error: 'Error al actualizar paciente' },
      { status: 500 }
    )
  }
}

// DELETE /api/pacientes/[id] - Eliminar paciente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Await params si es una Promise (Next.js 15)
    const { id } = params instanceof Promise ? await params : params

    // Verificar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            citas: true,
            consultas: true,
          },
        },
      },
    })

    if (!paciente) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si tiene citas o consultas
    if (paciente._count.citas > 0 || paciente._count.consultas > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar un paciente con citas o consultas registradas',
        },
        { status: 400 }
      )
    }

    // Eliminar paciente
    await prisma.paciente.delete({
      where: { id },
    })

    // Invalidar caché del paciente y de la lista
    await deleteCache(CacheKeys.patientDetail(id))
    await deleteCachePattern('patients:list:*')
    console.log('🗑️  Cache invalidated: patient deleted', id)

    return NextResponse.json({ message: 'Paciente eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar paciente:', error)
    return NextResponse.json(
      { error: 'Error al eliminar paciente' },
      { status: 500 }
    )
  }
}
