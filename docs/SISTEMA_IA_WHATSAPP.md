# Sistema de IA para Respuestas Automáticas en WhatsApp

## Descripción General

Este sistema usa OpenAI GPT-4o para responder automáticamente preguntas frecuentes de pacientes por WhatsApp dentro de la ventana de 24 horas.

## Características

- **Respuestas automáticas inteligentes** a preguntas sobre el consultorio
- **Derivación automática** cuando detecta preguntas nutricionales/médicas
- **FAQ integradas** para respuestas instantáneas
- **Contexto del paciente** (citas, historial, consultas previas)
- **Sistema de confianza** para decidir cuándo responder o derivar
- **Logs detallados** de todas las interacciones
- **Fallback robusto** si OpenAI falla

## Flujo de Decisión

```
Mensaje entrante
    ↓
¿Es respuesta a cita? (confirmar/cancelar)
    → SÍ → Sistema actual ✅
    → NO ↓
¿Contiene palabras nutricionales/médicas?
    → SÍ → Deriva a humano 👨‍⚕️
    → NO ↓
¿Coincide con FAQ exacta?
    → SÍ → Responde FAQ ⚡
    → NO ↓
¿IA está configurada?
    → NO → Deriva a humano 👨‍⚕️
    → SÍ ↓
Consultar OpenAI con contexto
    ↓
¿Confianza >= umbral?
    → NO → Deriva a humano 👨‍⚕️
    → SÍ ↓
¿IA sugiere derivar?
    → SÍ → Deriva a humano 👨‍⚕️
    → NO → Responde automáticamente 🤖
```

## Configuración

### 1. Obtener API Key de OpenAI

1. Ir a https://platform.openai.com/api-keys
2. Crear cuenta o iniciar sesión
3. Click en "Create new secret key"
4. Copiar la clave (empieza con `sk-`)
5. ⚠️ IMPORTANTE: Guardarla de inmediato (no se vuelve a mostrar)

### 2. Configurar Variables de Entorno

Agregar al archivo `.env`:

```env
# ============================================
# OPENAI / IA ASSISTANT
# ============================================
# API Key de OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxxxxxxx"

# Modelo a usar
OPENAI_MODEL="gpt-4o"

# Temperatura (0.0-1.0)
OPENAI_TEMPERATURE="0.7"

# Máximo de tokens por respuesta
OPENAI_MAX_TOKENS="500"

# Umbral de confianza (0.0-1.0)
AI_CONFIDENCE_THRESHOLD="0.7"

# Habilitar IA
AI_ENABLED="true"
```

### 3. Reiniciar Servidor

```bash
npm run dev
```

## Modelos Disponibles

### GPT-4o (Recomendado)
- **Costo:** ~$0.005 por mensaje
- **Velocidad:** 2-3 segundos
- **Inteligencia:** ⭐⭐⭐⭐⭐
- **Uso:** Mejor para conversaciones complejas, manejo de objeciones

### GPT-4o-mini (Económico)
- **Costo:** ~$0.0003 por mensaje (10x más barato)
- **Velocidad:** 1-2 segundos
- **Inteligencia:** ⭐⭐⭐⭐
- **Uso:** Suficiente para FAQ básicas

### Cambiar de modelo

Solo editar `.env`:
```env
# Para usar el más económico
OPENAI_MODEL="gpt-4o-mini"

# Para usar el más inteligente
OPENAI_MODEL="gpt-4o"
```

## Qué Puede Responder la IA

### ✅ SÍ PUEDE
- Precio de consulta
- Horarios de atención
- Ubicación del consultorio
- Formas de pago
- Modalidades (presencial/en línea)
- Cómo agendar citas
- Experiencia del nutriólogo
- Servicios ofrecidos
- Estado de su próxima cita

### ❌ NO PUEDE (Deriva a Humano)
- Diagnósticos médicos
- Consejos nutricionales específicos
- "¿Puedo comer X?"
- Cambios al plan nutricional
- Interpretación de estudios
- Recomendaciones de suplementos
- Información médica personal

## Ejemplos de Conversaciones

### Ejemplo 1: Pregunta Simple
```
Paciente: cuanto cuesta
IA: Hola 👋

El costo de la consulta nutricional es de $500 pesos.

Incluye:
- Evaluación nutricional completa
- Análisis de composición corporal
- Plan personalizado
- Seguimiento continuo

¿Te gustaría agendar una cita?

[Fuente: FAQ, Confianza: 100%]
```

### Ejemplo 2: Pregunta Compleja
```
Paciente: trabajo de noche y solo puedo martes o jueves tarde, me atiendes?
IA: ¡Perfecto! Sí puedo atenderte.

Trabajo de Lunes a Viernes de 9:00 AM a 6:00 PM, así que tanto martes como jueves en la tarde están disponibles.

Para ver los horarios exactos esos días, puedes agendar aquí:
[URL]

¿Te ayudo con algo más?

[Fuente: IA, Confianza: 92%]
```

### Ejemplo 3: Pregunta Nutricional
```
Paciente: puedo comer plátano en mi dieta?
IA: Hola María 👋

Para responderte correctamente sobre qué puedes comer en tu plan, necesito que Paul revise tu caso específico.

Te responderá personalmente para darte información precisa según tus objetivos.

¿Tienes alguna pregunta sobre horarios o el consultorio mientras tanto?

[Fuente: IA, Deriva a humano: SÍ]
```

## Monitoreo y Logs

Cada respuesta de IA genera logs:

```
🤖 Consultando OpenAI:
  - Modelo: gpt-4o
  - Mensaje: "cuanto cuesta la consul..."
  - Paciente: María González

✅ Respuesta de OpenAI recibida:
  - Tiempo: 1850ms
  - Tokens: 156
  - Longitud: 234 caracteres

📊 Log de respuesta IA:
  - Fuente: ia
  - Confidence: 0.92
  - Tokens: 156
  - Derivado: false
  - Razón: "Respuesta generada por IA con confianza alta"
```

## Sistema de Confianza

La IA calcula un score de confianza (0-1) basado en:

- **Longitud de respuesta** (muy corta = menor confianza)
- **Palabras de incertidumbre** ("no estoy seguro", "tal vez")
- **Estructura** (listas, números, emojis = mayor confianza)
- **Completitud** (respuesta completa vs cortada)

Si confianza < umbral (default: 0.7) → Deriva a humano

## Costos Estimados

### Con GPT-4o
- 50 mensajes/mes: ~$0.25 USD
- 100 mensajes/mes: ~$0.50 USD
- 500 mensajes/mes: ~$2.50 USD
- 1000 mensajes/mes: ~$5.00 USD

### Con GPT-4o-mini
- 50 mensajes/mes: ~$0.02 USD
- 100 mensajes/mes: ~$0.03 USD
- 500 mensajes/mes: ~$0.15 USD
- 1000 mensajes/mes: ~$0.30 USD

## Personalización

### Modificar Base de Conocimiento

Editar `/src/lib/knowledge-base.ts`:

```typescript
export const KNOWLEDGE_BASE = {
  servicios: {
    consulta_nutricional: {
      precio: 500, // Cambiar precio aquí
      // ...
    }
  }
}
```

### Agregar Nuevas FAQ

```typescript
export const FAQ = [
  {
    pregunta: '¿Nueva pregunta?',
    respuesta: 'Nueva respuesta...'
  }
]
```

### Modificar Palabras de Derivación

```typescript
export const PALABRAS_DERIVAR = [
  'dieta',
  'plan',
  // Agregar más palabras...
]
```

## Deshabilitar IA

### Opción 1: Variable de entorno
```env
AI_ENABLED="false"
```

### Opción 2: Eliminar API Key
```env
# OPENAI_API_KEY="sk-..."
```

Cuando está deshabilitada, todos los mensajes se derivan a humano.

## Solución de Problemas

### Error: "OpenAI no está configurado"
- Verificar que `OPENAI_API_KEY` esté en `.env`
- Verificar que `AI_ENABLED="true"`
- Reiniciar servidor

### Error: "Invalid API Key"
- Verificar que la clave sea correcta
- Verificar que la cuenta tenga créditos
- Generar nueva clave en OpenAI

### Respuestas muy genéricas
- Aumentar temperatura: `OPENAI_TEMPERATURE="0.9"`
- Cambiar a modelo más inteligente: `OPENAI_MODEL="gpt-4o"`

### Respuestas muy creativas/incorrectas
- Reducir temperatura: `OPENAI_TEMPERATURE="0.5"`
- Aumentar umbral de confianza: `AI_CONFIDENCE_THRESHOLD="0.8"`

### Deriva mucho a humano
- Reducir umbral: `AI_CONFIDENCE_THRESHOLD="0.6"`
- Verificar palabras de derivación en `knowledge-base.ts`

## Seguridad

- ✅ La IA NUNCA accede a información de otros pacientes
- ✅ Solo usa información pública del consultorio
- ✅ Deriva automáticamente preguntas médicas/nutricionales
- ✅ Logs de todas las respuestas para auditoría
- ✅ Umbral de confianza para evitar respuestas incorrectas

## Próximas Mejoras

- [ ] Dashboard de métricas de IA
- [ ] A/B testing de modelos
- [ ] Feedback de pacientes sobre respuestas
- [ ] Fine-tuning con conversaciones reales
- [ ] Detección de urgencias médicas
- [ ] Respuestas en otros idiomas

## Soporte

Si tienes problemas, revisar logs en consola:
```bash
npm run dev
```

Los logs mostrarán cada paso del procesamiento con emojis:
- 🤖 Consultando IA
- ✅ Respuesta exitosa
- ⚠️ Advertencia
- ❌ Error
- 📊 Log de métricas
