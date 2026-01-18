# Sistema de Recordatorios de Seguimiento

## ¿Qué es?

Sistema automatizado que envía recordatorios por WhatsApp a los pacientes **1 día antes** de su próxima cita sugerida, invitándolos a agendar su consulta de seguimiento.

## Flujo Completo

```
1. Nutriólogo completa consulta
   └─> Llena formulario con mediciones
   └─> Ingresa "Próxima Cita Sugerida" (ej: 15 de febrero)

2. Sistema programa recordatorio automáticamente
   └─> Se calcula: 14 de febrero (1 día antes)
   └─> Job guardado en Redis con delay calculado

3. Worker espera hasta la fecha programada
   └─> 14 de febrero llega
   └─> Job se ejecuta automáticamente

4. Sistema envía WhatsApp al paciente
   "¡Hola Juan! Mañana 15 de febrero es tu cita de seguimiento sugerida.
    ¿Te gustaría agendarla? Contáctanos para confirmar."

5. Paciente contacta al nutriólogo
   └─> Nutriólogo agenda cita desde panel /citas
   └─> Se programan los recordatorios normales (24h, 1h antes)
```

## Componentes Modificados

### 1. `messages.ts` - Función de Programación
**Cambios:**
- ✅ `programarSeguimiento(consultaId, fechaSugerida)`
- Calcula delay: `fechaSugerida - 1 día - ahora`
- Guarda job en Redis con `{ consultaId }`

### 2. `procesadores.ts` - Lógica de Negocio
**Cambios:**
- ✅ `procesarSeguimiento(consultaId)` ahora recibe consultaId (antes citaId)
- Busca en tabla `consulta` (antes buscaba `cita`)
- Obtiene `consulta.proxima_cita` y datos del paciente
- Valida que la fecha sugerida no haya pasado
- Envía mensaje personalizado

### 3. `worker.ts` - Procesador de Jobs
**Cambios:**
- ✅ Extrae `consultaId` del job (antes `citaId`)
- Pasa `consultaId` al procesador

### 4. `api/consultas/route.ts` - API
**Cambios:**
- ✅ Importa `programarSeguimiento`
- ✅ Después de crear consulta, si tiene `proxima_cita`:
  - Llama `programarSeguimiento(consulta.id, fechaSugerida)`
  - Maneja errores sin fallar la creación

### 5. Base de Datos
**Cambios:**
- ✅ Nueva plantilla: `AUTOMATICO_SEGUIMIENTO`
- Contenido con variables: `{nombre}`, `{fecha_relativa}`, `{hora_formateada}`

## Cómo Probar

### Opción 1: Prueba Rápida (fecha cercana)

1. **Crea una consulta** con próxima cita para **mañana**:
   - Ve a `/pacientes/{id}/citas/{citaId}/crear-consulta`
   - Llena datos de mediciones
   - En "Próxima Cita Sugerida" pon la fecha de mañana
   - Guarda consulta

2. **Verifica que se programó**:
   ```bash
   npm run queue:status
   ```
   Deberías ver un job `[seguimiento]` para hoy

3. **Espera** (si pusiste mañana, el mensaje se envía hoy)
   - El worker enviará el WhatsApp cuando llegue la hora
   - Revisa tu WhatsApp

### Opción 2: Prueba Inmediata (para testing)

1. **Modifica temporalmente el delay** en `messages.ts`:
   ```typescript
   // Línea 116
   const delay = 10000 // 10 segundos en lugar de 1 día
   ```

2. **Reinicia worker**:
   ```bash
   # Ctrl+C para detener
   npm run worker:dev
   ```

3. **Crea consulta** con cualquier fecha futura

4. **Espera 10 segundos** → Mensaje enviado

5. **Revierte el cambio** después de probar

### Opción 3: Prueba sin Esperar

1. **Usa el script de verificación**:
   ```bash
   npm run queue:status
   ```

2. **Verás algo como**:
   ```
   ⏰ Jobs programados:

   📧 [seguimiento]
      ID Consulta: cons123
      👤 Paciente: Juan Pérez
      📅 Fecha cita sugerida: 20/1/2026, 3:00 PM
      📋 Estado: activo
      ⏰ Se ejecutará: 19/1/2026, 3:00 PM (1 día antes)
      ⏱️ Delay: 2880 minutos
   ```

3. **Esto confirma que está programado correctamente**

## Monitoreo

### Ver todos los seguimientos programados:
```bash
npm run queue:status
```

### Ver mensajes enviados en la BD:
```bash
npm run db:studio
```
- Tabla: `MensajeWhatsApp`
- Filtrar por: `tipo = "AUTOMATICO_SEGUIMIENTO"`
- Ver: estado, contenido, fecha de envío

### Ver logs del worker:
El worker muestra en tiempo real:
```
📧 [Worker] Procesando seguimiento
📋 [Worker] Consulta ID: cons123
✅ [Worker] Seguimiento completado
```

## Personalización

### Cambiar el mensaje

1. Ve a `/configuracion/plantillas`
2. Busca plantilla: "Recordatorio de Seguimiento"
3. Edita el contenido
4. Variables disponibles:
   - `{nombre}` - Nombre del paciente
   - `{fecha_cita}` - Fecha completa (ej: "15 de febrero, 2026")
   - `{fecha_relativa}` - "Hoy", "Mañana" o fecha
   - `{hora_cita}` - Hora en formato 24h (ej: "15:00")
   - `{hora_formateada}` - Hora en formato 12h (ej: "3:00 PM")
   - `{motivo}` - Motivo de la consulta

### Cambiar el tiempo de anticipación

Edita `messages.ts` línea 116:
```typescript
// Actual: 1 día antes
const delay = fechaSugerida.getTime() - Date.now() - 24 * 60 * 60 * 1000

// 2 días antes:
const delay = fechaSugerida.getTime() - Date.now() - 48 * 60 * 60 * 1000

// 3 horas antes:
const delay = fechaSugerida.getTime() - Date.now() - 3 * 60 * 60 * 1000
```

## Diferencias vs. Recordatorios de Cita

| Aspecto | Recordatorios de Cita | Recordatorio de Seguimiento |
|---------|----------------------|---------------------------|
| **Trigger** | Crear cita | Completar consulta |
| **Referencia** | citaId | consultaId |
| **Busca en** | Tabla `cita` | Tabla `consulta` |
| **Fecha base** | `cita.fecha_hora` | `consulta.proxima_cita` |
| **Propósito** | Recordar cita agendada | Invitar a agendar cita |
| **Cita existe?** | Sí, ya está agendada | No, es solo sugerencia |

## Expandibilidad Futura

Este sistema es la base para agregar más tipos de mensajes automáticos:

### Ideas para implementar después:

1. **Felicitaciones por Logros**
   ```typescript
   if (consulta.peso < ultimaConsulta.peso - 5) {
     programarMensaje('FELICITACION_PERDIDA_PESO', ...)
   }
   ```

2. **Tips Nutricionales**
   ```typescript
   programarMensajeRecurrente(
     'TIP_SEMANAL',
     pacienteId,
     cadaSemana
   )
   ```

3. **Recordatorio de Hidratación**
   ```typescript
   programarMensajeDiario('HIDRATACION', pacienteId, '08:00')
   ```

4. **Encuesta de Satisfacción**
   ```typescript
   // 7 días después de consulta
   programarEncuesta(consultaId, diasDespues: 7)
   ```

Todos seguirían el mismo patrón:
- Nueva función en `messages.ts`
- Nuevo procesador en `procesadores.ts`
- Nueva plantilla en BD
- Registro en worker.ts

## Troubleshooting

### El mensaje no se envió

1. **Verifica que el worker esté corriendo**:
   ```bash
   ps aux | grep worker
   ```

2. **Revisa logs del worker** para errores

3. **Verifica el job en Redis**:
   ```bash
   npm run queue:status
   ```

4. **Checa la plantilla esté activa**:
   ```sql
   SELECT * FROM plantillas_mensaje
   WHERE tipo = 'AUTOMATICO_SEGUIMIENTO';
   ```

### El delay está mal calculado

1. **Verifica la zona horaria** del servidor
2. **Checa que `proxima_cita` tenga hora** (no solo fecha)
3. **Revisa logs** cuando se programa el job

### Job se ejecutó pero no llegó el mensaje

1. **Verifica número de teléfono** del paciente
2. **Checa que esté unido al sandbox** de Twilio
3. **Revisa tabla `MensajeWhatsApp`** para ver el estado
4. **Usa script de verificación**:
   ```bash
   node scripts/verificar-mensaje.js <SID>
   ```

## Resumen

✅ Sistema completamente funcional
✅ Recordatorios automáticos 1 día antes
✅ Basado en `consulta.proxima_cita`
✅ Mensajes personalizados
✅ Expandible para más tipos de mensajes
✅ Monitoreo completo con scripts

**El flujo es automático:**
Completar consulta → Sistema programa → Worker envía → Paciente recibe → Nutriólogo agenda
