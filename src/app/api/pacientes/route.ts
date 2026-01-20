import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getCache, setCache, deleteCachePattern, CacheKeys } from '@/lib/redis'
import { normalizarTelefonoMexico } from '@/lib/utils/phone'

// Schema de validación para crear/actualizar paciente
const pacienteSchema = z.object({
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

// GET /api/pacientes - Listar pacientes con búsqueda y paginación (con caché)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Generar clave de caché
    const cacheKey = CacheKeys.patientsList(page, limit, search, sortBy, sortOrder)

    // Intentar obtener del caché
    const cached = await getCache<any>(cacheKey)
    if (cached) {
      console.log('✅ Cache HIT: patients list')
      return NextResponse.json(cached)
    }

    console.log('❌ Cache MISS: patients list')

    const skip = (page - 1) * limit

    // Construir filtros de búsqueda
    const where = search
      ? {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { telefono: { contains: search } },
          ],
        }
      : {}

    // Obtener pacientes con paginación
    const [pacientes, total] = await Promise.all([
      prisma.paciente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              citas: true,
              consultas: true,
            },
          },
        },
      }),
      prisma.paciente.count({ where }),
    ])

    const response = {
      pacientes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Guardar en caché (2 minutos para listas)
    await setCache(cacheKey, response, 120)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error al obtener pacientes:', error)
    return NextResponse.json(
      { error: 'Error al obtener pacientes' },
      { status: 500 }
    )
  }
}

// POST /api/pacientes - Crear nuevo paciente
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = pacienteSchema.parse(body)

    // Verificar que el email y teléfono no existan
    const existingEmail = await prisma.paciente.findUnique({
      where: { email: validatedData.email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Ya existe un paciente con este email' },
        { status: 400 }
      )
    }

    const existingPhone = await prisma.paciente.findUnique({
      where: { telefono: validatedData.telefono },
    })

    if (existingPhone) {
      return NextResponse.json(
        { error: 'Ya existe un paciente con este teléfono' },
        { status: 400 }
      )
    }

    // Crear paciente
    const paciente = await prisma.paciente.create({
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

    // Invalidar caché de lista de pacientes
    await deleteCachePattern('patients:list:*')
    console.log('🗑️  Cache invalidated: patients list')

    return NextResponse.json(paciente, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear paciente:', error)
    return NextResponse.json(
      { error: 'Error al crear paciente' },
      { status: 500 }
    )
  }
}
