# Plantillas de WhatsApp para Meta Business Manager

Este documento contiene las plantillas que deben ser creadas y aprobadas en Meta Business Manager para el sistema de seguimiento nutricional automatizado.

---

## 📋 Plantillas de Seguimiento Post-Consulta

### 1. SEGUIMIENTO_INICIAL

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

### 2. SEGUIMIENTO_INTERMEDIO

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

### 3. SEGUIMIENTO_PREVIO_CITA

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

## 📅 Plantilla de Recordatorio

### 4. RECORDATORIO_AGENDAR

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

## 📊 Flujo de Mensajes según Tipo de Seguimiento

### SOLO_SEGUIMIENTO
Envía solo mensajes de seguimiento post-consulta:
1. ✅ SEGUIMIENTO_INICIAL (día 3-5)
2. ✅ SEGUIMIENTO_INTERMEDIO (mitad del periodo)
3. ✅ SEGUIMIENTO_PREVIO_CITA (7-10 días antes)

### SOLO_RECORDATORIO
Envía solo recordatorio para agendar:
1. ✅ RECORDATORIO_AGENDAR (3-5 días antes)

### RECORDATORIO_Y_SEGUIMIENTO
Envía todos los mensajes:
1. ✅ SEGUIMIENTO_INICIAL (día 3-5)
2. ✅ SEGUIMIENTO_INTERMEDIO (mitad del periodo)
3. ✅ SEGUIMIENTO_PREVIO_CITA (7-10 días antes)
4. ✅ RECORDATORIO_AGENDAR (3-5 días antes)

---

## 🔧 Instrucciones para Subir a Meta Business Manager

### Paso 1: Acceder a Meta Business Manager
1. Ve a https://business.facebook.com/
2. Inicia sesión con tu cuenta de Facebook Business
3. En el menú lateral, busca **"WhatsApp Manager"**

### Paso 2: Ir a Plantillas de Mensajes
1. Dentro de WhatsApp Manager, busca **"Message Templates"** o **"Plantillas de Mensajes"**
2. Haz clic en **"Create Template"** o **"Crear Plantilla"**

### Paso 3: Crear Cada Plantilla
Para cada una de las 4 plantillas arriba:

1. **Nombre**: Usa el nombre exacto (ej: `seguimiento_inicial`)
2. **Categoría**: Selecciona **UTILITY**
3. **Idioma**: Spanish (es)
4. **Contenido del Mensaje**:
   - Copia y pega el texto exacto
   - Donde dice {{1}}, {{2}}, {{3}}, en Meta debes agregar "variables" usando el botón de agregar variable
5. **Enviar para Aprobación**

### Paso 4: Esperar Aprobación
- Meta revisa las plantillas en **1-2 días** (a veces minutos)
- Recibirás una notificación cuando estén aprobadas
- **IMPORTANTE**: Guarda el **Content SID** de cada plantilla aprobada

### Paso 5: Copiar Content SIDs
Una vez aprobadas, cada plantilla tendrá un ID único que empieza con `HX...`

Ejemplo:
```
seguimiento_inicial → HXabc123def456...
seguimiento_intermedio → HXghi789jkl012...
seguimiento_previo_cita → HXmno345pqr678...
recordatorio_agendar → HXstu901vwx234...
```

**Guarda estos IDs** - los necesitaremos para configurar el sistema.

---

## ⚠️ Notas Importantes

1. **Emojis**: Meta permite emojis en las plantillas, pero revisa que se vean bien en la vista previa
2. **Variables**: El orden de las variables importa ({{1}}, {{2}}, {{3}})
3. **Categoría UTILITY**: Esta categoría es para recordatorios y seguimientos (lo correcto para nuestro caso)
4. **No editar después**: Una vez aprobada, no puedes editar. Tendrías que crear una nueva versión.

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas al crear las plantillas en Meta, avísame y te ayudo paso a paso.
