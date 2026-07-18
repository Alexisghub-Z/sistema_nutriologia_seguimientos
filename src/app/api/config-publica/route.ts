import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * GET /api/config-publica
 * Configuración PÚBLICA (sin auth) para las páginas de pacientes: nombre del
 * consultorio y WhatsApp visible. NO expone nada sensible.
 */
export async function GET() {
  try {
    const config = await prisma.configuracionGeneral.findFirst({
      select: { nombre_consultorio: true, whatsapp_publico: true },
    })

    return NextResponse.json({
      nombreConsultorio: config?.nombre_consultorio || 'Consultorio',
      whatsappPublico: config?.whatsapp_publico || null,
    })
  } catch (error) {
    console.error('Error al obtener config pública:', error)
    // Fallback neutral para no romper las páginas públicas
    return NextResponse.json({ nombreConsultorio: 'Consultorio', whatsappPublico: null })
  }
}
