/**
 * Script de Testing Manual para el Sistema de IA Mejorado
 * Simula conversaciones reales para validar las 3 mejoras implementadas
 */

// Cargar variables de entorno
import { config } from 'dotenv'
import { resolve } from 'path'

// Cargar .env y .env.local
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { obtenerRespuestaIA, type PacienteContexto } from '../src/lib/services/openai-assistant'
import { buscarEnFAQ } from '../src/lib/knowledge-base'

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function log(color: keyof typeof colors, mensaje: string) {
  console.log(`${colors[color]}${mensaje}${colors.reset}`)
}

function separarSeccion(titulo: string) {
  console.log('\n' + '='.repeat(80))
  log('cyan', `  ${titulo}`)
  console.log('='.repeat(80) + '\n')
}

/**
 * Tipo para los escenarios de prueba
 */
type EscenarioPrueba = {
  categoria: string
  mensaje: string
  contexto?: PacienteContexto
  esperado: string
}

/**
 * Escenarios de prueba para validar las mejoras
 */
const ESCENARIOS_PRUEBA: EscenarioPrueba[] = [
  // MEJORA 1: Contexto de horarios
  {
    categoria: 'Contexto de Horarios',
    mensaje: '¿Están abiertos ahora?',
    contexto: undefined,
    esperado: 'Debe mencionar el estado actual del consultorio (abierto/cerrado)',
  },
  {
    categoria: 'Contexto de Horarios',
    mensaje: 'Quiero ir el domingo',
    contexto: undefined,
    esperado: 'Debe mencionar que el consultorio no abre los domingos',
  },

  // MEJORA 2: Detección proactiva
  {
    categoria: 'Detección Proactiva - Agendar',
    mensaje: 'Quiero agendar una cita',
    contexto: undefined,
    esperado: 'Debe ofrecer el link de agenda directamente',
  },
  {
    categoria: 'Detección Proactiva - Precios',
    mensaje: '¿Cuánto cuesta la consulta?',
    contexto: undefined,
    esperado: 'Debe dar precio y luego ofrecer agendar',
  },
  {
    categoria: 'Detección Proactiva - Urgencia',
    mensaje: 'Necesito una cita urgente, es importante',
    contexto: undefined,
    esperado: 'Debe detectar urgencia (nivel: alta) y responder apropiadamente',
  },
  {
    categoria: 'Detección Proactiva - Derivar',
    mensaje: '¿Puedo comer pan si tengo diabetes?',
    contexto: undefined,
    esperado: 'Debe derivar al nutriólogo (951 130 1554) sin dar consejos',
  },

  // MEJORA 3: Naturalidad y empatía
  {
    categoria: 'Naturalidad - Saludo',
    mensaje: 'Hola, buenos días',
    contexto: {
      nombre: 'María González',
      tiene_cita_proxima: false,
      es_paciente_nuevo: true,
    },
    esperado: 'Debe usar saludo apropiado según hora y nombre del paciente',
  },
  {
    categoria: 'Empatía - Preocupación',
    mensaje: 'Estoy preocupada por mi peso',
    contexto: {
      nombre: 'Ana López',
      tiene_cita_proxima: false,
      es_paciente_nuevo: true,
    },
    esperado: 'Debe validar emoción y ser empático',
  },
  {
    categoria: 'Empatía - Motivación',
    mensaje: 'Quiero mejorar mi salud y bajar de peso',
    contexto: {
      nombre: 'Carlos Ruiz',
      tiene_cita_proxima: false,
      es_paciente_nuevo: true,
    },
    esperado: 'Debe reconocer motivación y ser alentador',
  },

  // CASOS CON CONTEXTO DE PACIENTE
  {
    categoria: 'Contexto Paciente - Con Cita',
    mensaje: '¿A qué hora es mi cita?',
    contexto: {
      nombre: 'Juan Pérez',
      tiene_cita_proxima: true,
      fecha_proxima_cita: 'sábado, 8 de febrero de 2026',
      hora_proxima_cita: '10:00',
      tipo_cita: 'Presencial',
      codigo_cita: 'ABC123',
      es_paciente_nuevo: false,
      total_consultas: 5,
    },
    esperado: 'Debe dar información de su cita y link de gestión',
  },
  {
    categoria: 'Contexto Paciente - Reagendar',
    mensaje: 'Necesito reagendar mi cita',
    contexto: {
      nombre: 'Laura Martínez',
      tiene_cita_proxima: true,
      fecha_proxima_cita: 'viernes, 7 de febrero de 2026',
      hora_proxima_cita: '16:30',
      tipo_cita: 'En línea',
      codigo_cita: 'XYZ789',
      es_paciente_nuevo: false,
      total_consultas: 3,
    },
    esperado: 'Debe dar link directo para reagendar (con código de cita)',
  },
]

/**
 * Ejecuta un escenario de prueba
 */
async function ejecutarEscenario(escenario: EscenarioPrueba, index: number) {
  log('blue', `\n[ESCENARIO ${index + 1}] ${escenario.categoria}`)
  log('yellow', `Mensaje: "${escenario.mensaje}"`)

  if (escenario.contexto) {
    log('magenta', `Contexto: ${escenario.contexto.nombre} (Paciente)`)
  }

  try {
    // Primero buscar en FAQ
    const respuestaFAQ = buscarEnFAQ(escenario.mensaje)

    if (respuestaFAQ) {
      log('green', '\n✅ RESPUESTA (FAQ):')
      console.log(respuestaFAQ)
      log('cyan', `\nEsperado: ${escenario.esperado}`)
      return
    }

    // Si no está en FAQ, usar IA
    const respuesta = await obtenerRespuestaIA(escenario.mensaje, escenario.contexto)

    log('green', '\n✅ RESPUESTA (IA):')
    console.log(respuesta.mensaje)

    log('cyan', '\n📊 METADATA:')
    console.log(`  - Intención detectada: ${respuesta.intencion_detectada || 'N/A'}`)
    console.log(`  - Nivel de urgencia: ${respuesta.nivel_urgencia || 'N/A'}`)
    console.log(`  - Confianza: ${(respuesta.confidence * 100).toFixed(1)}%`)
    console.log(`  - Debe derivar: ${respuesta.debe_derivar_humano ? 'Sí' : 'No'}`)
    console.log(`  - Tokens usados: ${respuesta.tokens_usados || 'N/A'}`)

    log('cyan', `\n🎯 Esperado: ${escenario.esperado}`)
  } catch (error) {
    log('red', `\n❌ ERROR: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

/**
 * Función principal
 */
async function main() {
  log('cyan', '\n╔════════════════════════════════════════════════════════════════════════════╗')
  log('cyan', '║       TEST MANUAL - SISTEMA DE IA MEJORADO                                ║')
  log('cyan', '╚════════════════════════════════════════════════════════════════════════════╝')

  // Verificar que OpenAI esté configurado
  if (!process.env.OPENAI_API_KEY || process.env.AI_ENABLED !== 'true') {
    log('red', '\n❌ ERROR: OpenAI no está configurado')
    log('yellow', 'Configura OPENAI_API_KEY y AI_ENABLED=true en tu .env\n')
    process.exit(1)
  }

  log('green', '\n✅ OpenAI configurado correctamente')
  log('blue', `Modelo: ${process.env.OPENAI_MODEL || 'gpt-4o'}`)
  log('blue', `Temperatura: ${process.env.OPENAI_TEMPERATURE || '0.7'}`)
  log('blue', `Max Tokens: ${process.env.OPENAI_MAX_TOKENS || '500'}\n`)

  // Ejecutar escenarios
  separarSeccion('EJECUTANDO ESCENARIOS DE PRUEBA')

  for (let i = 0; i < ESCENARIOS_PRUEBA.length; i++) {
    const escenario = ESCENARIOS_PRUEBA[i]
    if (escenario) {
      await ejecutarEscenario(escenario, i)

      // Pausa entre escenarios para no saturar la API
      if (i < ESCENARIOS_PRUEBA.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  // Resumen
  separarSeccion('RESUMEN')
  log('green', `✅ Se ejecutaron ${ESCENARIOS_PRUEBA.length} escenarios de prueba`)
  log('cyan', '\nRevisa manualmente que las respuestas cumplan con:')
  log('yellow', '  1. ✅ Contexto de horarios y fecha (menciona si está abierto/cerrado)')
  log('yellow', '  2. ✅ Detección proactiva (ofrece links, detecta urgencia)')
  log('yellow', '  3. ✅ Naturalidad y empatía (usa frases naturales, valida emociones)')
  console.log('')
}

// Ejecutar
main().catch((error) => {
  log('red', `\n❌ Error fatal: ${error}`)
  process.exit(1)
})
