import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { GRUPOS_SMAE, type GrupoSMAEId } from '@/lib/utils/smae'
import {
  chatDietaStream,
  extraerDietaDeRespuesta,
  isGeneradorDisponible,
  MARCADOR_DIETA,
  type EntradaGeneracion,
  type DietaGenerada,
  type MensajeChatIA,
  type TiempoConEquivalentes,
} from '@/lib/services/generador-dietas'

/**
 * Chat conversacional con la IA sobre la dieta (copiloto), con streaming.
 * POST /api/dietas/chat  →  Server-Sent Events.
 *
 * Eventos emitidos (data: JSON):
 *   { tipo: 'texto', delta }   trozo de texto conversacional (en vivo)
 *   { tipo: 'dieta', dieta }   dieta actualizada (si el mensaje implicó un cambio)
 *   { tipo: 'fin' }            fin del stream
 *   { tipo: 'error', error }   error
 */

const GRUPO_IDS = GRUPOS_SMAE.map((g) => g.id) as [GrupoSMAEId, ...GrupoSMAEId[]]

const chatSchema = z.object({
  kcal_meta: z.number().min(500).max(6000),
  proteina_g: z.number().min(0).max(600),
  grasa_g: z.number().min(0).max(400),
  carbohidrato_g: z.number().min(0).max(900),
  tiempos: z
    .array(
      z.object({
        id: z.string().min(1),
        nombre: z.string().min(1).max(60),
        equivalentes: z.record(z.enum(GRUPO_IDS), z.number().min(0).max(99)),
      })
    )
    .min(1),
  // La dieta actual (tiempos con alimentos) sobre la que se conversa.
  dieta_actual: z.object({
    tiempos: z.array(
      z.object({
        id: z.string(),
        nombre: z.string(),
        nota: z.string().optional(),
        alimentos: z.array(
          z.object({
            grupo: z.enum(GRUPO_IDS),
            equivalentes: z.number(),
            descripcion: z.string(),
            calculo: z.string().optional(),
          })
        ),
      })
    ),
  }),
  historial: z
    .array(z.object({ rol: z.enum(['user', 'assistant']), contenido: z.string() }))
    .max(40)
    .default([]),
  mensaje: z.string().min(1).max(2000),
})

export async function POST(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 })
  }
  if (!isGeneradorDisponible()) {
    return new Response(JSON.stringify({ error: 'La IA no está configurada.' }), { status: 503 })
  }

  const body = await request.json()
  const parsed = chatSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), { status: 400 })
  }
  const data = parsed.data

  const entrada: EntradaGeneracion = {
    kcalMeta: data.kcal_meta,
    macros: {
      proteina_g: data.proteina_g,
      grasa_g: data.grasa_g,
      carbohidrato_g: data.carbohidrato_g,
    },
    tiempos: data.tiempos as TiempoConEquivalentes[],
    perfil: {},
  }
  const dietaActual = data.dieta_actual as DietaGenerada
  const historial = data.historial as MensajeChatIA[]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }
      try {
        let completa = ''
        let dejeDeStreamearTexto = false

        for await (const delta of chatDietaStream({
          entrada,
          dietaActual,
          historial,
          mensaje: data.mensaje,
        })) {
          completa += delta
          // Solo streameamos el texto ANTES del marcador (no el JSON al usuario).
          if (!dejeDeStreamearTexto) {
            if (completa.includes(MARCADOR_DIETA)) {
              dejeDeStreamearTexto = true
              // Emitimos el trozo de texto que quede antes del marcador.
              const idx = completa.indexOf(MARCADOR_DIETA)
              const textoPrevio = completa.slice(0, idx)
              const yaEmitido = completa.length - delta.length
              if (idx > yaEmitido) {
                enviar({ tipo: 'texto', delta: textoPrevio.slice(yaEmitido) })
              }
            } else {
              enviar({ tipo: 'texto', delta })
            }
          }
        }

        // Al terminar, extraemos la dieta actualizada si la hubo.
        const { dieta } = extraerDietaDeRespuesta(completa)
        if (dieta) {
          enviar({ tipo: 'dieta', dieta })
        }
        enviar({ tipo: 'fin' })
      } catch (e) {
        enviar({ tipo: 'error', error: e instanceof Error ? e.message : 'Error en el chat' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
