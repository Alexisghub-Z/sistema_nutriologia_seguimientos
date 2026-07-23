import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'
import { z } from 'zod'
import { GRUPOS_SMAE, type GrupoSMAEId } from '@/lib/utils/smae'
import {
  chatDietaStream,
  extraerDietaDeRespuesta,
  extraerRecetarioDeRespuesta,
  isGeneradorDisponible,
  MARCADOR_DIETA,
  type EntradaGeneracion,
  type DietaGenerada,
  type RecetarioGenerado,
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
  // Modo activo y el estado (dieta o recetario) sobre el que se conversa.
  // Se valida de forma laxa: la estructura la maneja el servicio.
  modo: z.enum(['dieta', 'recetario']).default('dieta'),
  estado_actual: z.object({ tiempos: z.array(z.any()) }),
  indicaciones_inicio: z.string().optional().default(''),
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
  const estadoActual = data.estado_actual as DietaGenerada | RecetarioGenerado
  const historial = data.historial as MensajeChatIA[]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }
      try {
        let completa = ''
        let emitido = 0 // cuántos caracteres del texto conversacional ya enviamos
        let dejeDeStreamearTexto = false

        for await (const delta of chatDietaStream({
          entrada,
          modo: data.modo,
          estadoActual,
          historial,
          mensaje: data.mensaje,
        })) {
          completa += delta
          if (dejeDeStreamearTexto) continue

          const idxMarcador = completa.indexOf(MARCADOR_DIETA)
          if (idxMarcador !== -1) {
            // Llegó el marcador completo: emitimos el texto que falte hasta él y avisamos.
            if (idxMarcador > emitido) {
              enviar({ tipo: 'texto', delta: completa.slice(emitido, idxMarcador) })
            }
            enviar({ tipo: 'aplicando' }) // → dispara la animación en la UI
            dejeDeStreamearTexto = true
            continue
          }

          // Emitimos texto, pero RETENEMOS una cola que podría ser el inicio del
          // marcador (para no filtrar "<<<DIETA_ACT..." antes de confirmarlo).
          const seguro = completa.length - (MARCADOR_DIETA.length - 1)
          if (seguro > emitido) {
            enviar({ tipo: 'texto', delta: completa.slice(emitido, seguro) })
            emitido = seguro
          }
        }

        // Si terminó sin marcador, emitimos la cola retenida.
        if (!dejeDeStreamearTexto && completa.length > emitido) {
          enviar({ tipo: 'texto', delta: completa.slice(emitido) })
        }

        // Al terminar, extraemos la versión actualizada según el modo.
        if (data.modo === 'recetario') {
          const { recetario } = extraerRecetarioDeRespuesta(completa, data.indicaciones_inicio)
          if (recetario) enviar({ tipo: 'recetario', recetario })
        } else {
          const { dieta } = extraerDietaDeRespuesta(completa)
          if (dieta) enviar({ tipo: 'dieta', dieta })
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
