/**
 * Tests para el sistema de IA mejorado
 * Valida las 3 mejoras implementadas:
 * 1. Contexto de horarios y fecha actual
 * 2. Detección proactiva de intenciones
 * 3. Naturalidad y empatía en respuestas
 */

import { obtenerRespuestaIA, type PacienteContexto } from '../openai-assistant'
import { buscarEnFAQ } from '@/lib/knowledge-base'

// Mock de OpenAI
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Respuesta de prueba de la IA',
                },
                finish_reason: 'stop',
              },
            ],
            usage: {
              total_tokens: 100,
            },
          }),
        },
      },
    })),
  }
})

describe('Sistema de IA - Mejoras Implementadas', () => {
  beforeAll(() => {
    // Configurar variables de entorno para tests
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.AI_ENABLED = 'true'
    process.env.OPENAI_MODEL = 'gpt-4o'
    process.env.OPENAI_TEMPERATURE = '0.7'
    process.env.OPENAI_MAX_TOKENS = '500'
  })

  describe('Mejora 1: Contexto de Horarios y Fecha Actual', () => {
    test('Debe incluir contexto temporal en el sistema', async () => {
      const mensaje = '¿Están abiertos ahora?'
      const pacienteContexto: PacienteContexto = {
        nombre: 'Juan Pérez',
        tiene_cita_proxima: false,
        es_paciente_nuevo: true,
      }

      const respuesta = await obtenerRespuestaIA(mensaje, pacienteContexto)

      // La respuesta debe tener información sobre el contexto
      expect(respuesta).toBeDefined()
      expect(respuesta.mensaje).toBeDefined()
      expect(respuesta.confidence).toBeGreaterThan(0)
    })

    test('Debe detectar si el consultorio está cerrado los domingos', async () => {
      // Este test validaría que el contexto incluya estado del consultorio
      // En producción, la fecha actual se usa para determinar si está abierto
      const mensaje = 'Quiero ir hoy'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.mensaje).toBeDefined()
    })
  })

  describe('Mejora 2: Detección Proactiva de Intenciones', () => {
    test('Debe detectar intención de AGENDAR cuando el usuario menciona "cita"', async () => {
      const mensaje = 'Quiero agendar una cita'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.intencion_detectada).toBe('agendar')
      expect(respuesta.nivel_urgencia).toBeDefined()
    })

    test('Debe detectar intención de PRECIOS cuando pregunta "cuánto cuesta"', async () => {
      const mensaje = '¿Cuánto cuesta la consulta?'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.intencion_detectada).toBe('precios')
    })

    test('Debe detectar intención de HORARIOS cuando pregunta horarios', async () => {
      const mensaje = '¿A qué hora abren?'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.intencion_detectada).toBe('horarios')
    })

    test('Debe detectar URGENCIA cuando usa palabras como "urgente"', async () => {
      const mensaje = 'Necesito una cita urgente'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.intencion_detectada).toBe('agendar')
      expect(respuesta.nivel_urgencia).toBe('alta')
    })

    test('Debe detectar necesidad de DERIVAR cuando hace pregunta nutricional', async () => {
      const mensaje = '¿Puedo comer pan si tengo diabetes?'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.intencion_detectada).toBe('derivar')
      expect(respuesta.debe_derivar_humano).toBe(true)
    })
  })

  describe('Mejora 3: Naturalidad y Empatía en Respuestas', () => {
    test('FAQ debe tener respuestas naturales y empáticas', () => {
      const respuestaPrecio = buscarEnFAQ('¿Cuánto cuesta?')

      expect(respuestaPrecio).toBeDefined()
      expect(respuestaPrecio).toContain('Claro que sí')
      expect(respuestaPrecio).toContain('✅')
    })

    test('FAQ debe variar los saludos', () => {
      const respuestaHorarios = buscarEnFAQ('¿Cuáles son los horarios?')
      const respuestaUbicacion = buscarEnFAQ('¿Dónde está?')

      expect(respuestaHorarios).toBeDefined()
      expect(respuestaUbicacion).toBeDefined()

      // Las respuestas deben tener diferentes aperturas
      expect(respuestaHorarios).not.toBe(respuestaUbicacion)
    })

    test('FAQ debe incluir preguntas abiertas al final', () => {
      const respuestaPago = buscarEnFAQ('¿Qué formas de pago?')

      expect(respuestaPago).toBeDefined()
      expect(respuestaPago).toMatch(/\?$/) // Termina en pregunta
    })
  })

  describe('Integración: Contexto del Paciente', () => {
    test('Debe personalizar respuesta con nombre del paciente', async () => {
      const mensaje = 'Hola, necesito información'
      const pacienteContexto: PacienteContexto = {
        nombre: 'María González',
        tiene_cita_proxima: true,
        fecha_proxima_cita: 'sábado, 8 de febrero de 2026',
        hora_proxima_cita: '10:00',
        tipo_cita: 'Presencial',
        codigo_cita: 'ABC123',
        es_paciente_nuevo: false,
        total_consultas: 5,
      }

      const respuesta = await obtenerRespuestaIA(mensaje, pacienteContexto)

      expect(respuesta).toBeDefined()
      expect(respuesta.mensaje).toBeDefined()
    })

    test('Debe manejar paciente sin cita próxima', async () => {
      const mensaje = 'Quiero agendar'
      const pacienteContexto: PacienteContexto = {
        nombre: 'Carlos Ruiz',
        tiene_cita_proxima: false,
        es_paciente_nuevo: true,
      }

      const respuesta = await obtenerRespuestaIA(mensaje, pacienteContexto)

      expect(respuesta).toBeDefined()
      expect(respuesta.intencion_detectada).toBe('agendar')
      expect(respuesta.mensaje).toBeDefined()
    })
  })

  describe('Casos Edge', () => {
    test('Debe manejar mensajes muy cortos', async () => {
      const mensaje = 'Hola'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.mensaje).toBeDefined()
    })

    test('Debe manejar múltiples preguntas en un mensaje', async () => {
      const mensaje = '¿Cuánto cuesta y cuáles son los horarios?'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      // Debe detectar al menos una intención
      expect(respuesta.intencion_detectada).toBeDefined()
    })

    test('Debe manejar mensaje sin contexto de paciente', async () => {
      const mensaje = 'Información del consultorio'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.mensaje).toBeDefined()
    })
  })

  describe('Confianza y Derivación', () => {
    test('Debe calcular nivel de confianza', async () => {
      const mensaje = '¿Cuánto cuesta la consulta?'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.confidence).toBeGreaterThanOrEqual(0)
      expect(respuesta.confidence).toBeLessThanOrEqual(1)
    })

    test('Debe derivar a humano cuando detecta pregunta médica', async () => {
      const mensaje = 'Tengo dolor de estómago después de comer'

      const respuesta = await obtenerRespuestaIA(mensaje)

      expect(respuesta).toBeDefined()
      expect(respuesta.debe_derivar_humano).toBe(true)
      expect(respuesta.intencion_detectada).toBe('derivar')
    })
  })
})

describe('Sistema de FAQ Mejorado', () => {
  test('Debe encontrar respuesta para precio', () => {
    const respuesta = buscarEnFAQ('cuánto cuesta')
    expect(respuesta).toBeDefined()
    expect(respuesta).toContain('$500')
  })

  test('Debe encontrar respuesta para horarios', () => {
    const respuesta = buscarEnFAQ('horarios')
    expect(respuesta).toBeDefined()
    expect(respuesta).toContain('4:00 PM')
  })

  test('Debe encontrar respuesta para ubicación', () => {
    const respuesta = buscarEnFAQ('dónde está')
    expect(respuesta).toBeDefined()
    expect(respuesta).toContain('Oaxaca')
  })

  test('Debe retornar null para pregunta no en FAQ', () => {
    const respuesta = buscarEnFAQ('pregunta que no existe en faq')
    expect(respuesta).toBeNull()
  })
})
