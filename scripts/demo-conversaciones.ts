/**
 * Script de simulación de conversaciones de WhatsApp para video demo
 *
 * Inserta conversaciones realistas en la BD (sin tocar Twilio) e invalida
 * la caché de Redis para que aparezcan al instante en /mensajes.
 *
 * Modos:
 *   tsx scripts/demo-conversaciones.ts               → seed de historial (5 pacientes + 2 prospectos)
 *   tsx scripts/demo-conversaciones.ts --live        → mensajes entrantes en vivo (para grabar)
 *       [--telefono +525511111001] [--intervalo 12]
 *   tsx scripts/demo-conversaciones.ts --seguimiento → secuencia de mensajes automáticos de
 *       seguimiento en vivo, con los textos reales del sistema (para grabar)
 *       [--telefono +525511111001] [--intervalo 10]
 *   tsx scripts/demo-conversaciones.ts --consultas   → crea 8 consultas realistas con progresión
 *       [--telefono +5219515886761]                    de mediciones para un paciente
 *   tsx scripts/demo-conversaciones.ts --consultas-limpiar [--telefono ...]
 *       → borra las consultas sin cita del paciente (las creadas por este script)
 *   tsx scripts/demo-conversaciones.ts --limpiar     → borra las conversaciones demo
 *
 * Requiere haber corrido antes: npm run db:seed-demo (crea los pacientes demo)
 */

// Cargar variables de entorno
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

import { PrismaClient, DireccionMensaje, TipoMensaje, EstadoMensaje } from '@prisma/client'
import { deleteCachePattern, closeRedis } from '../src/lib/redis'
import {
  obtenerCategoriaBD,
  reemplazarVariables,
  TipoPlantilla,
  type VariablesPlantilla,
} from '../src/lib/utils/plantillas'

const prisma = new PrismaClient()

const SID_PREFIX = 'DEMO_'
let sidCounter = 0

function nuevoSid(): string {
  return `${SID_PREFIX}${Date.now()}_${sidCounter++}`
}

// Fecha relativa: hace X días/horas/minutos
function hace(dias: number, horas = 0, minutos = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  d.setHours(d.getHours() - horas)
  d.setMinutes(d.getMinutes() - minutos)
  return d
}

async function invalidarCache() {
  await deleteCachePattern('messages:*')
}

// ============================================
// Guiones de conversación
// ============================================

interface MensajeGuion {
  direccion: DireccionMensaje
  contenido: string
  tipo?: TipoMensaje
  estado?: EstadoMensaje
  leido?: boolean
  fecha: Date
}

// Teléfonos de pacientes creados por prisma/seed-demo.ts
const TEL_ANA = '+525511111001'
const TEL_CARLOS = '+525511111002'
const TEL_SOFIA = '+525511111003'
const TEL_MIGUEL = '+525511111004'
const TEL_VALENTINA = '+525511111005'

// Teléfonos exclusivos de prospectos demo (rango distinto para poder limpiarlos)
const TEL_PROSPECTO_1 = '+525599990001'
const TEL_PROSPECTO_2 = '+525599990002'

const CONVERSACIONES_PACIENTES: Record<string, MensajeGuion[]> = {
  [TEL_ANA]: [
    {
      direccion: 'SALIENTE',
      tipo: 'AUTOMATICO_CONFIRMACION',
      contenido:
        '¡Hola Ana! 👋 Tu cita ha sido agendada para el viernes a las 10:00 AM en el consultorio (Humboldt 302). Responde CONFIRMAR para confirmar tu asistencia. ¡Te esperamos!',
      estado: 'LEIDO',
      fecha: hace(5, 3),
    },
    {
      direccion: 'ENTRANTE',
      contenido: 'Confirmo ✅ ahí estaré, gracias!',
      leido: true,
      fecha: hace(5, 2, 45),
    },
    {
      direccion: 'SALIENTE',
      tipo: 'AUTOMATICO_RECORDATORIO',
      contenido:
        '¡Hola Ana! 🔔 Te recordamos tu cita de mañana viernes a las 10:00 AM. Si necesitas reagendar, avísanos con anticipación. ¡Nos vemos!',
      estado: 'LEIDO',
      fecha: hace(4, 1),
    },
    {
      direccion: 'SALIENTE',
      tipo: 'AUTOMATICO_SEGUIMIENTO',
      contenido:
        '¡Hola Ana! 🌱 ¿Cómo te has sentido con el nuevo plan? Recuerda mantener tu hidratación y tus 5 comidas al día. Cualquier duda aquí estoy. 💪',
      estado: 'LEIDO',
      fecha: hace(2, 5),
    },
    {
      direccion: 'ENTRANTE',
      contenido:
        'Hola doc! Muy bien 😊 ya casi no se me antojan los refrescos. Una duda: ¿la avena la puedo cambiar por fruta en el desayuno?',
      leido: true,
      fecha: hace(2, 4, 30),
    },
    {
      direccion: 'SALIENTE',
      tipo: 'MANUAL',
      contenido:
        '¡Qué gusto Ana! 🎉 Sí, puedes cambiar la avena por 1 taza de fruta picada con 2 cucharadas de granola. Mantén la proteína del desayuno igual. ¡Vas excelente!',
      estado: 'LEIDO',
      fecha: hace(2, 4),
    },
    {
      direccion: 'ENTRANTE',
      contenido: 'Perfecto, mil gracias doc! Nos vemos en la próxima cita 🙌',
      leido: true,
      fecha: hace(2, 3, 50),
    },
  ],

  [TEL_CARLOS]: [
    {
      direccion: 'ENTRANTE',
      contenido:
        'Buenas tardes doc, ¿puedo cambiar la colación de la tarde? El yogurt griego no lo encuentro en mi súper 😅',
      leido: true,
      fecha: hace(1, 6),
    },
    {
      direccion: 'SALIENTE',
      tipo: 'MANUAL',
      contenido:
        '¡Hola Carlos! Claro que sí 👍 Puedes sustituirlo por un puñito de almendras (10-12 piezas) o un queso panela de 40g. Cualquiera de las dos opciones funciona igual.',
      estado: 'LEIDO',
      fecha: hace(1, 5, 30),
    },
    {
      direccion: 'ENTRANTE',
      contenido: 'Excelente, con las almendras le entro 💪 gracias!',
      leido: true,
      fecha: hace(1, 5, 15),
    },
    {
      direccion: 'SALIENTE',
      tipo: 'MANUAL',
      contenido: '¡Perfecto! Sigue así, en la próxima consulta revisamos tu avance 📈',
      estado: 'ENTREGADO',
      fecha: hace(1, 5),
    },
  ],

  // Sofía: mensajes recientes SIN leer → badge de no leídos en la lista
  [TEL_SOFIA]: [
    {
      direccion: 'SALIENTE',
      tipo: 'AUTOMATICO_SEGUIMIENTO',
      contenido:
        '¡Hola Sofía! 🌟 Ya pasó una semana de tu consulta, ¿cómo vas con el plan? Recuerda que puedes escribirme cualquier duda.',
      estado: 'LEIDO',
      fecha: hace(0, 3),
    },
    {
      direccion: 'ENTRANTE',
      contenido: 'Hola doc! Bien en general, pero tengo una duda con las cenas 🤔',
      leido: false,
      fecha: hace(0, 0, 25),
    },
    {
      direccion: 'ENTRANTE',
      contenido: '¿Puedo cenar lo mismo que la comida si llego tarde del trabajo?',
      leido: false,
      fecha: hace(0, 0, 24),
    },
    {
      direccion: 'ENTRANTE',
      contenido: 'Y otra cosa, ¿el café con leche descremada sí cuenta como colación?',
      leido: false,
      fecha: hace(0, 0, 22),
    },
  ],

  [TEL_MIGUEL]: [
    {
      direccion: 'SALIENTE',
      tipo: 'AUTOMATICO_RECORDATORIO',
      contenido:
        '¡Hola Miguel! 🔔 Te recordamos tu cita de mañana a las 12:00 PM. Responde CONFIRMAR para confirmar tu asistencia.',
      estado: 'ENTREGADO',
      fecha: hace(0, 8),
    },
    {
      direccion: 'ENTRANTE',
      contenido: 'Confirmar',
      leido: true,
      fecha: hace(0, 7, 30),
    },
    {
      direccion: 'SALIENTE',
      tipo: 'AUTOMATICO_CONFIRMACION',
      contenido: '¡Perfecto Miguel! ✅ Tu cita quedó confirmada. Te esperamos mañana a las 12:00 PM. 🙌',
      estado: 'ENTREGADO',
      fecha: hace(0, 7, 29),
    },
  ],

  [TEL_VALENTINA]: [
    {
      direccion: 'ENTRANTE',
      contenido: 'Doc! Le comparto que ya bajé 2 kg desde que empezamos 🎉🎉',
      leido: true,
      fecha: hace(3, 2),
    },
    {
      direccion: 'SALIENTE',
      tipo: 'MANUAL',
      contenido:
        '¡Felicidades Valentina! 🎉 Ese es el resultado de tu constancia. Sigue igual con el plan y la caminata diaria, vas por muy buen camino. 💪',
      estado: 'LEIDO',
      fecha: hace(3, 1, 40),
    },
    {
      direccion: 'ENTRANTE',
      contenido: 'Gracias doc! Toda motivada para seguir 😄',
      leido: true,
      fecha: hace(3, 1, 30),
    },
  ],
}

interface ProspectoGuion {
  telefono: string
  nombre: string | null
  mensajes: MensajeGuion[]
}

const PROSPECTOS_DEMO: ProspectoGuion[] = [
  {
    telefono: TEL_PROSPECTO_1,
    nombre: 'Laura Jiménez',
    mensajes: [
      {
        direccion: 'ENTRANTE',
        contenido: 'Hola! Vi su página, ¿cuánto cuesta la consulta con el nutriólogo?',
        leido: true,
        fecha: hace(0, 5),
      },
      {
        direccion: 'SALIENTE',
        contenido:
          '¡Hola! 😊 Gracias por escribirnos. La consulta tiene un costo de $500 MXN e incluye evaluación completa de composición corporal y plan personalizado. ¿Te gustaría agendar una cita?',
        estado: 'LEIDO',
        fecha: hace(0, 4, 58),
      },
      {
        direccion: 'ENTRANTE',
        contenido: '¿Y dónde está el consultorio?',
        leido: true,
        fecha: hace(0, 4, 50),
      },
      {
        direccion: 'SALIENTE',
        contenido:
          'Estamos en Humboldt 302, en el centro. 📍 Puedes agendar directamente en línea o aquí por WhatsApp, ¿qué día te acomoda?',
        estado: 'ENTREGADO',
        fecha: hace(0, 4, 49),
      },
      {
        direccion: 'ENTRANTE',
        contenido: 'Déjeme revisar mi agenda y le escribo, gracias! 🙏',
        leido: true,
        fecha: hace(0, 4, 40),
      },
    ],
  },
  {
    telefono: TEL_PROSPECTO_2,
    nombre: null,
    mensajes: [
      {
        direccion: 'ENTRANTE',
        contenido: 'Hola, ¿atienden los sábados? Quiero una consulta para bajar de peso',
        leido: false,
        fecha: hace(0, 0, 12),
      },
    ],
  },
]

// Guion para el modo --live (mensajes que van llegando mientras se graba)
const GUION_LIVE: string[] = [
  'Hola doc! ¿Cómo está? 😊',
  'Le escribo porque terminé la primera semana del plan y me siento súper bien',
  'Ya no me da hambre entre comidas como antes 🙌',
  'Una pregunta, ¿el día de mi cumpleaños puedo darme un gustito? 🎂',
  'Es el sábado y mi familia me hace comida',
  'Y también quería ver si puedo mover mi cita de la próxima semana',
  '¿Tiene algún espacio el jueves por la tarde?',
  'Gracias doc! 🙏',
]

// ============================================
// Modo 1: Seed de historial
// ============================================

async function seedConversaciones() {
  console.log('💬 Creando conversaciones demo...\n')

  // Verificar pacientes demo
  const telefonos = Object.keys(CONVERSACIONES_PACIENTES)
  const pacientes = await prisma.paciente.findMany({
    where: { telefono: { in: telefonos } },
    select: { id: true, nombre: true, telefono: true },
  })

  if (pacientes.length === 0) {
    console.error('❌ No se encontraron los pacientes demo.')
    console.error('   Corre primero: npm run db:seed-demo')
    process.exit(1)
  }

  // Evitar duplicados si ya se corrió antes
  const yaExisten = await prisma.mensajeWhatsApp.count({
    where: { twilio_sid: { startsWith: SID_PREFIX } },
  })
  if (yaExisten > 0) {
    console.log('⚠️  Ya existen conversaciones demo. Para regenerarlas corre primero:')
    console.log('   npm run demo:chats:limpiar')
    return
  }

  let totalMensajes = 0

  // Conversaciones de pacientes
  for (const paciente of pacientes) {
    const guion = CONVERSACIONES_PACIENTES[paciente.telefono]
    if (!guion) continue

    for (const msg of guion) {
      await prisma.mensajeWhatsApp.create({
        data: {
          paciente_id: paciente.id,
          direccion: msg.direccion,
          contenido: msg.contenido,
          tipo: msg.tipo ?? 'MANUAL',
          estado: msg.estado ?? 'ENTREGADO',
          leido: msg.leido ?? true,
          twilio_sid: nuevoSid(),
          createdAt: msg.fecha,
        },
      })
      totalMensajes++
    }
    const noLeidos = guion.filter((m) => m.direccion === 'ENTRANTE' && m.leido === false).length
    console.log(
      `  ✅ ${paciente.nombre}: ${guion.length} mensajes${noLeidos ? ` (${noLeidos} sin leer)` : ''}`
    )
  }

  // Prospectos
  for (const p of PROSPECTOS_DEMO) {
    const entrantes = p.mensajes.filter((m) => m.direccion === 'ENTRANTE').length
    const prospecto = await prisma.prospecto.upsert({
      where: { telefono: p.telefono },
      update: {},
      create: {
        telefono: p.telefono,
        nombre: p.nombre,
        primer_contacto: p.mensajes[0]!.fecha,
        ultimo_contacto: p.mensajes[p.mensajes.length - 1]!.fecha,
        total_mensajes: entrantes,
        estado: 'ACTIVO',
      },
    })

    for (const msg of p.mensajes) {
      await prisma.mensajeProspecto.create({
        data: {
          prospecto_id: prospecto.id,
          direccion: msg.direccion,
          contenido: msg.contenido,
          estado: msg.estado ?? 'ENTREGADO',
          leido: msg.leido ?? true,
          twilio_sid: nuevoSid(),
          createdAt: msg.fecha,
        },
      })
      totalMensajes++
    }
    console.log(`  ✅ Prospecto ${p.nombre ?? '(sin nombre)'}: ${p.mensajes.length} mensajes`)
  }

  await invalidarCache()

  console.log(`\n🎉 Listo: ${totalMensajes} mensajes creados.`)
  console.log('   Abre /mensajes para verlos. Para el modo en vivo: npm run demo:chats:live')
}

// ============================================
// Modo 2: En vivo (para grabar)
// ============================================

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

async function modoLive(telefono: string, intervaloSeg: number) {
  const paciente = await prisma.paciente.findFirst({
    where: { telefono },
    select: { id: true, nombre: true },
  })

  if (!paciente) {
    console.error(`❌ No existe un paciente con teléfono ${telefono}.`)
    console.error('   Corre primero: npm run db:seed-demo')
    process.exit(1)
  }

  console.log(`🎬 Modo en vivo: ${paciente.nombre}`)
  console.log(`   ${GUION_LIVE.length} mensajes, uno cada ~${intervaloSeg}s.`)
  console.log('   Abre /mensajes y empieza a grabar. Ctrl+C para detener.\n')

  for (let i = 0; i < GUION_LIVE.length; i++) {
    const contenido = GUION_LIVE[i]!
    await prisma.mensajeWhatsApp.create({
      data: {
        paciente_id: paciente.id,
        direccion: 'ENTRANTE',
        contenido,
        tipo: 'MANUAL',
        estado: 'ENTREGADO',
        leido: false,
        twilio_sid: nuevoSid(),
      },
    })
    await invalidarCache()
    console.log(`  📩 [${i + 1}/${GUION_LIVE.length}] "${contenido}"`)

    if (i < GUION_LIVE.length - 1) {
      await sleep(intervaloSeg * 1000)
    }
  }

  console.log('\n🎉 Guion terminado. Puedes responder desde la UI para cerrar la escena.')
}

// ============================================
// Modo: Seguimiento automático en vivo
// ============================================

// Textos reales de las plantillas aprobadas por Meta (espejo de TEXTOS_PLANTILLAS en
// plantillas.ts, que no está exportado). Son los mismos que envía producción; no se usa
// la plantilla de BD porque ahí las 4 de seguimiento comparten categoría y saldría el
// mismo texto genérico repetido.
const TEXTOS_SEGUIMIENTO: Partial<Record<TipoPlantilla, string>> = {
  [TipoPlantilla.AGRADECIMIENTO_CONSULTA]:
    'Hola {nombre} 👋\n\nGracias por tu consulta de hoy. Fue un placer atenderte 😊\n\nRecuerda seguir tu plan nutricional y cualquier duda estamos aquí para apoyarte.',
  [TipoPlantilla.SEGUIMIENTO_INICIAL]:
    'Hola {nombre}, han pasado unos días desde tu consulta con el Nutriólogo Paul. 👋\n¿Cómo te has sentido siguiendo tu plan nutricional?\nSi tienes alguna duda, no dudes en contactar directamente al Nutriólogo Paul.',
  [TipoPlantilla.SEGUIMIENTO_INTERMEDIO]:
    '¡Hola {nombre}! 🌱 Vamos a la mitad del camino hacia tu próxima cita. ¿Cómo vas con tu plan nutricional? Recuerda que la constancia es la clave. 💪',
  [TipoPlantilla.SEGUIMIENTO_PREVIO_CITA]:
    'Hola {nombre}, falta aproximadamente una semana para tu próxima cita el {fecha_cita}\nsi deseas agendar ahora, no dudes en decirmelo',
  [TipoPlantilla.RECORDATORIO_AGENDAR]:
    'Hola {nombre}, te recuerdo que el nutriólogo Paul te sugirió una próxima cita para el {fecha_cita} a las {hora_cita}.\n\n¿Deseas confirmarla a esa hora o prefieres elegir otro horario?',
}

function textoPlantillaReal(tipo: TipoPlantilla, variables: VariablesPlantilla): string {
  return reemplazarVariables(TEXTOS_SEGUIMIENTO[tipo] ?? '', variables)
}

async function modoSeguimiento(telefono: string, intervaloSeg: number) {
  const paciente = await prisma.paciente.findFirst({
    where: { telefono },
    select: { id: true, nombre: true },
  })

  if (!paciente) {
    console.error(`❌ No existe un paciente con teléfono ${telefono}.`)
    console.error('   Corre primero: npm run db:seed-demo')
    process.exit(1)
  }

  // Próxima cita sugerida: en una semana a las 4:00 PM
  const proximaCita = new Date()
  proximaCita.setDate(proximaCita.getDate() + 7)
  proximaCita.setHours(16, 0, 0, 0)

  const primerNombre = paciente.nombre.split(' ')[0]!
  const variables: VariablesPlantilla = {
    nombre: primerNombre,
    fecha_cita: proximaCita,
    hora_cita: '16:00', // reemplazarVariables la convierte a "4:00 PM"
  }

  type PasoSeguimiento =
    | { quien: 'sistema'; plantilla: TipoPlantilla; etiqueta: string }
    | { quien: 'sistema'; texto: string; tipo: TipoMensaje; etiqueta: string }
    | { quien: 'paciente'; texto: string }

  const secuencia: PasoSeguimiento[] = [
    {
      quien: 'sistema',
      plantilla: TipoPlantilla.AGRADECIMIENTO_CONSULTA,
      etiqueta: 'Agradecimiento post-consulta (se envía 2h después de la consulta)',
    },
    { quien: 'paciente', texto: 'Gracias doc! Quedé muy motivado 😊' },
    {
      quien: 'sistema',
      plantilla: TipoPlantilla.SEGUIMIENTO_INICIAL,
      etiqueta: 'Seguimiento inicial (4 días después de la consulta)',
    },
    { quien: 'paciente', texto: 'Muy bien! Ya me acostumbré a los horarios de comida, me siento con más energía 💪' },
    {
      quien: 'sistema',
      plantilla: TipoPlantilla.SEGUIMIENTO_INTERMEDIO,
      etiqueta: 'Seguimiento intermedio (a la mitad del periodo entre citas)',
    },
    {
      quien: 'sistema',
      plantilla: TipoPlantilla.SEGUIMIENTO_PREVIO_CITA,
      etiqueta: 'Aviso previo a la cita (8 días antes de la fecha sugerida)',
    },
    {
      quien: 'sistema',
      plantilla: TipoPlantilla.RECORDATORIO_AGENDAR,
      etiqueta: 'Recordatorio de agendar (1 día antes de la fecha sugerida)',
    },
    { quien: 'paciente', texto: 'Sí, confirmo a esa hora 👍' },
    {
      quien: 'sistema',
      tipo: 'AUTOMATICO_CONFIRMACION',
      texto: `¡Listo ${primerNombre}! ✅ Tu cita quedó agendada para el ${proximaCita.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' })} a las 4:00 PM.\n\nTe llegará un recordatorio un día antes. ¡Nos vemos! 🙌`,
      etiqueta: 'La IA agenda la cita automáticamente cuando el paciente confirma',
    },
  ]

  console.log(`🎬 Secuencia de seguimiento automático: ${paciente.nombre}`)
  console.log(`   ${secuencia.length} pasos, uno cada ~${intervaloSeg}s.`)
  console.log('   Abre el chat del paciente en /mensajes y empieza a grabar. Ctrl+C para detener.\n')

  for (let i = 0; i < secuencia.length; i++) {
    const paso = secuencia[i]!

    if (paso.quien === 'paciente') {
      await prisma.mensajeWhatsApp.create({
        data: {
          paciente_id: paciente.id,
          direccion: 'ENTRANTE',
          contenido: paso.texto,
          tipo: 'MANUAL',
          estado: 'ENTREGADO',
          leido: false,
          twilio_sid: nuevoSid(),
        },
      })
      console.log(`  📩 [${i + 1}/${secuencia.length}] Paciente: "${paso.texto}"`)
    } else {
      const contenido =
        'plantilla' in paso ? textoPlantillaReal(paso.plantilla, variables) : paso.texto
      const tipo: TipoMensaje =
        'plantilla' in paso ? obtenerCategoriaBD(paso.plantilla) : paso.tipo

      await prisma.mensajeWhatsApp.create({
        data: {
          paciente_id: paciente.id,
          direccion: 'SALIENTE',
          contenido,
          tipo,
          estado: 'ENTREGADO',
          leido: true,
          twilio_sid: nuevoSid(),
        },
      })
      console.log(`  🤖 [${i + 1}/${secuencia.length}] Sistema: ${paso.etiqueta}`)
    }

    await invalidarCache()

    if (i < secuencia.length - 1) {
      await sleep(intervaloSeg * 1000)
    }
  }

  console.log('\n🎉 Secuencia terminada. Para repetirla, corre demo:chats:limpiar y vuelve a empezar.')
}

// ============================================
// Modo: Consultas realistas para un paciente
// ============================================

const TEL_ALEXIS = '+5219515886761'

// Progresión de 8 meses: hombre joven, 1.75 m, de 88.4 kg a 78.6 kg
const CONSULTAS_PROGRESION = [
  { mes: 8, peso: 88.4, grasa: 27.8, musculo: 58.2, agua: 52.1, visceral: 11.0, cintura: 98.0, cadera: 105.0, brazoRel: 33.5, brazoFlex: 35.0, musloMax: 60.0, musloMed: 55.5, pantorrilla: 39.0, tricipital: 18.5, subescapular: 22.0, bicipital: 9.5, cresta: 24.0, supraespinal: 16.0, abdominal: 28.0, diamHumero: 7.2, diamFemur: 10.0, pliPantorrilla: 14.5 },
  { mes: 7, peso: 86.9, grasa: 26.9, musculo: 58.4, agua: 52.8, visceral: 10.5, cintura: 96.5, cadera: 104.0, brazoRel: 33.3, brazoFlex: 35.0, musloMax: 59.5, musloMed: 55.0, pantorrilla: 38.8, tricipital: 17.8, subescapular: 21.0, bicipital: 9.0, cresta: 23.0, supraespinal: 15.2, abdominal: 26.5, diamHumero: 7.2, diamFemur: 10.0, pliPantorrilla: 13.2 },
  { mes: 6, peso: 85.3, grasa: 26.0, musculo: 58.7, agua: 53.4, visceral: 10.0, cintura: 95.0, cadera: 103.0, brazoRel: 33.2, brazoFlex: 35.2, musloMax: 59.0, musloMed: 54.8, pantorrilla: 38.6, tricipital: 17.0, subescapular: 20.0, bicipital: 8.6, cresta: 22.0, supraespinal: 14.5, abdominal: 25.0, diamHumero: 7.2, diamFemur: 10.0, pliPantorrilla: 12.0 },
  { mes: 5, peso: 84.0, grasa: 25.1, musculo: 59.0, agua: 54.0, visceral: 9.5, cintura: 93.5, cadera: 102.0, brazoRel: 33.0, brazoFlex: 35.3, musloMax: 58.6, musloMed: 54.5, pantorrilla: 38.5, tricipital: 16.2, subescapular: 19.0, bicipital: 8.2, cresta: 21.0, supraespinal: 13.8, abdominal: 23.5, diamHumero: 7.2, diamFemur: 10.0, pliPantorrilla: 11.0 },
  { mes: 4, peso: 82.6, grasa: 24.3, musculo: 59.2, agua: 54.5, visceral: 9.0, cintura: 92.0, cadera: 101.0, brazoRel: 33.0, brazoFlex: 35.5, musloMax: 58.2, musloMed: 54.2, pantorrilla: 38.4, tricipital: 15.5, subescapular: 18.2, bicipital: 7.8, cresta: 20.0, supraespinal: 13.0, abdominal: 22.0, diamHumero: 7.2, diamFemur: 10.0, pliPantorrilla: 10.2 },
  { mes: 3, peso: 81.2, grasa: 23.4, musculo: 59.5, agua: 55.1, visceral: 8.5, cintura: 90.5, cadera: 100.0, brazoRel: 32.8, brazoFlex: 35.6, musloMax: 57.8, musloMed: 54.0, pantorrilla: 38.3, tricipital: 14.8, subescapular: 17.3, bicipital: 7.4, cresta: 19.0, supraespinal: 12.3, abdominal: 20.5, diamHumero: 7.2, diamFemur: 10.0, pliPantorrilla: 9.5 },
  { mes: 2, peso: 79.8, grasa: 22.5, musculo: 59.8, agua: 55.7, visceral: 8.0, cintura: 89.0, cadera: 99.0, brazoRel: 32.7, brazoFlex: 35.8, musloMax: 57.5, musloMed: 53.8, pantorrilla: 38.2, tricipital: 14.0, subescapular: 16.5, bicipital: 7.0, cresta: 18.0, supraespinal: 11.6, abdominal: 19.0, diamHumero: 7.2, diamFemur: 10.0, pliPantorrilla: 9.0 },
  { mes: 1, peso: 78.6, grasa: 21.7, musculo: 60.1, agua: 56.2, visceral: 7.5, cintura: 87.5, cadera: 98.5, brazoRel: 32.6, brazoFlex: 36.0, musloMax: 57.2, musloMed: 53.6, pantorrilla: 38.2, tricipital: 13.4, subescapular: 15.8, bicipital: 6.7, cresta: 17.2, supraespinal: 11.0, abdominal: 17.8, diamHumero: 7.2, diamFemur: 10.0, pliPantorrilla: 8.5 },
]

const NOTAS_HABITOS = [
  'Come 2 veces al día, ayuna por las mañanas por falta de tiempo. Alto consumo de refresco (1L diario) y comida rápida 3-4 veces por semana. Poca agua natural.',
  'Ya desayuna 4 días a la semana. Redujo refresco a 3 veces por semana. Aún cena muy tarde (después de las 10 pm).',
  'Logró 3 comidas al día entre semana. Cambió refresco por agua mineral. Fines de semana aún desordenados.',
  'Buena adherencia entre semana. Incorporó colaciones de fruta y almendras. Refresco solo ocasional en reuniones.',
  'Come 4-5 veces al día en horarios regulares. Prepara comida los domingos (meal prep). Hidratación de 2L diarios.',
  'Mantiene meal prep. Aprendió a elegir opciones en restaurantes. Sin refresco desde hace un mes.',
  'Hábitos consolidados. Desayuno completo diario con proteína. Refiere ya no antojarse de comida rápida.',
  'Excelente relación con la comida. Maneja bien eventos sociales sin salirse del plan. Hidratación adecuada.',
]

const OBSERVACIONES_EJERCICIO = [
  'Sedentario. Trabajo de oficina, sin actividad física estructurada.',
  'Inició caminatas de 20 min, 3 veces por semana.',
  'Caminata 30 min, 4 veces por semana. Se recomienda iniciar fuerza.',
  'Se inscribió al gimnasio. Rutina de fuerza 2 veces por semana + caminata.',
  'Gimnasio 3 veces por semana (fuerza) + 1 día de cardio. Buena técnica.',
  'Mantiene 4 días de entrenamiento. Aumentó cargas en ejercicios básicos.',
  'Entrena 4-5 días por semana. Nota mejoría en fuerza y resistencia.',
  'Rutina consolidada: 4 días fuerza + 2 caminatas. Muy buena condición general.',
]

const OBJETIVOS_TRATAMIENTO = [
  'Reducir peso corporal a ritmo de 1-1.5 kg/mes. Meta inicial: 85 kg. Establecer 3 comidas al día.',
  'Continuar déficit calórico moderado. Eliminar refresco progresivamente. Meta: 85 kg.',
  'Llegar a 84 kg. Reducir grasa visceral a menos de 10. Iniciar entrenamiento de fuerza.',
  'Meta: 82 kg al siguiente control. Mantener masa muscular con ingesta adecuada de proteína.',
  'Reducir % de grasa a menos de 24%. Conservar masa muscular durante el déficit.',
  'Meta: 80 kg. Cintura por debajo de 90 cm.',
  'Llegar a 78-79 kg. Consolidar hábitos para fase de mantenimiento.',
  'Transición a mantenimiento. Meta de composición: 20% de grasa conservando 60 kg de masa muscular.',
]

const PLANES_NUTRICIONALES = [
  'Plan de 2,200 kcal: 3 comidas + 1 colación. Proteína 1.6 g/kg. Sustitución de refresco por agua de fruta natural sin azúcar. Lista de intercambios entregada.',
  'Plan de 2,100 kcal: se agrega desayuno obligatorio (huevo, avena, fruta). Cena antes de las 9 pm. Colación de frutos secos.',
  'Plan de 2,100 kcal con distribución 40/30/30. Meal prep dominical: pollo, arroz integral, verduras asadas. Snacks de emergencia definidos.',
  'Plan de 2,000 kcal. Se incrementa proteína a 1.8 g/kg por inicio de fuerza. Carbohidrato peri-entrenamiento.',
  'Plan de 2,000 kcal, 5 tiempos. Batido post-entrenamiento (proteína + plátano). Guía para comer fuera de casa.',
  'Plan de 1,950 kcal. Recarga de carbohidratos los días de pierna. Se mantiene estructura de 5 tiempos.',
  'Plan de 1,950 kcal. Ajuste fino de porciones por mejor composición corporal. Introducción de postres fit 1 vez por semana.',
  'Plan de mantenimiento 2,300 kcal. Enfoque en sostenibilidad: regla 80/20, guías para vacaciones y eventos.',
]

function imcDe(peso: number, talla: number): number {
  return Math.round((peso / (talla * talla)) * 10) / 10
}

async function seedConsultas(telefono: string) {
  const paciente = await prisma.paciente.findFirst({
    where: { telefono },
    select: { id: true, nombre: true, _count: { select: { consultas: true } } },
  })

  if (!paciente) {
    console.error(`❌ No existe un paciente con teléfono ${telefono}.`)
    process.exit(1)
  }

  if (paciente._count.consultas > 0) {
    console.log(`⚠️  ${paciente.nombre} ya tiene ${paciente._count.consultas} consultas.`)
    console.log('   Para regenerarlas corre primero: npm run demo:chats -- --consultas-limpiar')
    return
  }

  console.log(`📋 Creando ${CONSULTAS_PROGRESION.length} consultas realistas para ${paciente.nombre}...\n`)

  const TALLA = 1.75

  for (let i = 0; i < CONSULTAS_PROGRESION.length; i++) {
    const c = CONSULTAS_PROGRESION[i]!
    const fecha = hace(c.mes * 30 - 7)
    fecha.setHours(17, 0, 0, 0)

    await prisma.consulta.create({
      data: {
        paciente_id: paciente.id,
        fecha,
        motivo: i === 0 ? 'Primera consulta: control de peso' : 'Control mensual de seguimiento',
        talla: TALLA,
        peso: c.peso,
        imc: imcDe(c.peso, TALLA),
        grasa_corporal: c.grasa,
        porcentaje_agua: c.agua,
        masa_muscular_kg: c.musculo,
        grasa_visceral: c.visceral,
        brazo_relajado: c.brazoRel,
        brazo_flexionado: c.brazoFlex,
        cintura: c.cintura,
        cadera_maximo: c.cadera,
        muslo_maximo: c.musloMax,
        muslo_medio: c.musloMed,
        pantorrilla_maximo: c.pantorrilla,
        diametro_humero: c.diamHumero,
        diametro_femur: c.diamFemur,
        pliegue_tricipital: c.tricipital,
        pliegue_subescapular: c.subescapular,
        pliegue_bicipital: c.bicipital,
        pliegue_cresta_iliaca: c.cresta,
        pliegue_supraespinal: c.supraespinal,
        pliegue_abdominal: c.abdominal,
        pliegue_pantorrilla: c.pliPantorrilla,
        notas: NOTAS_HABITOS[i]!,
        observaciones: OBSERVACIONES_EJERCICIO[i]!,
        objetivo: OBJETIVOS_TRATAMIENTO[i]!,
        plan: PLANES_NUTRICIONALES[i]!,
        diagnostico:
          i === 0
            ? 'Sobrepeso (IMC 28.9) con adiposidad central. Sin comorbilidades diagnosticadas. Refiere fatiga vespertina.'
            : i < 4
              ? 'Sobrepeso en reducción. Buena respuesta al tratamiento nutricional.'
              : 'Evolución favorable. Composición corporal en mejora continua, sin datos patológicos.',
        antecedentes_familiares:
          i === 0
            ? 'Padre con diabetes tipo 2 diagnosticada a los 48 años. Madre con hipertensión arterial. Abuelo paterno con obesidad.'
            : null,
        estudios_laboratorio:
          i === 0
            ? 'Química sanguínea: glucosa 94 mg/dL, colesterol total 205 mg/dL, triglicéridos 178 mg/dL, HDL 38 mg/dL. Se recomienda control en 6 meses.'
            : i === 6
              ? 'Control: glucosa 88 mg/dL, colesterol total 182 mg/dL, triglicéridos 130 mg/dL, HDL 45 mg/dL. Mejoría significativa del perfil lipídico.'
              : null,
        monto_consulta: 500.0,
        metodo_pago: i % 3 === 0 ? 'EFECTIVO' : 'TRANSFERENCIA',
        estado_pago: 'PAGADO',
      },
    })

    console.log(`  ✅ Hace ${c.mes} meses: ${c.peso} kg · ${c.grasa}% grasa · IMC ${imcDe(c.peso, TALLA)}`)
  }

  await deleteCachePattern('consultations:*')
  await deleteCachePattern('patient*')

  console.log(`\n🎉 Listo. Progreso total: -${(CONSULTAS_PROGRESION[0]!.peso - CONSULTAS_PROGRESION[7]!.peso).toFixed(1)} kg y -${(CONSULTAS_PROGRESION[0]!.grasa - CONSULTAS_PROGRESION[7]!.grasa).toFixed(1)}% de grasa en 8 meses.`)
  console.log('   Revisa la ficha del paciente y sus Gráficas de Progreso.')
}

async function limpiarConsultas(telefono: string) {
  const paciente = await prisma.paciente.findFirst({
    where: { telefono },
    select: { id: true, nombre: true },
  })

  if (!paciente) {
    console.error(`❌ No existe un paciente con teléfono ${telefono}.`)
    process.exit(1)
  }

  // Las consultas del script se crean sin cita asociada (cita_id null)
  const borradas = await prisma.consulta.deleteMany({
    where: { paciente_id: paciente.id, cita_id: null },
  })

  await deleteCachePattern('consultations:*')
  await deleteCachePattern('patient*')

  console.log(`🧹 ${borradas.count} consultas sin cita eliminadas de ${paciente.nombre}.`)
  console.log('   (Solo se borran consultas sin cita asociada; las ligadas a citas reales no se tocan.)')
}

// ============================================
// Modo 3: Limpieza
// ============================================

async function limpiar() {
  console.log('🧹 Limpiando datos demo de conversaciones...\n')

  const msgsPaciente = await prisma.mensajeWhatsApp.deleteMany({
    where: { twilio_sid: { startsWith: SID_PREFIX } },
  })
  console.log(`  🗑️  ${msgsPaciente.count} mensajes de pacientes eliminados`)

  const msgsProspecto = await prisma.mensajeProspecto.deleteMany({
    where: { twilio_sid: { startsWith: SID_PREFIX } },
  })
  console.log(`  🗑️  ${msgsProspecto.count} mensajes de prospectos eliminados`)

  const prospectos = await prisma.prospecto.deleteMany({
    where: { telefono: { in: PROSPECTOS_DEMO.map((p) => p.telefono) } },
  })
  console.log(`  🗑️  ${prospectos.count} prospectos demo eliminados`)

  await invalidarCache()
  console.log('\n✅ Limpieza completada. Los pacientes de seed-demo no se tocaron.')
}

// ============================================
// Main
// ============================================

async function main() {
  const args = process.argv.slice(2)

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag)
    return idx !== -1 ? args[idx + 1] : undefined
  }

  if (args.includes('--limpiar')) {
    await limpiar()
  } else if (args.includes('--live')) {
    const telefono = getArg('--telefono') ?? TEL_ANA
    const intervalo = Number(getArg('--intervalo') ?? 12)
    await modoLive(telefono, intervalo)
  } else if (args.includes('--seguimiento')) {
    const telefono = getArg('--telefono') ?? TEL_ANA
    const intervalo = Number(getArg('--intervalo') ?? 10)
    await modoSeguimiento(telefono, intervalo)
  } else if (args.includes('--consultas-limpiar')) {
    await limpiarConsultas(getArg('--telefono') ?? TEL_ALEXIS)
  } else if (args.includes('--consultas')) {
    await seedConsultas(getArg('--telefono') ?? TEL_ALEXIS)
  } else {
    await seedConversaciones()
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await closeRedis()
  })
