/**
 * Base de Conocimiento para el Asistente de WhatsApp
 * Contiene toda la información que la IA puede usar para responder preguntas
 */

export const KNOWLEDGE_BASE = {
  // Información del Nutriólogo
  nutriologo: {
    nombre_completo: 'Lic. Eder Paúl Alavez Cortés',
    nombre_corto: 'Paul',
    titulo: 'Nutriólogo Clínico | Maestro en Nutrición y Dietética',
    experiencia_anos: '10+',
    descripcion:
      'Nutriólogo clínico con más de 10 años de experiencia ayudando a personas a mejorar su salud, su composición corporal y su calidad de vida a través de planes de alimentación personalizados, basados en ciencia y adaptados a cada estilo de vida.',
  },

  // Información del Consultorio
  consultorio: {
    ubicacion: 'Oaxaca de Juárez, Oaxaca',
    lugares_atencion: ['Consulta privada', 'Red OSMO'],
    horarios: 'Lunes a Viernes de 9:00 AM a 6:00 PM',
    dias_atencion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
    dias_no_atencion: ['Sábado', 'Domingo'],
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
  urls: {
    agendar: process.env.NEXT_PUBLIC_APP_URL + '/agendar',
    sitio_web: process.env.NEXT_PUBLIC_APP_URL,
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

## LO QUE NO PUEDES RESPONDER (DERIVA A HUMANO):
❌ Diagnósticos médicos o nutricionales
❌ Consejos nutricionales específicos ("¿Puedo comer X?", "¿Cuántas calorías debo consumir?")
❌ Cambios al plan nutricional de un paciente
❌ Interpretación de estudios médicos
❌ Recomendaciones de suplementos específicos
❌ Información sobre otros pacientes
❌ Preguntas sobre salud personal que requieren evaluación profesional

## TONO Y ESTILO:
- Usa lenguaje claro y cercano, pero profesional
- Usa emojis ocasionalmente para ser amigable (👋 🌿 📅 💪)
- Sé breve pero completo
- Si detectas urgencia médica, indica buscar atención médica inmediata
- Siempre ofrece ayuda adicional al terminar

## CUANDO NO ESTÉS SEGURO:
Si recibes una pregunta que no sabes responder o que podría ser nutricional:
1. Reconoce la pregunta del paciente
2. Indica que Paul (el nutriólogo) le responderá personalmente
3. Ofrece ayuda con información del consultorio mientras tanto

## EJEMPLO DE DERIVACIÓN:
"Entiendo tu pregunta sobre [tema]. Para darte una respuesta precisa y personalizada, Paul te responderá personalmente. Mientras tanto, ¿hay algo sobre el consultorio (horarios, precios, agendar) en lo que pueda ayudarte?"

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
    respuesta: `El costo de la consulta nutricional es de $500 pesos.

Incluye:
- Evaluación nutricional completa
- Análisis de composición corporal
- Plan personalizado
- Seguimiento continuo

¿Te gustaría agendar una cita?`,
  },
  {
    pregunta: '¿Dónde está ubicado el consultorio?',
    respuesta: `Nos encontramos en Oaxaca de Juárez, Oaxaca.

Atendemos en:
- Consulta privada
- Red OSMO

¿Necesitas la dirección exacta para una de estas ubicaciones?`,
  },
  {
    pregunta: '¿Cuáles son los horarios?',
    respuesta: `Nuestros horarios de atención son:

📅 Lunes a Viernes
🕐 9:00 AM - 6:00 PM

No hay atención los sábados ni domingos.

¿Te gustaría ver disponibilidad y agendar?`,
  },
  {
    pregunta: '¿Qué formas de pago aceptan?',
    respuesta: `Aceptamos las siguientes formas de pago:

💵 Efectivo
💳 Tarjeta
🏦 Transferencia

¿Tienes alguna otra pregunta?`,
  },
  {
    pregunta: '¿Atienden en línea?',
    respuesta: `Sí, ofrecemos dos modalidades:

📍 Presencial - En consultorio
💻 En línea - Por videollamada

Puedes elegir la que mejor te acomode al momento de agendar.

¿Quieres agendar una consulta?`,
  },
  {
    pregunta: '¿Cómo puedo agendar una cita?',
    respuesta: `Para agendar tu cita puedes:

1. Usar nuestro sistema en línea: ${process.env.NEXT_PUBLIC_APP_URL}/agendar
2. Escribir aquí por WhatsApp y te ayudamos

El sistema en línea te muestra disponibilidad en tiempo real.

¿Prefieres que te envíe el link?`,
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
