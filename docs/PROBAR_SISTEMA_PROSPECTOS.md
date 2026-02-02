# Cómo Probar el Sistema de Prospectos

## 🧪 Pruebas Básicas

### 1. Primera Interacción (Prospecto Nuevo)

**Acción:**
- Usar un número de WhatsApp NO registrado
- Enviar: `Hola, cuánto cuesta la consulta?`

**Resultado Esperado:**
```
Hola! 👋

El costo de la consulta nutricional es de $500 pesos.

Incluye:
- Evaluación nutricional completa
- Análisis de composición corporal
- Plan personalizado
- Seguimiento continuo

Para agendar tu cita, puedes registrarte aquí:
[URL]

¿Tienes alguna otra pregunta?
```

**Verificar en BD:**
```sql
SELECT * FROM prospectos WHERE telefono = '+52XXXXXXXXXX';
-- Debe existir con total_mensajes = 1, estado = ACTIVO

SELECT * FROM mensajes_prospecto WHERE prospecto_id = 'xxx';
-- Debe tener 2 mensajes (1 entrante, 1 saliente)
```

---

### 2. Pregunta Nutricional (Derivación)

**Acción:**
- Enviar: `Puedo comer plátano si quiero bajar de peso?`

**Resultado Esperado:**
- Debe derivar a consulta profesional
- NO debe intentar responder la pregunta nutricional
- Debe invitar a agendar

**Palabras clave que activan derivación:**
- dieta, plan, alimentación, comer
- peso, kilos, adelgazar, bajar
- síntoma, dolor, enfermedad
- medicamento, tratamiento

---

### 3. Recordatorio de Registro (Mensaje #4)

**Acción:**
- Enviar 3 mensajes más (cualquier pregunta válida)
- En el 4to mensaje preguntar: `Qué formas de pago tienen?`

**Resultado Esperado:**
- La respuesta normal de FAQ
- **+ Recordatorio de registro al final**

```
Aceptamos:
💵 Efectivo
💳 Tarjeta
🏦 Transferencia

---

💡 ¿Listo para agendar tu consulta?

Regístrate aquí en 2 minutos y elige tu horario:
📋 [URL]

Una vez registrado podrás:
✅ Agendar y reagendar citas
✅ Recibir recordatorios automáticos
✅ Acceder a tu historial
✅ Confirmar/cancelar por WhatsApp
```

---

### 4. Intento de Enviar Multimedia

**Acción:**
- Enviar una imagen, PDF o cualquier archivo

**Resultado Esperado:**
```
Por favor envía solo mensajes de texto. Para enviar archivos
necesitas registrarte como paciente.

📋 Registrarte aquí: [URL]

¿Tienes alguna pregunta sobre el consultorio?
```

**Verificar:**
- El archivo NO debe guardarse en BD
- Solo se rechaza automáticamente

---

### 5. Límite Diario (20 mensajes)

**Acción:**
- Enviar 20 mensajes en el mismo día
- Intentar enviar el mensaje #21

**Resultado Esperado:**
```
Has alcanzado el límite de mensajes por hoy (20 mensajes).

Puedes volver a escribir mañana, o si necesitas información urgente:

📋 Registrarte: [URL]
📧 Email: paul_nutricion@hotmail.com

¡Gracias por tu paciencia!
```

**Verificar:**
- total_mensajes debe ser 20
- El mensaje #21 NO se procesa

---

### 6. Límite Total (70 mensajes)

**Acción:**
- Simular 70 mensajes históricos
- Intentar enviar el mensaje #71

**Resultado Esperado:**
```
Has alcanzado el límite de mensajes disponibles.

Para continuar recibiendo atención personalizada, te invitamos
a registrarte como paciente:

📋 Registrarse: [URL]

O contáctanos directamente:
📧 paul_nutricion@hotmail.com

¡Gracias por tu interés!
```

---

### 7. Uso de IA (Pregunta Compleja)

**Acción:**
- Enviar: `Atienden los martes por la tarde? trabajo de noche`

**Resultado Esperado:**
- Debe usar IA (no está en FAQ exactas)
- Debe generar respuesta contextual sobre horarios
- Debe incluir invitación a agendar

**Verificar en logs:**
```
🤖 Consultando OpenAI:
✅ Respuesta de OpenAI recibida:
  - tiempo: XXXXms
  - tokens: XXX
🤖 Respuesta automática de IA para prospecto
📊 Log de respuesta prospecto:
  - fuente: ia
  - confidence: 0.XX
```

---

### 8. Conversión a Paciente

**Acción:**
1. Tener un prospecto activo
2. Registrarlo como paciente en el sistema
3. Llamar a la función de conversión:

```typescript
import { convertirProspectoEnPaciente } from '@/lib/services/prospecto-responder'

await convertirProspectoEnPaciente(prospectoId, pacienteId)
```

4. Enviar mensaje desde el mismo número

**Resultado Esperado:**
```
Hola! 👋

Veo que ya te registraste como paciente en nuestro sistema.

Usa este mismo número de WhatsApp para comunicarte y recibirás
atención completa como paciente registrado.

¿En qué puedo ayudarte?
```

**Verificar en BD:**
```sql
SELECT * FROM prospectos WHERE id = 'xxx';
-- estado = REGISTRADO
-- convertido_a_paciente_id = 'yyy'
-- fecha_conversion = NOW()
```

---

## 🔍 Verificación en Base de Datos

### Ver todos los prospectos:
```sql
SELECT
  id,
  telefono,
  nombre,
  total_mensajes,
  estado,
  primer_contacto,
  ultimo_contacto
FROM prospectos
ORDER BY ultimo_contacto DESC;
```

### Ver mensajes de un prospecto:
```sql
SELECT
  direccion,
  contenido,
  createdAt
FROM mensajes_prospecto
WHERE prospecto_id = 'xxx'
ORDER BY createdAt ASC;
```

### Contar prospectos por estado:
```sql
SELECT
  estado,
  COUNT(*) as total
FROM prospectos
GROUP BY estado;
```

### Prospectos más activos:
```sql
SELECT
  telefono,
  total_mensajes,
  estado,
  ultimo_contacto
FROM prospectos
ORDER BY total_mensajes DESC
LIMIT 10;
```

---

## 📋 Checklist de Pruebas

- [ ] ✅ Prospecto nuevo recibe respuesta de FAQ
- [ ] ✅ Pregunta nutricional se deriva correctamente
- [ ] ✅ Recordatorio aparece en mensaje #4, #8, #12...
- [ ] ✅ Archivos multimedia son rechazados
- [ ] ✅ Límite de 20 mensajes/día funciona
- [ ] ✅ Límite de 70 mensajes total funciona
- [ ] ✅ IA genera respuestas para preguntas complejas
- [ ] ✅ Prospecto convertido en paciente recibe mensaje correcto
- [ ] ✅ Los logs muestran emojis 🆕 para prospectos
- [ ] ✅ Base de datos guarda mensajes correctamente

---

## 🐛 Problemas Comunes

### Problema: No se crea el prospecto
**Solución:**
- Verificar que Prisma está actualizado: `npx prisma generate`
- Verificar conexión a BD

### Problema: IA no responde
**Solución:**
- Verificar `OPENAI_API_KEY` en `.env`
- Verificar `AI_ENABLED="true"`
- Revisar logs de OpenAI

### Problema: No aparece recordatorio
**Solución:**
- Verificar que `total_mensajes % 4 === 0`
- Revisar logs: debe decir `debe_recordar_registro: true`

### Problema: Multimedia se acepta
**Solución:**
- Verificar que `numMedia > 0` se detecta correctamente
- Revisar webhook de Twilio

---

## 📊 Logs Importantes

Buscar en consola:

```bash
# Nuevo prospecto
"🆕 Procesando mensaje de prospecto"
"✅ Nuevo prospecto creado"

# Respuestas
"✅ Respuesta encontrada en FAQ para prospecto"
"🤖 Respuesta automática de IA para prospecto"

# Límites
"⚠️ Confianza baja para prospecto"
"Límite diario de mensajes alcanzado"
"Límite total de mensajes alcanzado"

# Conversión
"✅ Prospecto xxx convertido en paciente yyy"
```

---

## 🎯 Testing en Producción

**IMPORTANTE:** No usar números reales para testing en producción

**Recomendaciones:**
1. Usar Twilio Sandbox para pruebas
2. Tener números de prueba dedicados
3. Limpiar prospectos de prueba después
4. Monitorear costos de OpenAI

---

## 🔧 Limpiar Datos de Prueba

```sql
-- Eliminar prospecto de prueba
DELETE FROM mensajes_prospecto WHERE prospecto_id = 'xxx';
DELETE FROM prospectos WHERE telefono = '+52XXXXXXXXXX';

-- Resetear contadores
UPDATE prospectos
SET total_mensajes = 0, ultimo_contacto = NOW()
WHERE telefono = '+52XXXXXXXXXX';
```

---

## ✅ Testing Completado

Una vez que todas las pruebas pasen:

1. ✅ El sistema está listo para producción
2. ✅ Documentar cualquier comportamiento inesperado
3. ✅ Monitorear primeros días de uso real
4. ✅ Ajustar límites si es necesario
