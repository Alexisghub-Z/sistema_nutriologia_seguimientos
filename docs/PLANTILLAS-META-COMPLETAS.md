# 📱 Plantillas Completas para Meta Business Manager

## 7 Plantillas para WhatsApp Business

Este documento contiene TODAS las plantillas necesarias para el sistema completo de mensajería automatizada.

---

## 📅 PLANTILLAS DE CITAS (3)

### 1. CONFIRMACION_CITA

**Nombre de la plantilla**: `confirmacion_cita`
**Categoría**: UTILITY
**Idioma**: Spanish (es)
**Cuándo se envía**: Inmediatamente al agendar una cita

**Contenido**:
```
✅ Cita confirmada

Hola {{1}}, tu cita ha sido agendada exitosamente.

📅 Fecha: {{2}}
🕐 Hora: {{3}}
📍 Consultorio Nutricional

🔑 Código de cita: {{4}}

Usa este código para ver, modificar o cancelar tu cita en:
{{5}}

Recibirás un recordatorio 24 horas antes.

Paul
Nutriólogo
```

**Variables**:
- {{1}} = Nombre del paciente
- {{2}} = Fecha de la cita (ej: "26 de Febrero, 2026")
- {{3}} = Hora de la cita (ej: "10:00 AM")
- {{4}} = Código de la cita
- {{5}} = URL del portal con código de cita

---

### 2. RECORDATORIO_24H

**Nombre de la plantilla**: `recordatorio_24h`
**Categoría**: UTILITY
**Idioma**: Spanish (es)
**Cuándo se envía**: 24 horas antes de la cita

**Contenido**:
```
🔔 Recordatorio de cita

Hola {{1}}, te recordamos tu cita:

📅 Mañana {{2}}
🕐 A las {{3}}
📍 Consultorio Nutricional

Por favor confirma:
1️⃣ - Confirmo que asistiré
2️⃣ - No puedo asistir

🔑 Código: {{4}}

Paul
Nutriólogo
```

**Variables**:
- {{1}} = Nombre del paciente
- {{2}} = Fecha de la cita
- {{3}} = Hora de la cita
- {{4}} = Código de la cita

---

### 3. RECORDATORIO_1H

**Nombre de la plantilla**: `recordatorio_1h`
**Categoría**: UTILITY
**Idioma**: Spanish (es)
**Cuándo se envía**: 1 hora antes de la cita

**Contenido**:
```
⏰ Tu cita es en 1 hora

Hola {{1}}, te esperamos en:

🕐 1 hora ({{2}})
📍 Consultorio Nutricional

¡Nos vemos pronto!

Paul
Nutriólogo
```

**Variables**:
- {{1}} = Nombre del paciente
- {{2}} = Hora de la cita

---

## 🥗 PLANTILLAS DE SEGUIMIENTO POST-CONSULTA (4)

### 4. SEGUIMIENTO_INICIAL

**Nombre de la plantilla**: `seguimiento_inicial`
**Categoría**: UTILITY
**Idioma**: Spanish (es)
**Cuándo se envía**: 3-5 días después de la consulta

**Contenido**:
```
Hola {{1}} 👋

¿Cómo has estado desde tu última consulta?

Espero que estés siguiendo bien tu plan nutricional. Si has tenido alguna duda o dificultad con las indicaciones, responde este mensaje.

¡Estoy aquí para ayudarte! 💪

Paul
Nutriólogo
```

**Variables**:
- {{1}} = Nombre del paciente

---

### 5. SEGUIMIENTO_INTERMEDIO

**Nombre de la plantilla**: `seguimiento_intermedio`
**Categoría**: UTILITY
**Idioma**: Spanish (es)
**Cuándo se envía**: A la mitad del periodo entre consultas

**Contenido**:
```
Hola {{1}} 👋

¿Cómo vas con tu plan nutricional? ¿Has notado algún cambio o mejora en cómo te sientes?

Si necesitas algún ajuste o tienes preguntas sobre tus alimentos, escríbeme.

¡Vas por buen camino! 🥗

Paul
Nutriólogo
```

**Variables**:
- {{1}} = Nombre del paciente

---

### 6. SEGUIMIENTO_PREVIO_CITA

**Nombre de la plantilla**: `seguimiento_previo_cita`
**Categoría**: UTILITY
**Idioma**: Spanish (es)
**Cuándo se envía**: 7-10 días antes de la fecha sugerida de próxima cita

**Contenido**:
```
Hola {{1}} 👋

Tu próxima cita de seguimiento se acerca (sugerida para {{2}}).

¿Cómo te has sentido con el plan? ¿Has tenido alguna dificultad?

Cualquier duda que tengas la resolveremos en tu próxima consulta. ¡Nos vemos pronto! 📊

Paul
Nutriólogo
```

**Variables**:
- {{1}} = Nombre del paciente
- {{2}} = Fecha sugerida (ejemplo: "26 de Febrero")

---

### 7. RECORDATORIO_AGENDAR

**Nombre de la plantilla**: `recordatorio_agendar`
**Categoría**: UTILITY
**Idioma**: Spanish (es)
**Cuándo se envía**: 3-5 días antes de la fecha sugerida

**Contenido**:
```
Hola {{1}} 👋

Te recuerdo que tu próxima cita de seguimiento nutricional está sugerida para el {{2}}.

Si aún no has agendado, puedes hacerlo aquí:
{{3}}

¡Te esperamos! 🗓️

Paul
Nutriólogo
```

**Variables**:
- {{1}} = Nombre del paciente
- {{2}} = Fecha sugerida (ejemplo: "26 de Febrero")
- {{3}} = URL del portal de agendamiento

---

## 🔧 Instrucciones para Crear en Meta Business Manager

### Paso 1: Acceder a Meta Business Manager
1. Ve a https://business.facebook.com/
2. Inicia sesión con tu cuenta de Facebook Business
3. En el menú lateral, busca **"WhatsApp Manager"**
4. Dentro de WhatsApp Manager, busca **"Message Templates"**

### Paso 2: Crear Cada Plantilla

Para **CADA UNA** de las 7 plantillas arriba:

1. Haz clic en **"Create Template"**
2. **Nombre**: Usa el nombre exacto (ej: `confirmacion_cita`)
3. **Categoría**: Selecciona **UTILITY**
4. **Idioma**: Spanish (es)
5. **Body (Contenido)**:
   - Copia y pega el texto exacto de arriba
   - Donde dice {{1}}, {{2}}, {{3}}, en Meta usa el botón **"Add Variable"**
   - Las variables DEBEN estar en el orden correcto
6. **Enviar para Aprobación**

### Paso 3: Esperar Aprobación
- Meta revisa en **1-2 días** (a veces minutos)
- Recibirás notificación por correo
- NO edites las plantillas después de enviarlas

### Paso 4: Copiar Content SIDs

Una vez aprobadas, GUARDA los Content SIDs de cada plantilla:

```
confirmacion_cita → HX________________
recordatorio_24h → HX________________
recordatorio_1h → HX________________
seguimiento_inicial → HX________________
seguimiento_intermedio → HX________________
seguimiento_previo_cita → HX________________
recordatorio_agendar → HX________________
```

### Paso 5: Configurar en .env

Agrega los Content SIDs a tu archivo `.env`:

```bash
# Activar uso de plantillas aprobadas
USE_APPROVED_TEMPLATES="true"

# Plantillas de citas
TEMPLATE_CONFIRMACION_SID="HX________________"
TEMPLATE_RECORDATORIO_24H_SID="HX________________"
TEMPLATE_RECORDATORIO_1H_SID="HX________________"

# Plantillas de seguimiento post-consulta
TEMPLATE_SEGUIMIENTO_INICIAL_SID="HX________________"
TEMPLATE_SEGUIMIENTO_INTERMEDIO_SID="HX________________"
TEMPLATE_SEGUIMIENTO_PREVIO_CITA_SID="HX________________"
TEMPLATE_RECORDATORIO_AGENDAR_SID="HX________________"
```

### Paso 6: Reiniciar Servicios

```bash
# Reiniciar el servidor
npm run dev

# Reiniciar el worker (en otra terminal)
npm run worker:dev
```

---

## ✅ Checklist de Implementación

- [ ] Crear 7 plantillas en Meta Business Manager
- [ ] Esperar aprobación de Meta (1-2 días)
- [ ] Copiar los 7 Content SIDs
- [ ] Agregar Content SIDs al archivo `.env`
- [ ] Cambiar `USE_APPROVED_TEMPLATES="true"` en `.env`
- [ ] Reiniciar servidor (`npm run dev`)
- [ ] Reiniciar worker (`npm run worker:dev`)
- [ ] Probar con una cita de prueba
- [ ] Probar con un seguimiento de prueba

---

## 🧪 Mientras Esperas Aprobación

Las plantillas YA están en la base de datos en modo sandbox:
- ✅ Puedes probar el sistema AHORA
- ⚠️ Solo funciona dentro de 24h después de que el paciente escribió
- ⚠️ NO funcionará para mensajes a largo plazo

Para usar modo sandbox:
```bash
# En tu .env
USE_APPROVED_TEMPLATES="false"
```

---

## 📊 Flujo Completo del Sistema

### Cuando se agenda una cita:
```
Ahora: Confirmación de cita
  ↓
24h antes: Recordatorio 24h
  ↓
1h antes: Recordatorio 1h
  ↓
Cita realizada
```

### Cuando se programa seguimiento:
```
Día 4: Seguimiento Inicial
  ↓
Día 15: Seguimiento Intermedio
  ↓
Día 22: Seguimiento Previo Cita
  ↓
Día 26: Recordatorio Agendar
  ↓
Día 30: Fecha sugerida
```

---

## 📞 ¿Problemas?

Si tienes problemas:
1. Verifica que los Content SIDs estén bien copiados
2. Asegúrate de que `USE_APPROVED_TEMPLATES="true"`
3. Reinicia servidor y worker
4. Revisa los logs del worker

**¡El sistema está listo para funcionar en cuanto tengas las plantillas aprobadas!**
