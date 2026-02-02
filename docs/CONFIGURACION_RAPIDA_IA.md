# Configuración Rápida - IA para WhatsApp

## Pasos para Activar

### 1. Obtener API Key de OpenAI (5 minutos)

1. Ir a https://platform.openai.com/api-keys
2. Crear cuenta o iniciar sesión con Google
3. Click en "+ Create new secret key"
4. Darle un nombre: "Sistema WhatsApp Nutriologo"
5. Copiar la clave (empieza con `sk-proj-...`)
6. ⚠️ **IMPORTANTE:** Guardarla inmediatamente (no se vuelve a mostrar)

### 2. Agregar Crédito a OpenAI (Opcional)

OpenAI da $5 USD gratis para probar. Si quieres más:

1. Ir a https://platform.openai.com/settings/organization/billing
2. Click en "Add payment method"
3. Agregar tarjeta
4. Configurar límite mensual (recomendado: $10-20 USD)

### 3. Configurar en el Sistema

Editar archivo `.env` y agregar:

```env
# ============================================
# OPENAI / IA ASSISTANT
# ============================================
OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxx"
OPENAI_MODEL="gpt-4o"
OPENAI_TEMPERATURE="0.7"
OPENAI_MAX_TOKENS="500"
AI_CONFIDENCE_THRESHOLD="0.7"
AI_ENABLED="true"
```

### 4. Reiniciar Servidor

```bash
# Detener servidor (Ctrl+C)
# Iniciar de nuevo
npm run dev
```

### 5. Probar

Enviar mensaje de WhatsApp al número configurado:

```
Paciente: Hola, cuanto cuesta?
```

Deberías ver en logs:
```
🤖 Consultando OpenAI...
✅ Respuesta de OpenAI recibida
```

## Verificar que Funciona

### En los logs deberías ver:

```
📨 Procesando mensaje entrante:
  - paciente: Juan Pérez
  - mensaje: "cuanto cuesta la cons..."

🤖 Consultando OpenAI:
  - model: gpt-4o
  - temperatura: 0.7
  - maxTokens: 500
  - mensaje: "cuanto cuesta la cons..."
  - paciente: Juan Pérez

✅ Respuesta de OpenAI recibida:
  - tiempo: 1850ms
  - tokens: 156
  - longitud: 234

✅ Respuesta automática generada:
  - fuente: ia
  - confidence: 0.92
  - deriva_humano: false

📊 Log de respuesta IA:
  - paciente_id: cm4xyz...
  - fuente: ia
  - confidence: 0.92
  - tokens: 156
  - derivado: false
  - razon: "Respuesta generada por IA con confianza alta"
```

## Configuraciones Recomendadas

### Para Ahorrar Dinero (GPT-4o-mini)

```env
OPENAI_MODEL="gpt-4o-mini"
OPENAI_TEMPERATURE="0.5"
AI_CONFIDENCE_THRESHOLD="0.6"
```

**Costo:** ~$0.30 USD por 1000 mensajes

### Para Mejor Calidad (GPT-4o)

```env
OPENAI_MODEL="gpt-4o"
OPENAI_TEMPERATURE="0.7"
AI_CONFIDENCE_THRESHOLD="0.7"
```

**Costo:** ~$5.00 USD por 1000 mensajes

### Para Ser Conservador (deriva más a humano)

```env
AI_CONFIDENCE_THRESHOLD="0.8"
OPENAI_TEMPERATURE="0.5"
```

## Deshabilitar Temporalmente

```env
AI_ENABLED="false"
```

Todos los mensajes se derivarán a humano.

## Monitorear Costos

1. Ir a https://platform.openai.com/usage
2. Ver cuánto has gastado hoy/este mes
3. Configurar alertas si quieres

## FAQ Rápido

**¿Cuánto cuesta?**
- Con GPT-4o-mini: ~$0.30 por 1000 mensajes
- Con GPT-4o: ~$5.00 por 1000 mensajes

**¿La IA puede dar consejos nutricionales?**
- No. Automáticamente deriva esas preguntas a ti (el nutriólogo)

**¿Qué pasa si OpenAI falla?**
- El sistema deriva automáticamente a humano con un mensaje amable

**¿Puedo cambiar las respuestas?**
- Sí, editar `/src/lib/knowledge-base.ts`

**¿Cómo veo qué está respondiendo?**
- Todos los logs aparecen en consola con emojis 🤖

**¿Puedo desactivarlo?**
- Sí, `AI_ENABLED="false"` en `.env`

## Soporte

Si algo no funciona:
1. Revisar logs en consola
2. Verificar API Key es correcta
3. Verificar que la cuenta OpenAI tenga créditos
4. Leer documentación completa: `docs/SISTEMA_IA_WHATSAPP.md`
