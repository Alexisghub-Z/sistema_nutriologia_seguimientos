# 📱 Sistema de Plantillas de WhatsApp - Guía Completa

## 📋 Resumen

Hemos implementado un sistema completo de seguimiento post-consulta con mensajes automatizados de WhatsApp usando plantillas aprobadas de Meta.

---

## ✅ Lo que ya está Implementado

### 1. **Código Actualizado**
- ✅ 4 nuevos tipos de plantillas en `/src/lib/utils/plantillas.ts`
- ✅ 4 nuevos tipos de jobs en `/src/lib/queue/messages.ts`
- ✅ 4 nuevas funciones procesadoras en `/src/lib/queue/jobs/procesadores.ts`
- ✅ 4 nuevos procesadores en el worker `/src/lib/queue/worker.ts`
- ✅ Lógica para programar múltiples mensajes según el tipo seleccionado
- ✅ Invalidación de caché cuando se programa/cancela seguimiento

### 2. **Sistema de Programación**
El sistema ahora programa automáticamente múltiples mensajes según el tipo:

#### **SOLO_SEGUIMIENTO**
- Mensaje inicial (4 días después de la consulta)
- Mensaje intermedio (a la mitad del periodo)
- Mensaje previo cita (8 días antes de la fecha sugerida)

#### **SOLO_RECORDATORIO**
- Recordatorio para agendar (4 días antes de la fecha sugerida)

#### **RECORDATORIO_Y_SEGUIMIENTO**
- Todos los mensajes anteriores (4 mensajes en total)

### 3. **Interfaz de Usuario**
- ✅ Selector de tipo de mensaje en el panel del paciente
- ✅ Indicador visual del tipo de seguimiento programado
- ✅ Actualización en tiempo real al programar/cancelar

---

## 📝 Próximos Pasos

### Paso 1: Revisar las Plantillas
Abre el archivo `/docs/plantillas-meta-whatsapp.md` y revisa las 4 plantillas que debes crear en Meta:

1. `seguimiento_inicial` - ¿Cómo has estado desde tu última consulta?
2. `seguimiento_intermedio` - ¿Cómo vas con tu plan nutricional?
3. `seguimiento_previo_cita` - Tu próxima cita se acerca...
4. `recordatorio_agendar` - Te recuerdo que debes agendar tu cita...

### Paso 2: Crear Plantillas en Meta Business Manager

1. Ve a https://business.facebook.com/
2. Accede a "WhatsApp Manager"
3. Busca "Message Templates" o "Plantillas de Mensajes"
4. Crea cada una de las 4 plantillas siguiendo las especificaciones en el documento

**IMPORTANTE**: Las plantillas deben ser exactamente como están en el documento, incluyendo:
- ✅ Nombre exacto (ej: `seguimiento_inicial`)
- ✅ Categoría: **UTILITY**
- ✅ Idioma: **Spanish (es)**
- ✅ Variables en el orden correcto ({{1}}, {{2}}, {{3}})

### Paso 3: Esperar Aprobación de Meta
- Meta revisa las plantillas en **1-2 días** (a veces minutos)
- Recibirás notificación por correo cuando estén aprobadas
- **NO EDITES** las plantillas después de enviarlas (cancelaría la aprobación)

### Paso 4: Obtener los Content SIDs
Una vez aprobadas, cada plantilla tendrá un ID único:

Ejemplo:
```
seguimiento_inicial → HXabc123def456...
seguimiento_intermedio → HXghi789jkl012...
seguimiento_previo_cita → HXmno345pqr678...
recordatorio_agendar → HXstu901vwx234...
```

**Copia estos IDs** - los necesitaremos para el siguiente paso.

### Paso 5: Configurar el .env
Agrega los Content SIDs a tu archivo `.env`:

```bash
# Activar uso de plantillas aprobadas
USE_APPROVED_TEMPLATES="true"

# Plantillas de seguimiento post-consulta
TEMPLATE_SEGUIMIENTO_INICIAL_SID="HXabc123def456..."
TEMPLATE_SEGUIMIENTO_INTERMEDIO_SID="HXghi789jkl012..."
TEMPLATE_SEGUIMIENTO_PREVIO_CITA_SID="HXmno345pqr678..."
TEMPLATE_RECORDATORIO_AGENDAR_SID="HXstu901vwx234..."
```

### Paso 6: Reiniciar Servicios
```bash
# Reiniciar el servidor Next.js
npm run dev

# Reiniciar el worker (en otra terminal)
npm run worker:dev
```

### Paso 7: Probar el Sistema
1. Ve al panel de un paciente
2. Selecciona un tipo de seguimiento (ej: "Ambos")
3. Haz clic en "Programar seguimiento"
4. Verifica en la consola del worker que se programaron los mensajes
5. Revisa con `npm run queue:status`

---

## 🔧 Modo Sandbox (Mientras aprueba Meta)

**Mientras tanto**, el sistema funciona en **modo sandbox** con mensajes de texto libre:

```bash
# En tu .env actual
USE_APPROVED_TEMPLATES="false"
```

**Limitación del Sandbox**:
- ⚠️ Solo funciona dentro de 24h después de que el paciente escribió
- ⚠️ NO funcionará para seguimientos a largo plazo
- ✅ Útil SOLO para pruebas inmediatas

**Por eso es importante** subir las plantillas a Meta lo antes posible.

---

## 📊 Flujo Completo del Sistema

### Cuando el nutriólogo programa un seguimiento:

```
1. Selecciona tipo de seguimiento en UI
   ↓
2. API valida y programa múltiples jobs en Redis
   ↓
3. Worker ejecuta cada job en su momento programado
   ↓
4. Sistema usa plantilla aprobada de Meta
   ↓
5. Twilio envía mensaje al paciente
   ↓
6. Sistema registra mensaje en BD
```

### Timeline de Ejemplo (Próxima cita: 30 días)

```
Hoy: Consulta realizada
  ↓
Día 4: 📧 Seguimiento Inicial
  ↓
Día 15: 📧 Seguimiento Intermedio
  ↓
Día 22: 📧 Seguimiento Previo Cita
  ↓
Día 26: 📧 Recordatorio Agendar
  ↓
Día 30: Fecha sugerida para próxima cita
```

---

## 🛠️ Comandos Útiles

```bash
# Ver estado de la cola
npm run queue:status

# Limpiar toda la cola
npm run queue:clean

# Limpiar solo seguimientos huérfanos
npm run queue:clean-seguimientos

# Ver logs del worker
npm run worker:dev
```

---

## 🆘 Solución de Problemas

### "No se programa el seguimiento"
- ✅ Verifica que la fecha sugerida sea futura
- ✅ Verifica que no haya otro seguimiento activo
- ✅ Revisa la consola del worker

### "Los mensajes no se envían"
- ✅ Verifica que el worker esté corriendo (`npm run worker:dev`)
- ✅ Revisa que las credenciales de Twilio estén correctas
- ✅ Si usas plantillas aprobadas, verifica los Content SIDs

### "Error: No se encontró contentSid"
- ✅ Asegúrate de que `USE_APPROVED_TEMPLATES="true"` esté en `.env`
- ✅ Verifica que agregaste todos los Content SIDs al `.env`
- ✅ Reinicia el servidor y el worker

### "La interfaz no se actualiza"
- ✅ El sistema ahora invalida el caché automáticamente
- ✅ Si sigue sin funcionar, limpia el caché de Redis

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas al:
- Crear las plantillas en Meta
- Obtener los Content SIDs
- Configurar el sistema
- Probar el flujo completo

**Avísame y te ayudo paso a paso.**

---

## 📚 Archivos de Referencia

- **Plantillas para Meta**: `/docs/plantillas-meta-whatsapp.md`
- **Configuración .env**: `/.env.example`
- **Código de plantillas**: `/src/lib/utils/plantillas.ts`
- **Procesadores**: `/src/lib/queue/jobs/procesadores.ts`
- **Worker**: `/src/lib/queue/worker.ts`

---

## ✨ Siguiente Funcionalidad (Opcional)

Una vez que las plantillas estén funcionando, podemos implementar:

1. **Webhook para respuestas** - Redireccionar mensajes del paciente al WhatsApp personal
2. **Panel de mensajes** - Ver historial de mensajes enviados
3. **Estadísticas** - Tasas de apertura y respuesta
4. **Plantillas personalizables** - Permitir editar los textos desde el panel admin

**¿Cuál te gustaría que implementemos después?**
