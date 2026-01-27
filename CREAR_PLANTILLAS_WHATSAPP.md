# 📝 Guía Rápida: Crear Plantillas de WhatsApp

## ¿Es difícil crear plantillas? NO

El proceso es bastante sencillo, solo requiere paciencia para las aprobaciones.

---

## 🚀 Crear Plantilla en Twilio (Paso a Paso)

### 1. Ve a Content Templates en Twilio

URL: https://console.twilio.com/us1/develop/sms/content-editor

### 2. Clic en "Create new Content Template"

### 3. Llenar el formulario:

#### Ejemplo Real: Confirmación de Cita

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASO 1: Información Básica
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Friendly Name:
  confirmacion_cita_nutriologo

Language:
  Spanish (es_MX)

Message Type:
  WhatsApp

Category (IMPORTANTE):
  APPOINTMENT_UPDATE

  Opciones:
  - TRANSACTIONAL: Confirmaciones, recibos
  - APPOINTMENT_UPDATE: Citas médicas (tu caso)
  - MARKETING: Promociones (más caro)
  - AUTHENTICATION: Códigos de verificación


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASO 2: Contenido del Mensaje
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Body (Texto del mensaje):
```

Hola {{1}}, tu cita ha sido agendada exitosamente.

📅 Fecha: {{2}}
🕐 Hora: {{3}}
📍 Modalidad: {{4}}

🔑 Código de cita: {{5}}

Por favor, confirma tu asistencia respondiendo a este mensaje.

¡Nos vemos pronto! 🌿

```

Variables:
  {{1}} = nombre del paciente
  {{2}} = fecha de la cita
  {{3}} = hora de la cita
  {{4}} = tipo (Presencial/En línea)
  {{5}} = código de cita

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASO 3: Botones de Acción (OPCIONAL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Puedes agregar botones interactivos:

[ Confirmar Asistencia ]  [tipo: QUICK_REPLY]
[ Cancelar Cita ]         [tipo: QUICK_REPLY]
[ Llamar al Nutriólogo ]  [tipo: PHONE_NUMBER]

Nota: Los botones son opcionales, pero mejoran la UX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4. Submit for Approval

Haces clic en "Submit" y esperas la aprobación de Meta.

---

## ⏱️ Tiempos de Aprobación

```
📤 Envío de plantilla: Instantáneo
     ↓
⏳ Meta revisa: 24-48 horas (usualmente)
     ↓
✅ Aprobada: Recibes notificación
     ↓
📋 Content SID generado: Listo para usar
```

**Nota:** A veces Meta aprueba en minutos, otras veces toma 2 días.

---

## 📋 Todas las Plantillas que Necesitas

Basado en tu código, aquí están las 8 plantillas que debes crear:

### 1. Confirmación de Cita Inicial
```
Nombre: confirmacion_cita_nutriologo
Categoría: APPOINTMENT_UPDATE
Uso: Cuando un paciente agenda una cita

Hola {{1}}, tu cita ha sido agendada exitosamente.

📅 Fecha: {{2}}
🕐 Hora: {{3}}
📍 Modalidad: {{4}}
🔑 Código: {{5}}

Por favor confirma tu asistencia respondiendo a este mensaje.

Variables:
{{1}} = nombre
{{2}} = fecha
{{3}} = hora
{{4}} = modalidad (Presencial/En línea)
{{5}} = código
```

### 2. Recordatorio 24 Horas Antes
```
Nombre: recordatorio_24h_cita
Categoría: APPOINTMENT_UPDATE

Hola {{1}}, te recordamos tu cita de mañana:

📅 Fecha: {{2}}
🕐 Hora: {{3}}
📍 Modalidad: {{4}}

Por favor confirma tu asistencia o avísanos si necesitas reagendar.

Variables:
{{1}} = nombre
{{2}} = fecha
{{3}} = hora
{{4}} = modalidad
```

### 3. Recordatorio 1 Hora Antes
```
Nombre: recordatorio_1h_cita
Categoría: APPOINTMENT_UPDATE

Hola {{1}}, tu cita es en 1 hora:

🕐 Hora: {{2}}
📍 Modalidad: {{3}}

{{4}}

¡Te esperamos! 🌿

Variables:
{{1}} = nombre
{{2}} = hora
{{3}} = modalidad
{{4}} = instrucciones adicionales (enlace Zoom o dirección)
```

### 4. Seguimiento Post-Consulta (Inicial - Día 1-3)
```
Nombre: seguimiento_inicial_postconsulta
Categoría: TRANSACTIONAL

Hola {{1}}, ¿cómo te sientes después de la consulta?

Recuerda seguir tu plan nutricional y tomar suficiente agua 💧

Si tienes dudas, responde este mensaje.

¡Vas muy bien! 💪

Variables:
{{1}} = nombre
```

### 5. Seguimiento Post-Consulta (Intermedio - Día 7-14)
```
Nombre: seguimiento_intermedio_postconsulta
Categoría: TRANSACTIONAL

Hola {{1}}, ¿cómo vas con tu plan nutricional?

Ya llevas {{2}} días, ¡sigue así! 🌟

¿Has notado cambios? Cuéntame respondiendo este mensaje.

Variables:
{{1}} = nombre
{{2}} = días transcurridos
```

### 6. Seguimiento Post-Consulta (Previo a Próxima Cita)
```
Nombre: seguimiento_previo_cita
Categoría: APPOINTMENT_UPDATE

Hola {{1}}, tu próxima cita sugerida es el {{2}}.

¿Te gustaría agendar?

Responde SÍ para confirmar o propón otra fecha.

Variables:
{{1}} = nombre
{{2}} = fecha sugerida
```

### 7. Recordatorio de Agendar (Sin Cita Próxima)
```
Nombre: recordatorio_agendar_cita
Categoría: APPOINTMENT_UPDATE

Hola {{1}}, han pasado {{2}} días desde tu última consulta.

¿Te gustaría agendar tu próxima cita?

Responde para coordinar tu cita. 📅

Variables:
{{1}} = nombre
{{2}} = días desde última consulta
```

### 8. Seguimiento General
```
Nombre: seguimiento_general
Categoría: TRANSACTIONAL

Hola {{1}},

{{2}}

Si tienes preguntas, no dudes en responder.

¡Estoy aquí para apoyarte! 🌿

Variables:
{{1}} = nombre
{{2}} = mensaje personalizado
```

---

## ✅ Checklist de Aprobación

Para que Meta apruebe tus plantillas más rápido:

### ✅ Hacer:
- [x] Usar variables {{1}}, {{2}}, etc. para personalización
- [x] Ser claro y profesional
- [x] Incluir información útil para el paciente
- [x] Usar categoría correcta (APPOINTMENT_UPDATE para citas)
- [x] Incluir opción de respuesta/contacto
- [x] Usar emojis con moderación (está permitido)

### ❌ Evitar:
- [ ] Lenguaje promocional excesivo ("OFERTA", "DESCUENTO")
- [ ] Texto muy genérico sin variables
- [ ] Mensajes muy largos (máx 1024 caracteres)
- [ ] Contenido sensible sin contexto médico
- [ ] Links externos no verificados
- [ ] Demasiados emojis (máx 2-3 por mensaje)

---

## 🔧 Cómo Obtener el Content SID

Una vez aprobada la plantilla:

### En Twilio Console:

1. Ve a Content Templates
2. Busca tu plantilla aprobada
3. Haz clic en ella
4. Verás el **Content SID**:

```
Content SID: HXa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
Status: approved ✅
```

5. Copia ese SID y pégalo en tu `.env`:

```env
TEMPLATE_CONFIRMACION_SID="HXa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

---

## 🎨 Vista Previa de Plantilla

Antes de enviar para aprobación, Twilio te muestra cómo se verá:

```
┌─────────────────────────────────────┐
│ 🌿 Nutrición Profesional            │
├─────────────────────────────────────┤
│                                     │
│ Hola Juan Pérez, tu cita ha sido   │
│ agendada exitosamente.              │
│                                     │
│ 📅 Fecha: lunes, 27 de enero       │
│ 🕐 Hora: 10:00 AM                  │
│ 📍 Modalidad: Presencial           │
│                                     │
│ 🔑 Código de cita: ABC12345        │
│                                     │
│ Por favor confirma tu asistencia   │
│ respondiendo a este mensaje.       │
│                                     │
│ ¡Nos vemos pronto! 🌿              │
│                                     │
│ [ Confirmar ]  [ Cancelar ]        │
└─────────────────────────────────────┘
```

---

## 🚨 ¿Qué pasa si Meta rechaza una plantilla?

### Razones comunes de rechazo:

1. **Muy genérica:** Agregar más variables personalizadas
2. **Categoría incorrecta:** Cambiar de MARKETING a TRANSACTIONAL
3. **Contenido promocional:** Quitar palabras como "oferta", "gratis"
4. **Sin contexto médico:** Aclarar que es para servicios de salud

### Cómo corregir:

1. Meta te dirá por qué rechazó
2. Edita la plantilla
3. Vuelve a enviar
4. Usualmente la segunda vez se aprueba

---

## 💡 Tips para Aprobación Rápida

### 1. Primera Plantilla
```
Empieza con la más simple: "Confirmación de Cita"
Esto te ayuda a entender el proceso antes de crear las demás.
```

### 2. Crea todas juntas
```
Una vez que entiendas el formato, crea las 8 plantillas
de una sola vez. Meta las revisará en paralelo.
```

### 3. Usa el mismo formato
```
Si Meta aprobó una plantilla con cierto estilo,
usa ese mismo estilo para las demás.
```

### 4. Documenta los Content SIDs
```
Crea un archivo para trackear tus plantillas:

plantillas-aprobadas.txt
━━━━━━━━━━━━━━━━━━━━━━━━━━
Confirmación:    HXabc123... ✅
Recordatorio 24h: HXdef456... ✅
Recordatorio 1h:  HXghi789... ⏳ (pendiente)
Seguimiento:     HXjkl012... ❌ (rechazado)
```

---

## 📊 Tiempo Total Estimado

```
Día 1: Crear las 8 plantillas (2-3 horas)
  ↓
Día 2-3: Meta revisa y aprueba (24-48h)
  ↓
Día 3: Actualizar .env con Content SIDs (10 min)
  ↓
Día 3: Probar envío de mensajes (30 min)
  ↓
✅ LISTO PARA PRODUCCIÓN
```

**Total: 3-4 días (la mayor parte es esperar aprobación)**

---

## 🎯 Resumen

- ✅ **Crear plantillas NO es difícil** (es como llenar un formulario)
- ✅ **La aprobación toma 1-2 días** (pero es automático)
- ✅ **Una vez aprobadas, son reutilizables** (no necesitas recrearlas)
- ✅ **Tu código ya está preparado** (solo necesitas los Content SIDs)

---

## 🚀 Próximo Paso

1. Compra el número de Twilio (con SMS/MMS)
2. Solicita WhatsApp Business API
3. Mientras esperas aprobación, crea las 8 plantillas
4. Una vez aprobado todo, actualiza tu `.env`
5. ¡Empieza a enviar mensajes reales!
