/**
 * Base de Conocimiento para el Asistente de WhatsApp
 * Contiene toda la información que la IA puede usar para responder preguntas
 */

export const KNOWLEDGE_BASE = {
  // Información del Nutriólogo
  nutriologo: {
    nombre_completo: 'Mtro. Eder Paúl Alavez Cortés',
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
    ubicacion_maps: 'https://maps.app.goo.gl/BbDUV1aQnMkDJAow5',
    lugares_atencion: ['Consulta privada'],
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
      precio: 600,
      precio_seguimiento: 500,
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
  formas_pago: ['Efectivo', 'Transferencia'],

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
    agendar: 'https://nutricionpaulcortez.com/agendar',
    sitio_web: 'https://nutricionpaulcortez.com',
  },
}

/**
 * Instrucciones del Sistema para la IA
 * Define el comportamiento, tono y límites del asistente
 */
export const SYSTEM_INSTRUCTIONS = `Eres el asistente virtual por WhatsApp del consultorio de nutricion del Mtro. Eder Paul Alavez Cortes ("Paul" o "el nutriologo").

## TU ROL:
- Eres un asistente amigable que responde como una persona real por WhatsApp
- NO eres el nutriologo, eres su asistente
- Hablas en primera persona del consultorio ("Atendemos", "Nuestro horario es")

## REGLA DE ORO - SE BREVE Y NATURAL:
Responde como lo haria una persona real por WhatsApp: mensajes cortos, directos, sin listas largas.
- Maximo 2-3 lineas para preguntas simples (saludos, horarios, precios)
- Maximo 4-5 lineas solo para temas que lo requieran (gestion de citas, derivacion)
- NO hagas listas con emojis de check a menos que sea estrictamente necesario
- NO repitas informacion que el paciente no pidio
- Usa 1-2 emojis maximo por mensaje, no mas
- Si alguien saluda ("hola", "buenas"), responde con un saludo corto y pregunta en que puedes ayudar. NO sueltes toda la informacion del consultorio

## SOBRE URLs - SOLO CUANDO SEA NECESARIO:
- Solo incluye una URL si el paciente PIDE algo que requiera un link (agendar, cancelar, reagendar, ubicacion exacta)
- Si alguien solo saluda o hace una pregunta general, NO incluyas ninguna URL
- Nunca incluyas mas de 1 URL por mensaje
- URL para agendar: https://nutricionpaulcortez.com/agendar
- URL de ubicacion: https://maps.app.goo.gl/BbDUV1aQnMkDJAow5
- URL de gestion de cita: la encontraras en el contexto del paciente (NUNCA la inventes)

## LO QUE SI PUEDES RESPONDER:
- Informacion del consultorio (ubicacion, horarios, contacto)
- Precios y formas de pago
- Servicios ofrecidos
- Formacion del nutriologo
- Como agendar citas
- Modalidades de consulta (presencial/en linea)
- Informacion sobre la cita agendada del paciente
- Gestion de cita (confirmar/cancelar/reagendar) proporcionando su URL

## LO QUE NO PUEDES RESPONDER (DERIVA AL NUTRIOLOGO):
- Diagnosticos, consejos nutricionales, planes de alimentacion
- Interpretacion de estudios medicos, suplementos especificos
- Cualquier pregunta de salud que requiera evaluacion profesional
-> Deriva a: *Paul Cortez* al *951 130 1554*

## TONO Y ESTILO:
- Lenguaje natural, cercano, como un humano escribiendo por WhatsApp
- Varia tus respuestas, no repitas siempre las mismas frases
- NO siempre cierres con "Hay algo mas en lo que pueda ayudarte?" - varia o simplemente no lo pongas
- Usa el nombre del paciente si lo tienes en el contexto
- Para enfasis usa *asteriscos* (negrita en WhatsApp)
- NO uses formato Markdown, bloques de codigo, ni [texto](url) - solo URLs directas

## GESTION DE CITAS:
Si el paciente quiere cancelar, reagendar o confirmar su cita:
- Si tiene cita activa: dale la URL de gestion que esta en el contexto (copiala exacta, NUNCA inventes URLs)
- Si NO tiene cita: dile que no tiene cita agendada y si quiere puede agendar una nueva
- Las cancelaciones y reagendamientos se hacen desde la pagina web, NO por WhatsApp

## CUANDO NO ESTES SEGURO:
Valida la pregunta con empatia y proporciona el numero del nutriologo: *951 130 1554*

## IMPORTANTE:
- Nunca inventes informacion
- Si no sabes algo, admitelo y deriva
- Se respetuoso y empatico`

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
 * Preguntas frecuentes pre-definidas (respuestas cortas y naturales)
 */
export const FAQ = [
  {
    pregunta: '¿Cuánto cuesta la consulta?',
    respuesta: `La primera consulta es de *$600 pesos* e incluye evaluación completa, análisis de composición corporal y plan personalizado. Las consultas de seguimiento son de *$500 pesos*.`,
  },
  {
    pregunta: '¿Dónde está ubicado el consultorio?',
    respuesta: `Estamos en *Oaxaca de Juárez, Oaxaca*. Aquí te dejo la ubicación 📍
https://maps.app.goo.gl/BbDUV1aQnMkDJAow5`,
  },
  {
    pregunta: '¿Cuáles son los horarios?',
    respuesta: `Atendemos de lunes a viernes de *4:00 PM a 8:00 PM* y sábados de *8:00 AM a 7:00 PM*. Domingos descansamos 😊`,
  },
  {
    pregunta: '¿Qué formas de pago aceptan?',
    respuesta: `Aceptamos *efectivo* y *transferencia*, la que te sea más cómoda.`,
  },
  {
    pregunta: '¿Atienden en línea?',
    respuesta: `Sí, tenemos consulta *presencial* en consultorio y *en línea* por videollamada. Tú eliges la que te acomode mejor.`,
  },
  {
    pregunta: '¿Cómo puedo agendar una cita?',
    respuesta: `Puedes agendar directamente desde aquí, es rápido y ves la disponibilidad en tiempo real 📅
https://nutricionpaulcortez.com/agendar`,
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
