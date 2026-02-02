# Sistema de Prospectos - Documentación

## 📋 Descripción General

El sistema de prospectos permite que personas NO registradas puedan interactuar con el chatbot de WhatsApp, recibir información del consultorio y ser convertidos en pacientes.

## 🎯 Características Principales

### ✅ Lo que pueden hacer los prospectos:
- Preguntar sobre precios, horarios, ubicación
- Recibir respuestas de FAQ instantáneas
- Usar IA con contexto limitado (sin historial de paciente)
- Recibir invitaciones a registrarse
- Consultar información general del consultorio

### ❌ Lo que NO pueden hacer los prospectos:
- Agendar citas (deben registrarse primero)
- Confirmar/cancelar citas
- Acceder a historial médico
- Recibir consejos nutricionales personalizados
- Enviar archivos multimedia (solo texto)

## 📊 Estructura de Base de Datos

### Tabla `prospectos`
```sql
- id: String (cuid)
- telefono: String (único)
- nombre: String? (opcional)
- primer_contacto: DateTime
- ultimo_contacto: DateTime
- total_mensajes: Int
- estado: EstadoProspecto (ACTIVO, REGISTRADO, BLOQUEADO)
- convertido_a_paciente_id: String?
- fecha_conversion: DateTime?
- notas: String? (para el nutriólogo)
```

### Tabla `mensajes_prospecto`
```sql
- id: String (cuid)
- prospecto_id: String
- direccion: DireccionMensaje (ENTRANTE, SALIENTE)
- contenido: String
- twilio_sid: String?
- estado: EstadoMensaje
- media_url: String? (no usado para prospectos)
- media_type: String? (no usado para prospectos)
- createdAt: DateTime
```

## 🚦 Límites y Restricciones

```typescript
const LIMITES_PROSPECTO = {
  MAX_MENSAJES_POR_DIA: 20,        // Máximo 20 mensajes por día
  MAX_MENSAJES_TOTAL: 70,          // Máximo 70 mensajes históricos
  RECORDATORIO_REGISTRAR_CADA: 4,  // Cada 4 mensajes recordar registrarse
  MAX_CONSULTAS_IA_POR_DIA: 10,    // Máximo 10 consultas a IA por día
  TIEMPO_EXPIRACION_DIAS: 30,      // Expiración después de 30 días inactivo
}
```

## 🔄 Flujo de Procesamiento

```
1. Mensaje entrante a Twilio
   ↓
2. ¿Existe como PACIENTE?
   → SÍ: Procesar como paciente (flujo normal)
   → NO: ↓
   ↓
3. ¿Tiene archivos multimedia?
   → SÍ: Rechazar (solo texto para prospectos)
   → NO: ↓
   ↓
4. Buscar o crear PROSPECTO
   ↓
5. Validar estado del prospecto
   - BLOQUEADO: Enviar mensaje de rechazo
   - REGISTRADO: Informar que ya es paciente
   - ACTIVO: Continuar ↓
   ↓
6. Validar límites
   - ¿Excede 70 mensajes total?: Límite alcanzado
   - ¿Excede 20 mensajes hoy?: Límite diario alcanzado
   - OK: Continuar ↓
   ↓
7. Incrementar contador de mensajes
   ↓
8. ¿Mensaje contiene palabras nutricionales?
   → SÍ: Derivar a consulta profesional
   → NO: ↓
   ↓
9. ¿Coincide con FAQ?
   → SÍ: Responder FAQ + recordatorio si corresponde
   → NO: ↓
   ↓
10. ¿IA configurada?
    → NO: Mensaje genérico con contacto
    → SÍ: ↓
    ↓
11. Consultar IA (sin contexto de paciente)
    ↓
12. ¿Confianza >= 0.8?
    → NO: Mensaje genérico
    → SÍ: Responder con IA ↓
    ↓
13. ¿Es mensaje #4, #8, #12...?
    → SÍ: Agregar recordatorio de registro
    → NO: Enviar respuesta normal
```

## 💬 Ejemplos de Casos de Uso

### Caso 1: Primera Consulta - Precio
```
Prospecto: "Hola, cuánto cuesta la consulta?"
Sistema:
  - Crea nuevo prospecto
  - Encuentra FAQ de precio
  - Responde con FAQ

Respuesta:
"Hola! 👋

El costo de la consulta nutricional es de $500 pesos.

Incluye:
- Evaluación nutricional completa
- Análisis de composición corporal
- Plan personalizado
- Seguimiento continuo

Para agendar tu cita, puedes registrarte aquí:
[URL]

¿Tienes alguna otra pregunta?"
```

### Caso 2: Pregunta Nutricional
```
Prospecto: "Puedo comer plátano si quiero bajar de peso?"
Sistema:
  - Detecta palabras: "comer", "bajar de peso"
  - Deriva a consulta profesional

Respuesta:
"Buenos días! 👋

Para darte una respuesta precisa sobre tu plan nutricional,
necesitas una consulta nutricional profesional.

El Lic. Paul Alavez evaluará tu caso específico y te dará un
plan personalizado adaptado a tus objetivos y estilo de vida.

📋 Agendar consulta:
[URL]

💰 Costo: $500 MXN
✅ Incluye:
- Evaluación completa
- Plan personalizado
- Seguimiento continuo

¿Te gustaría conocer más sobre el consultorio?"
```

### Caso 3: Mensaje #4 (Recordatorio)
```
Prospecto: "Qué formas de pago aceptan?"
Sistema:
  - total_mensajes = 4
  - Activa recordatorio de registro

Respuesta:
"Aceptamos:
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
✅ Confirmar/cancelar por WhatsApp"
```

### Caso 4: Excede Límite Diario
```
Prospecto: [Mensaje #21 del día]
Sistema:
  - total_mensajes_hoy = 21
  - Excede MAX_MENSAJES_POR_DIA (20)

Respuesta:
"Has alcanzado el límite de mensajes por hoy (20 mensajes).

Puedes volver a escribir mañana, o si necesitas información urgente:

📋 Registrarte: [URL]
📧 Email: paul_nutricion@hotmail.com

¡Gracias por tu paciencia!"
```

### Caso 5: Intenta Enviar Archivo
```
Prospecto: [Envía una imagen]
Sistema:
  - Detecta numMedia > 0
  - Rechaza multimedia

Respuesta:
"Por favor envía solo mensajes de texto. Para enviar archivos
necesitas registrarte como paciente.

📋 Registrarte aquí: [URL]

¿Tienes alguna pregunta sobre el consultorio?"
```

### Caso 6: Prospecto ya Registrado
```
Prospecto: [Ya se convirtió en paciente]
Sistema:
  - estado = REGISTRADO
  - Informa que ya es paciente

Respuesta:
"Hola! 👋

Veo que ya te registraste como paciente en nuestro sistema.

Usa este mismo número de WhatsApp para comunicarte y recibirás
atención completa como paciente registrado.

¿En qué puedo ayudarte?"
```

## 🔐 Seguridad y Anti-Spam

### Validaciones Automáticas:
1. **Límite diario:** 20 mensajes por día
2. **Límite total:** 70 mensajes históricos
3. **Solo texto:** No se permiten archivos multimedia
4. **Rate limiting:** Previene flood de mensajes
5. **Umbral de confianza más alto:** 0.8 vs 0.7 para pacientes

### Estados de Prospecto:
- **ACTIVO:** Puede seguir interactuando (default)
- **REGISTRADO:** Se convirtió en paciente
- **BLOQUEADO:** Bloqueado manualmente por spam/abuso

## 📈 Conversión de Prospecto a Paciente

Cuando un prospecto se registra como paciente, automáticamente:

```typescript
await convertirProspectoEnPaciente(prospectoId, pacienteId)
```

Esto:
1. Cambia el estado a `REGISTRADO`
2. Guarda la referencia al paciente creado
3. Registra la fecha de conversión
4. Mantiene el historial de mensajes para análisis

## 📊 Métricas Disponibles

El sistema registra:
- Total de prospectos activos
- Mensajes por prospecto
- Tasa de conversión prospecto → paciente
- Uso de IA vs FAQ
- Tokens gastados en prospectos
- Prospectos que alcanzan límites

## 🔧 Configuración

### Variables de Entorno (existentes)
```env
OPENAI_API_KEY="sk-..."
OPENAI_MODEL="gpt-4o"
AI_ENABLED="true"
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
```

### Modificar Límites
Editar `/src/lib/services/prospecto-responder.ts`:

```typescript
const LIMITES_PROSPECTO = {
  MAX_MENSAJES_POR_DIA: 20,        // Cambiar aquí
  MAX_MENSAJES_TOTAL: 70,          // Cambiar aquí
  RECORDATORIO_REGISTRAR_CADA: 4,  // Cambiar aquí
  // ...
}
```

## 📝 Archivos Creados/Modificados

### Nuevos Archivos:
- `/src/lib/services/prospecto-responder.ts` - Servicio principal
- `/docs/SISTEMA_PROSPECTOS.md` - Esta documentación

### Archivos Modificados:
- `/prisma/schema.prisma` - Nuevas tablas y relaciones
- `/src/app/api/webhooks/twilio/route.ts` - Manejo de prospectos

## 🧪 Testing

### Probar como Prospecto:
1. Usar un número de WhatsApp NO registrado
2. Enviar mensaje: "Hola, cuánto cuesta?"
3. Verificar respuesta automática
4. Enviar 3 mensajes más
5. El 4to mensaje debe incluir recordatorio de registro

### Probar Límites:
1. Enviar 21 mensajes en un día
2. Verificar que el mensaje 21 es rechazado
3. Verificar mensaje de límite alcanzado

### Probar Multimedia:
1. Intentar enviar una imagen
2. Verificar rechazo con mensaje explicativo

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs en consola (búsqueda por emoji 🆕)
2. Verificar tabla `prospectos` en BD
3. Verificar tabla `mensajes_prospecto` en BD
4. Revisar que las variables de entorno estén configuradas

## 🚀 Próximas Mejoras

- [ ] Dashboard de métricas de prospectos
- [ ] Panel para gestionar prospectos bloqueados
- [ ] Notificaciones al nutriólogo de nuevos prospectos
- [ ] Análisis de preguntas más frecuentes de prospectos
- [ ] Sistema de puntuación de "calidad" de prospecto
- [ ] Auto-eliminación de prospectos inactivos > 30 días
- [ ] Exportar lista de prospectos para marketing

## 💰 Impacto en Costos

Con GPT-4o:
- Promedio: 200 tokens por consulta de prospecto
- Costo: ~$0.001 por mensaje
- 100 prospectos/mes (20 msgs c/u): ~$2 USD/mes

Con GPT-4o-mini:
- Promedio: 200 tokens por consulta de prospecto
- Costo: ~$0.00006 por mensaje
- 100 prospectos/mes (20 msgs c/u): ~$0.12 USD/mes

**Recomendación:** Usar GPT-4o-mini para prospectos para reducir costos.
