# 🚀 Configuración de WhatsApp Business API para Producción

## 📋 Requisitos Previos

### 1. Facebook Business Manager Verificado
- URL: https://business.facebook.com
- Debes tener una cuenta de negocio verificada
- Necesitarás documentos oficiales de tu negocio

### 2. Información Requerida
- ✅ Nombre legal del negocio
- ✅ Dirección física del negocio
- ✅ Sitio web del negocio (opcional pero recomendado)
- ✅ Número de teléfono del negocio
- ✅ RFC o documentos oficiales
- ✅ Descripción del negocio y casos de uso de WhatsApp

---

## 🔧 Paso 1: Solicitar WhatsApp Business API

### A) Desde la Consola de Twilio

1. **Inicia sesión en Twilio**
   - URL: https://console.twilio.com

2. **Ve a Messaging → WhatsApp → Senders**
   - URL directa: https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders

3. **Haz clic en "Request Access" o "Get Started"**

4. **Completa el formulario de solicitud:**
   ```
   Business Display Name: [Nombre de tu negocio]
   Business Description: Servicios de nutriología y consultas nutricionales
   Business Category: Healthcare
   Business Website: [tu sitio web si tienes]
   ```

5. **Selecciona tu Facebook Business Manager ID**
   - Si no tienes uno, Twilio te guiará para crearlo

---

## 📱 Paso 2: Elegir el Número de WhatsApp

Tienes 2 opciones:

### Opción A: Usar un Número Twilio Nuevo
1. Compra un número de Twilio con capacidad SMS/MMS
2. **IMPORTANTE:** No todos los números soportan WhatsApp
3. Verifica que el número sea elegible para WhatsApp
4. Costo: ~$6-10 USD/mes + costos de mensajes

### Opción B: Usar tu Número de Negocio Existente
1. Puedes migrar tu número actual de WhatsApp Business
2. El número quedará vinculado SOLO a la API (no podrás usar la app)
3. **RECOMENDADO si ya tienes clientes en ese número**

**Para Oaxaca específicamente:**
- Los números mexicanos (+52 951...) SÍ soportan WhatsApp
- Asegúrate de que el número tenga capacidad "SMS" (no solo Voice)

---

## 📝 Paso 3: Verificar el Número

### Proceso de Verificación de Meta

1. **Meta enviará un código de verificación:**
   - Puede ser por SMS
   - O por llamada de voz
   - O usando un método de verificación de negocio

2. **Ingresa el código en el portal de Twilio/Meta**

3. **Espera la aprobación:**
   - Tiempo estimado: 24-48 horas
   - A veces puede ser instantáneo
   - Meta revisará tu negocio

---

## 🎯 Paso 4: Crear Perfil de Negocio WhatsApp

Una vez aprobado, configura tu perfil:

```
Business Display Name: [Nombre del Nutriólogo]
Business Description: Servicios profesionales de nutriología
Category: Health & Wellness
Business Address: [Dirección de Oaxaca]
Business Email: [email de contacto]
Business Website: [opcional]
```

**Importante:**
- El nombre del negocio debe coincidir con tus documentos oficiales
- La descripción debe ser clara y profesional
- La dirección debe ser real y verificable

---

## 📄 Paso 5: Crear y Aprobar Plantillas de Mensajes

### ¿Qué son las plantillas?

WhatsApp Business API **REQUIERE** que uses plantillas pre-aprobadas para mensajes proactivos (que tú inicias).

### Tipos de mensajes:

1. **Mensajes con plantilla** (Template Messages)
   - Necesitan aprobación de Meta
   - Usados para iniciar conversaciones
   - Ejemplos: Recordatorios, confirmaciones, notificaciones

2. **Mensajes de sesión** (Session Messages)
   - NO necesitan plantilla
   - Solo dentro de las 24 horas después de que el paciente te escriba
   - Pueden ser mensajes libres

### Crear plantillas en Twilio:

1. **Ve a Messaging → Content Templates**
   - URL: https://console.twilio.com/us1/develop/sms/content-editor

2. **Haz clic en "Create new Content Template"**

3. **Ejemplo de plantilla para confirmación de cita:**

```
Nombre de la plantilla: confirmacion_cita
Categoría: APPOINTMENT_UPDATE
Idioma: Spanish (es)

Contenido:
---
Hola {{1}},

Tu cita ha sido agendada para el {{2}} a las {{3}}.

📍 Modalidad: {{4}}
📋 Código de cita: {{5}}

Por favor confirma tu asistencia respondiendo SÍ a este mensaje.

¡Te esperamos! 🌿
---

Variables:
{{1}} = nombre del paciente
{{2}} = fecha de la cita
{{3}} = hora de la cita
{{4}} = tipo de cita (Presencial / En línea)
{{5}} = código de cita
```

4. **Envía para aprobación**
   - Meta revisará en 24-48 horas
   - Puede aprobar o rechazar
   - Si rechazan, te dirán por qué

### Plantillas que necesitarás crear:

Basándome en tu código, necesitas estas plantillas:

1. ✅ **Confirmación de cita** (ya existe en tu código)
2. ✅ **Recordatorio 24h** (ya existe en tu código)
3. ✅ **Recordatorio 1h** (ya existe en tu código)
4. ✅ **Seguimiento post-consulta** (varios tipos)

---

## 🔧 Paso 6: Actualizar tu Código

### A) Obtener los Content SIDs

Una vez que Meta apruebe tus plantillas, Twilio te dará un **Content SID** para cada una:

```
Ejemplo:
HXa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### B) Actualizar archivo `.env`

```env
# ============================================
# TWILIO WHATSAPP (PRODUCCIÓN)
# ============================================
TWILIO_ACCOUNT_SID="tu-account-sid-real"
TWILIO_AUTH_TOKEN="tu-auth-token-real"

# Tu número de WhatsApp aprobado (formato: whatsapp:+52...)
TWILIO_WHATSAPP_NUMBER="whatsapp:+529514420297"

# Webhook secret (generar uno nuevo para producción)
TWILIO_WEBHOOK_SECRET="tu-webhook-secret-nuevo"

# ============================================
# PLANTILLAS APROBADAS DE META (Content SIDs)
# ============================================
# Cambiar a 'true' para usar plantillas aprobadas
USE_APPROVED_TEMPLATES="true"

# Content SIDs de tus plantillas aprobadas
TEMPLATE_CONFIRMACION_SID="HXxxxxxxxxxxxxxxxxx"
TEMPLATE_RECORDATORIO_24H_SID="HXxxxxxxxxxxxxxxxxx"
TEMPLATE_RECORDATORIO_1H_SID="HXxxxxxxxxxxxxxxxxx"
TEMPLATE_SEGUIMIENTO_SID="HXxxxxxxxxxxxxxxxxx"
TEMPLATE_SEGUIMIENTO_INICIAL_SID="HXxxxxxxxxxxxxxxxxx"
TEMPLATE_SEGUIMIENTO_INTERMEDIO_SID="HXxxxxxxxxxxxxxxxxx"
TEMPLATE_SEGUIMIENTO_PREVIO_CITA_SID="HXxxxxxxxxxxxxxxxxx"
TEMPLATE_RECORDATORIO_AGENDAR_SID="HXxxxxxxxxxxxxxxxxx"
```

### C) Tu código ya está preparado

Tu archivo `/src/lib/services/whatsapp.ts` ya tiene la lógica para cambiar entre sandbox y producción:

```typescript
const useApprovedTemplates = process.env.USE_APPROVED_TEMPLATES === 'true'

if (useApprovedTemplates) {
  // Usa plantillas aprobadas de Meta (PRODUCCIÓN)
  const contentSid = process.env.TEMPLATE_CONFIRMACION_SID
  // ...
} else {
  // Usa mensajes libres (SANDBOX - DESARROLLO)
  body: mensajeTexto
}
```

---

## 🌐 Paso 7: Configurar Webhook en Producción

### A) Exponer tu servidor a internet

Para producción necesitas un dominio real. Opciones:

#### Opción 1: Vercel / Railway / Render (Recomendado)
```bash
# Desplegar en Vercel (gratis para Next.js)
npm install -g vercel
vercel

# Te dará una URL como:
# https://tu-app.vercel.app
```

#### Opción 2: Servidor propio con dominio
```
https://tudominio.com
```

### B) Configurar webhook en Twilio

1. **Ve a tu número de WhatsApp en Twilio**
2. **En "Messaging" → "Webhook":**
   ```
   When a message comes in:
   https://tudominio.com/api/webhooks/whatsapp

   HTTP Method: POST
   ```

### C) Verificar que funcione

Envía un mensaje de prueba a tu número de WhatsApp y verifica los logs.

---

## 💰 Costos de WhatsApp Business API

### Costos de Twilio + Meta:

1. **Número de teléfono:** ~$6-10 USD/mes
2. **Mensajes iniciados por el negocio (con plantilla):**
   - México: ~$0.0088 - $0.0165 USD por mensaje
   - Depende del tipo de plantilla (Marketing, Utility, Authentication)

3. **Mensajes de sesión (respuestas):**
   - Gratis durante las primeras 24 horas después de que el cliente te escriba
   - 1,000 conversaciones gratis por mes
   - Después: ~$0.0088 USD por conversación

4. **Sin mensajes salientes:** Gratis (solo cuando el paciente te escribe primero)

### Ejemplo de costo mensual estimado:

```
50 pacientes/mes con recordatorios:
- 50 confirmaciones de cita = $0.44 USD
- 50 recordatorios 24h = $0.44 USD
- 50 recordatorios 1h = $0.44 USD
- Número de teléfono = $6.00 USD
---
TOTAL: ~$7.32 USD/mes
```

---

## 📊 Paso 8: Monitoreo en Producción

### A) Dashboard de Twilio
- Monitorea mensajes enviados/fallidos
- URL: https://console.twilio.com/us1/monitor/logs/sms

### B) Logs de tu aplicación
Tu código ya tiene logs útiles:
```typescript
console.log('✅ Mensaje enviado:', sid)
console.error('❌ Error:', error)
```

### C) Scripts útiles que ya tienes:
```bash
# Ver estado de la cola de mensajes
npm run queue:status

# Ver plantillas disponibles
node scripts/ver-plantillas.js
```

---

## ⚠️ Limitaciones y Consideraciones

### 1. Límites de mensajes
- **Primeros días:** ~50 mensajes/día (límite temporal de Meta)
- **Después de verificación:** ~1,000 mensajes/día
- **Negocio verificado:** Sin límite (prácticamente)

### 2. Ventana de 24 horas
- Solo puedes iniciar conversaciones con plantillas aprobadas
- Después de que el paciente responde, tienes 24h de mensajes libres
- Pasadas 24h, necesitas otra plantilla para reiniciar

### 3. Políticas de Meta
- ❌ No spam
- ❌ No contenido sensible sin consentimiento
- ❌ No mensajes automáticos excesivos
- ✅ Solo notificaciones útiles y autorizadas

---

## 🎯 Checklist Final Antes de Producción

- [ ] Facebook Business Manager verificado
- [ ] WhatsApp Business API aprobado por Meta
- [ ] Número de teléfono verificado
- [ ] Perfil de negocio configurado
- [ ] Todas las plantillas aprobadas por Meta
- [ ] Content SIDs actualizados en `.env`
- [ ] `USE_APPROVED_TEMPLATES="true"` en `.env`
- [ ] Webhook configurado con URL de producción
- [ ] Pruebas exitosas de envío/recepción
- [ ] Monitoreo de logs funcionando

---

## 📞 ¿Necesitas Ayuda?

### Soporte de Twilio:
- Documentación: https://www.twilio.com/docs/whatsapp
- Soporte: https://support.twilio.com

### Soporte de Meta:
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
- Políticas: https://www.whatsapp.com/legal/business-policy

---

## 🚀 Siguientes Pasos

1. **Crea tu Facebook Business Manager** (si no tienes)
2. **Solicita acceso a WhatsApp Business API** desde Twilio
3. **Espera aprobación** (1-2 semanas)
4. **Crea plantillas** y envíalas para aprobación
5. **Actualiza tu `.env`** con los Content SIDs
6. **Despliega a producción** (Vercel/Railway/servidor)
7. **¡Listo para enviar mensajes reales!**

---

**Nota:** Este proceso puede tomar de 2-4 semanas la primera vez. Es normal que Meta sea estricto con las aprobaciones para evitar spam en WhatsApp.
