import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { getCache, setCache, deleteCachePattern, CacheKeys } from '@/lib/redis'
import { sendWhatsAppMessage, isTwilioConfigured } from '@/lib/services/twilio'

// Schema de validación para enviar mensaje
const mensajeSchema = z.object({
  paciente_id: z.string().min(1, 'ID de paciente requerido'),
  contenido: z.string().min(1, 'El contenido no puede estar vacío'),
  tipo: z.enum(['AUTOMATICO_CONFIRMACION', 'AUTOMATICO_RECORDATORIO', 'AUTOMATICO_SEGUIMIENTO', 'MANUAL']).default('MANUAL'),
})

// GET /api/mensajes - Listar conversaciones con el último mensaje de cada paciente
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const paciente_id = searchParams.get('paciente_id')

    // Si se solicita mensajes de un paciente específico
    if (paciente_id) {
      const cacheKey = CacheKeys.messagesList(paciente_id)

      // Intentar obtener del caché
      const cached = await getCache<any>(cacheKey)
      if (cached) {
        console.log('✅ Cache HIT: messages for patient', paciente_id)
        return NextResponse.json(cached)
      }

      console.log('❌ Cache MISS: messages for patient', paciente_id)

      // Obtener mensajes del paciente
      const mensajes = await prisma.mensajeWhatsApp.findMany({
        where: { paciente_id },
        orderBy: { createdAt: 'asc' },
        include: {
          paciente: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
            },
          },
        },
      })

      const response = { mensajes }

      // Guardar en caché (2 minutos)
      await setCache(cacheKey, response, 120)

      return NextResponse.json(response)
    }

    // Si no hay paciente_id, listar conversaciones
    const cacheKey = `messages:conversations:${page}:${limit}:${search}`

    // Intentar obtener del caché
    const cached = await getCache<any>(cacheKey)
    if (cached) {
      console.log('✅ Cache HIT: conversations list')
      return NextResponse.json(cached)
    }

    console.log('❌ Cache MISS: conversations list')

    const skip = (page - 1) * limit

    // Construir filtro de búsqueda por nombre de paciente
    const whereFilter = search
      ? {
          nombre: { contains: search, mode: 'insensitive' as const },
        }
      : {}

    // Obtener TODOS los pacientes (con o sin mensajes)
    const pacientesConMensajes = await prisma.paciente.findMany({
      where: whereFilter,
      skip,
      take: limit,
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        mensajes: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Solo el último mensaje
        },
        _count: {
          select: {
            mensajes: {
              where: {
                direccion: 'ENTRANTE',
                leido: false,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Pacientes más recientes primero
      },
    })

    // Contar total de pacientes
    const total = await prisma.paciente.count({
      where: whereFilter,
    })

    // Formatear respuesta
    const conversaciones = pacientesConMensajes.map((paciente) => ({
      paciente: {
        id: paciente.id,
        nombre: paciente.nombre,
        email: paciente.email,
        telefono: paciente.telefono,
      },
      ultimoMensaje: paciente.mensajes[0] || null,
      mensajesNoLeidos: paciente._count.mensajes,
    }))

    const response = {
      conversaciones,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }

    // Guardar en caché (1 minuto para lista de conversaciones, se actualiza frecuentemente)
    await setCache(cacheKey, response, 60)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error al obtener mensajes:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al obtener mensajes', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST /api/mensajes - Enviar mensaje manual
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = mensajeSchema.parse(body)

    // Verificar que el paciente existe
    const paciente = await prisma.paciente.findUnique({
      where: { id: validatedData.paciente_id },
    })

    if (!paciente) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      )
    }

    // Intentar enviar mensaje por WhatsApp si Twilio está configurado
    let twilioSid: string | undefined
    let estadoMensaje: 'ENVIADO' | 'FALLIDO' = 'ENVIADO'

    if (isTwilioConfigured()) {
      try {
        const resultado = await sendWhatsAppMessage(
          paciente.telefono,
          validatedData.contenido
        )
        twilioSid = resultado.messageSid
        console.log('✅ WhatsApp sent via Twilio:', resultado.messageSid)
      } catch (error) {
        console.error('❌ Failed to send WhatsApp:', error)
        estadoMensaje = 'FALLIDO'
        // Continuar guardando el mensaje aunque falle el envío
      }
    } else {
      console.warn('⚠️  Twilio not configured, message saved but not sent')
    }

    // Crear mensaje en la base de datos
    const mensaje = await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: validatedData.paciente_id,
        direccion: 'SALIENTE',
        contenido: validatedData.contenido,
        tipo: validatedData.tipo,
        estado: estadoMensaje,
        twilio_sid: twilioSid,
        leido: true, // Mensajes salientes se marcan como leídos automáticamente
      },
      include: {
        paciente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
    })

    // Invalidar caché de mensajes del paciente y de conversaciones
    await deleteCachePattern(`messages:*`)
    console.log('🗑️  Cache invalidated: messages after new message sent', validatedData.paciente_id)

    return NextResponse.json(mensaje, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al enviar mensaje:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al enviar mensaje', details: errorMessage },
      { status: 500 }
    )
  }
}
