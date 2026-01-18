# Guía de Prueba - Sistema de Mensajería WhatsApp

## Estado Actual del Sistema

✅ Redis conectado en puerto 6380
✅ 6 mensajes de confirmación esperando en cola
✅ 12 recordatorios programados (24h y 1h antes de citas)
✅ Tu número personal registrado: +5219515886761

## Paso 1: Iniciar el Worker

En una terminal separada, ejecuta:

```bash
npm run worker:dev
```

**Qué esperar:**
- El worker se conectará a Redis
- Comenzará a procesar los 6 mensajes de confirmación inmediatamente
- Verás logs en consola por cada mensaje procesado
- Los recordatorios programados se ejecutarán en sus fechas programadas

## Paso 2: Monitorear la Cola

En otra terminal, verifica el estado:

```bash
npm run queue:status
```

**Deberías ver:**
- Mensajes en espera reduciéndose (de 6 a 0)
- Mensajes completados aumentando
- Recordatorios programados (delayed) manteniéndose en 12

## Paso 3: Verificar WhatsApp

En tu WhatsApp (+5219515886761), deberías recibir:

1. **Mensajes inmediatos** (las 6 confirmaciones que estaban esperando)
2. **Recordatorios** en las fechas programadas (24h y 1h antes de cada cita)

**Formato esperado** (según tus plantillas):
```
¡Hola [Nombre]! 👋

Tu cita ha sido confirmada:
📅 Fecha: [fecha]
🕐 Hora: [hora]
📋 Código: [código]

Te esperamos...
```

## Paso 4: Verificar Base de Datos

Los mensajes enviados se guardan en la tabla `MensajeWhatsApp`:

```bash
npm run db:studio
```

Ve a la tabla `MensajeWhatsApp` y verifica:
- `estado`: "enviado" o "fallido"
- `sid_twilio`: ID del mensaje en Twilio
- `contenido`: El mensaje que se envió
- `error`: null (si todo salió bien)

## Paso 5: Crear Nueva Cita (Prueba Completa)

1. Ve a http://localhost:3000/citas
2. Crea una nueva cita para un paciente
3. El sistema automáticamente:
   - ✅ Enviará confirmación inmediata
   - ✅ Programará recordatorio 24h antes
   - ✅ Programará recordatorio 1h antes

Verifica con `npm run queue:status` que los 3 jobs se agregaron.

## Comandos Útiles

```bash
# Ver estado de la cola
npm run queue:status

# Limpiar todos los jobs (usar con cuidado)
npm run queue:clean

# Verificar Redis
redis-cli -p 6380 -a "redis123" ping

# Ver logs del worker en tiempo real
npm run worker:dev
```

## Troubleshooting

### No recibo mensajes en WhatsApp

1. Verifica que el worker esté corriendo
2. Revisa logs del worker para errores
3. Verifica que el número del paciente en la BD sea correcto
4. Confirma que las plantillas están activas en `/configuracion/plantillas`

### Error "NOAUTH Authentication required"

Redis requiere contraseña. Ya está configurado en el código:
- Password: `redis123`
- Puerto: `6380`

### Jobs no se procesan

1. Verifica que Redis esté corriendo:
   ```bash
   redis-cli -p 6380 -a "redis123" ping
   ```

2. Reinicia el worker:
   ```bash
   # Ctrl+C para detener
   npm run worker:dev
   ```

## Configuración Actual

### Modo: Sandbox (Pruebas)
- ✅ No requiere aprobación de Meta
- ✅ Usa plantillas de texto libre
- ✅ Variables reemplazadas automáticamente
- ⚠️ Solo números registrados en sandbox pueden recibir

### Para Producción (Después)
Cuando compres el número de Oaxaca:
1. Crear plantillas en Twilio Console
2. Enviar a Meta para aprobación
3. Actualizar `.env`:
   - `TWILIO_WHATSAPP_NUMBER=whatsapp:+52951XXXXXXX`
   - `USE_APPROVED_TEMPLATES=true`
   - Agregar SIDs de plantillas aprobadas
4. Reiniciar worker

---

**¡Listo para probar!** 🚀

Inicia el worker y deberías recibir los 6 mensajes en tu WhatsApp inmediatamente.
