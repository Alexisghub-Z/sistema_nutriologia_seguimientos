/**
 * Base de Conocimiento para el Asistente de WhatsApp
 * Contiene toda la información que la IA puede usar para responder preguntas
 */

export const KNOWLEDGE_BASE = {
  // Información del Nutriólogo
  nutriologo: {
    nombre_completo: 'Lic. Eder Paúl Alavez Cortés',
    nombre_corto: 'Paul',
    nombre_publico: 'Paul Cortez', // Nombre que se usa en mensajes al público
    titulo: 'Nutriólogo Clínico | Maestro en Nutrición y Dietética',
    telefono_personal: '9511301554', // Número personal para atención directa
    experiencia_anos: '10+',
    descripcion:
      'Nutriólogo clínico con más de 10 años de experiencia ayudando a personas a mejorar su salud, su composición corporal y su calidad de vida a través de planes de alimentación personalizados, basados en ciencia y adaptados a cada estilo de vida.',
  },

  // Información del Consultorio
  consultorio: {
    ubicacion: 'Oaxaca de Juárez, Oaxaca',
    lugares_atencion: ['Consulta privada', 'Red OSMO'],
    horarios: 'Lunes a Viernes de 4:00 PM a 8:00 PM, Sábados de 8:00 AM a 7:00 PM',
    horarios_detallados: {
      lunes_viernes: {
        inicio: '16:00',
        fin: '20:00',
        formato_lectura: '4:00 PM a 8:00 PM',
      },
      sabado: {
        inicio: '08:00',
        fin: '19:00',
        formato_lectura: '8:00 AM a 7:00 PM',
      },
    },
    dias_atencion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    dias_no_atencion: ['Domingo'],
  },

  // Servicios y Precios
  servicios: {
    consulta_nutricional: {
      nombre: 'Consulta Nutricional',
      precio: 500,
      moneda: 'MXN',
      incluye: [
        'Evaluación nutricional completa y personalizada',
        'Análisis de composición corporal',
        'Plan de alimentación adaptado a tus objetivos, gustos y rutina',
        'Seguimiento continuo',
        'Educación nutricional para lograr cambios reales y duraderos',
      ],
      duracion_aproximada: '60 minutos',
    },
    modalidades: {
      presencial: 'Consulta presencial en consultorio',
      en_linea: 'Consulta en línea (videollamada)',
    },
  },

  // Formas de Pago
  formas_pago: ['Efectivo', 'Tarjeta', 'Transferencia'],

  // Contacto
  contacto: {
    emails: ['paul_nutricion@hotmail.com', 'paul.alavez@redosmo.com'],
    whatsapp_nota: 'Este es el número de WhatsApp del consultorio',
  },

  // Formación Académica
  formacion: {
    licenciatura: 'Licenciatura en Nutrición',
    posgrado: 'Maestro en Nutrición y Dietética',
    experiencia_profesional: [
      'Nutriólogo Clínico – Red OSMO (2018 – Actualidad)',
      'Consulta privada en Oaxaca (10+ años)',
      'Experiencia en investigación clínica nacional e internacional',
    ],
  },

  // Especialidades
  especialidades: {
    objetivo_general: [
      'Control de peso y composición corporal',
      'Pérdida de grasa corporal y mejora de imagen corporal',
      'Aumento de masa muscular',
      'Mejora de rendimiento físico y deportivo',
      'Aprender a comer mejor sin dietas extremas',
    ],
    enfermedades_cronicas: [
      'Cáncer',
      'Diabetes',
      'Enfermedad renal',
      'Hipertensión',
      'Colesterol y Triglicéridos altos',
      'Hígado graso',
      'Otras enfermedades metabólicas y crónicas',
    ],
  },

  // Por qué confiar
  ventajas: [
    'Formación universitaria y de posgrado en nutrición',
    'Más de 10 años de experiencia clínica real en hospital y consulta privada',
    'Actualización constante y participación en congresos nacionales e internacionales',
    'Trato cercano, profesional y centrado en el paciente',
    'Planes personalizados, no dietas genéricas',
    'Enfoque integral y seguro',
  ],

  // URLs importantes
  // SIEMPRE usar dominio de producción para respuestas de IA/WhatsApp
  // Esto asegura que los usuarios reciban links correctos incluso en desarrollo
  urls: {
    agendar: 'https://nutricionpaulcortez.com.mx/agendar',
    sitio_web: 'https://nutricionpaulcortez.com.mx',
  },
}

/**
 * Instrucciones del Sistema para la IA
 * Define el comportamiento, tono y límites del asistente
 */
export const SYSTEM_INSTRUCTIONS = `Eres el asistente virtual del consultorio de nutrición del Lic. Eder Paúl Alavez Cortés (puede llamarse "Paul" o "el nutriólogo").

## TU ROL:
- Eres amigable, profesional y servicial
- Tu objetivo es responder preguntas básicas sobre el consultorio
- NO eres el nutriólogo, eres su asistente
- Siempre hablas en primera persona del consultorio ("Ofrecemos", "Atendemos", "Nuestro horario es")

## LO QUE SÍ PUEDES RESPONDER:
✅ Información del consultorio (ubicación, horarios, contacto)
✅ Precios y formas de pago
✅ Servicios ofrecidos y qué incluyen
✅ Formación y experiencia del nutriólogo
✅ Cómo agendar citas
✅ Modalidades de consulta (presencial/en línea)
✅ Especialidades generales que se atienden
✅ Usar el nombre del paciente para personalizar la conversación (si está disponible en el contexto, úsalo para saludar y referirte a ellos)
✅ Información sobre su cita agendada (fecha, hora, código)
✅ Proporcionar links directos para gestionar su cita (confirmar/cancelar/reagendar)

## LO QUE NO PUEDES RESPONDER (DERIVA A HUMANO):
❌ Diagnósticos médicos o nutricionales
❌ Consejos nutricionales específicos ("¿Puedo comer X?", "¿Cuántas calorías debo consumir?")
❌ Cambios al plan nutricional de un paciente
❌ Interpretación de estudios médicos
❌ Recomendaciones de suplementos específicos
❌ Información sobre otros pacientes
❌ Preguntas sobre salud personal que requieren evaluación profesional

## TONO Y ESTILO:
- Usa lenguaje claro, natural y cercano, pero profesional
- Varía tus saludos: "Hola", "¡Hola!", "Qué tal", "Claro que sí", etc. (NO siempre el mismo)
- Usa emojis ocasionalmente para ser amigable (👋 🌿 📅 💪) pero sin exceso
- Sé breve pero completo
- Sé empático y valida las emociones del paciente:
  * Si están preocupados: "Entiendo tu preocupación..."
  * Si tienen dudas: "Es normal tener dudas sobre..."
  * Si están motivados: "¡Qué bueno que estés tomando este paso!"
- Usa frases naturales como:
  * "Claro que sí", "Con gusto", "Perfecto", "Excelente pregunta"
  * "Déjame ayudarte con eso", "Te cuento"
  * "Por supuesto", "Sin problema"
- Si detectas urgencia médica, indica buscar atención médica inmediata
- Siempre cierra con una pregunta abierta: "¿En qué más puedo ayudarte?", "¿Hay algo más que quieras saber?", "¿Tienes alguna otra duda?"

## FORMATO DE TEXTO PARA WHATSAPP:
- NO uses formato Markdown
- NO uses enlaces con formato [texto](url)
- Para URLs, escribe SOLO la URL directa: https://nutricionpaulcortez.com.mx/agendar
- WhatsApp convierte URLs automáticamente en enlaces clickeables
- Para énfasis usa *asteriscos* (ej: *Paul Cortez* se ve en negrita en WhatsApp)
- NO uses bloques de código ni formato técnico

## IMPORTANTE SOBRE URLs:
- Cuando proporciones enlaces para agendar citas, usa SIEMPRE: https://nutricionpaulcortez.com.mx/agendar
- Escribe la URL DIRECTAMENTE sin formato Markdown
- NO uses localhost ni otros dominios temporales
- El sitio web oficial es: https://nutricionpaulcortez.com.mx

## CUANDO NO ESTÉS SEGURO:
Si recibes una pregunta que no sabes responder o que podría ser nutricional:
1. Reconoce y valida la pregunta del paciente con empatía
2. Proporciona el número personal del nutriólogo Paul Cortez: 951 130 1554
3. Ofrece ayuda con información del consultorio mientras tanto

## EJEMPLOS DE DERIVACIÓN CON EMPATÍA:

Ejemplo 1 (Pregunta nutricional):
"Entiendo que quieras saber sobre [tema], es una excelente pregunta. Para darte una respuesta precisa y personalizada a tu caso, te recomiendo contactar directamente a:

📞 *Paul Cortez* (Nutriólogo)
Teléfono: *951 130 1554*

Él podrá evaluar tu situación específica y darte la mejor orientación. Mientras tanto, ¿hay algo sobre el consultorio (horarios, precios, agendar) en lo que pueda ayudarte?"

Ejemplo 2 (Duda sobre salud):
"Qué bueno que estás prestando atención a tu salud. Para responder tu pregunta sobre [tema] de forma profesional y segura, es mejor que hables directamente con:

📞 *Paul Cortez* (Nutriólogo)
Teléfono: *951 130 1554*

Él tiene más de 10 años de experiencia y podrá darte una respuesta personalizada. ¿Te gustaría saber algo más sobre cómo agendar tu consulta?"

## GESTIÓN DE CITAS (CONFIRMAR/CANCELAR/REAGENDAR):
Si el paciente tiene una cita agendada y pregunta sobre:
- "¿Puedo reagendar mi cita?"
- "Quiero cancelar mi cita" o "Necesito cancelar"
- "¿Cómo confirmo mi cita?"
- "Necesito cambiar la fecha"
- "No puedo asistir"

SIEMPRE proporciona la URL directa de gestión de cita que encontrarás en el contexto del paciente.
Esta URL les permite confirmar, cancelar o reagendar su cita de forma directa en una interfaz web visual.

IMPORTANTE: Ya NO manejamos cancelaciones por WhatsApp. TODO se hace desde la página web.

EJEMPLO REAGENDAR:
"Claro que sí María, puedes gestionar tu cita directamente desde aquí:

https://nutricionpaulcortez.com.mx/cita/ABC123

En esa página podrás:
✅ Reagendar para otra fecha
✅ Ver todos los detalles
✅ Confirmar o cancelar si lo necesitas

Tu cita actual es el sábado 8 de febrero a las 10:00 AM (Presencial).

¿Hay algo más en lo que pueda ayudarte?"

EJEMPLO CANCELAR:
"Entiendo María. Puedes cancelar tu cita directamente desde aquí:

https://nutricionpaulcortez.com.mx/cita/ABC123

En esa página verás los detalles de tu cita del sábado 8 de febrero a las 10:00 AM y podrás cancelarla de forma segura.

También podrás reagendar para otra fecha si lo prefieres.

¿Hay algo más en lo que pueda ayudarte?"

## IMPORTANTE:
- Nunca inventes información que no esté en la base de conocimiento
- Si no sabes algo, admítelo y deriva
- Mantén las respuestas concisas (máximo 3-4 párrafos)
- Siempre sé respetuoso y empático`

/**
 * Palabras clave que indican que se debe derivar a humano
 */
export const PALABRAS_DERIVAR = [
  // Nutricionales
  'dieta',
  'plan',
  'alimentación',
  'comer',
  'puedo comer',
  'debo comer',
  'alimento',
  'comida',
  'receta',
  'calorías',
  'proteína',
  'carbohidratos',
  'grasas',
  'macros',
  'ayuno',
  'keto',
  'vegetariano',
  'vegano',

  // Médicas
  'diagnóstico',
  'enfermedad',
  'síntoma',
  'dolor',
  'medicamento',
  'tratamiento',
  'análisis',
  'estudio',
  'resultado',
  'examen',
  'sangre',
  'glucosa',
  'colesterol',

  // Suplementos
  'suplemento',
  'vitamina',
  'proteína en polvo',
  'creatina',
  'quemador',
  'pastilla',

  // Plan específico
  'mi plan',
  'mi dieta',
  'lo que me dieron',
  'lo que me mandaron',
  'mi menú',
]

/**
 * Preguntas frecuentes pre-definidas
 */
export const FAQ = [
  {
    pregunta: '¿Cuánto cuesta la consulta?',
    respuesta: `Claro que sí, te cuento. La consulta nutricional tiene un costo de *$500 pesos*.

Incluye todo esto:
✅ Evaluación nutricional completa
✅ Análisis de composición corporal
✅ Plan personalizado adaptado a ti
✅ Seguimiento continuo

Es una inversión en tu salud con atención profesional. ¿Te gustaría ver disponibilidad para agendar?`,
  },
  {
    pregunta: '¿Dónde está ubicado el consultorio?',
    respuesta: `Con gusto! Nos encontramos en *Oaxaca de Juárez, Oaxaca*.

Atendemos en dos lugares:
📍 Consulta privada
📍 Red OSMO

¿Necesitas la dirección exacta de alguna de estas ubicaciones?`,
  },
  {
    pregunta: '¿Cuáles son los horarios?',
    respuesta: `Perfecto, te cuento los horarios:

📅 *Lunes a Viernes*
🕐 4:00 PM - 8:00 PM

📅 *Sábados*
🕐 8:00 AM - 7:00 PM

Los domingos no hay atención para que el consultorio descanse 😊

¿Quieres ver disponibilidad en tiempo real para agendar tu cita?`,
  },
  {
    pregunta: '¿Qué formas de pago aceptan?',
    respuesta: `Claro! Aceptamos varias formas de pago para tu comodidad:

💵 Efectivo
💳 Tarjeta
🏦 Transferencia

La que te sea más conveniente. ¿Hay algo más en lo que pueda ayudarte?`,
  },
  {
    pregunta: '¿Atienden en línea?',
    respuesta: `¡Por supuesto! Tenemos dos modalidades para adaptarnos a ti:

📍 *Presencial* - En consultorio
💻 *En línea* - Por videollamada

Tú eliges la que mejor te acomode según tu ubicación y disponibilidad.

¿Te gustaría agendar tu consulta?`,
  },
  {
    pregunta: '¿Cómo puedo agendar una cita?',
    respuesta: `¡Qué bueno que quieras agendar! Es muy fácil:

1️⃣ Desde nuestro sistema en línea (lo más rápido):
https://nutricionpaulcortez.com.mx/agendar

2️⃣ Aquí por WhatsApp y con gusto te ayudamos

El sistema en línea te muestra disponibilidad en tiempo real y puedes elegir tu horario preferido.

¿Te envío el link para que lo veas?`,
  },
]

/**
 * Obtiene respuesta de FAQ si coincide
 */
export function buscarEnFAQ(mensaje: string): string | null {
  const mensajeNormalizado = mensaje.toLowerCase().trim()

  // Buscar coincidencia en FAQ
  for (const faq of FAQ) {
    const preguntaNormalizada = faq.pregunta.toLowerCase()

    // Coincidencia exacta o parcial
    if (
      mensajeNormalizado.includes(preguntaNormalizada) ||
      preguntaNormalizada.includes(mensajeNormalizado)
    ) {
      return faq.respuesta
    }
  }

  return null
}

/**
 * Verifica si un mensaje contiene palabras que requieren derivar a humano
 */
export function requiereDerivacion(mensaje: string): boolean {
  const mensajeNormalizado = mensaje.toLowerCase()

  return PALABRAS_DERIVAR.some((palabra) => mensajeNormalizado.includes(palabra.toLowerCase()))
}
