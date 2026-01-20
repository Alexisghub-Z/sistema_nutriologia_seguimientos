# Sistema de Reagendado de Citas

## 📋 Descripción General

El sistema de reagendado permite a los pacientes cambiar la fecha/hora de sus citas de manera controlada y segura, cancelando automáticamente la cita original y creando una nueva.

## 🎯 Resumen Rápido: ¿Qué pasa con Google Calendar?

**Respuesta corta:** SÍ, se elimina el evento viejo y se crea uno nuevo automáticamente.

### Flujo Visual

```
CITA ORIGINAL
┌─────────────────────────────────────────┐
│ DB: Cita #1                             │
│   - fecha: 20/01/2025 10:00            │
│   - google_event_id: "abc123"          │
│                                         │
│ GOOGLE CALENDAR:                        │
│   📅 Evento "abc123"                    │
│      Consulta: Juan Pérez               │
│      20/01/2025 10:00 AM                │
└─────────────────────────────────────────┘
              ↓ REAGENDAR
┌─────────────────────────────────────────┐
│ 1. Cancelar en DB                       │
│    estado = CANCELADA                   │
│                                         │
│ 2. ❌ Eliminar de Google Calendar       │
│    calendar.events.delete("abc123")     │
│    google_event_id = NULL               │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. Paciente selecciona nueva fecha     │
│    Nueva fecha: 22/01/2025 14:00       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. Crear nueva cita                     │
│    DB: Cita #2                          │
│      - fecha: 22/01/2025 14:00         │
│      - google_event_id: "xyz789"       │
│                                         │
│ 5. ✅ Crear en Google Calendar          │
│    calendar.events.insert()             │
│    📅 Nuevo evento "xyz789"             │
│       Consulta: Juan Pérez              │
│       22/01/2025 02:00 PM               │
└─────────────────────────────────────────┘

RESULTADO:
  Evento viejo (20/01 10:00) → ❌ ELIMINADO
  Evento nuevo (22/01 14:00) → ✅ CREADO
```

## 🔄 Flujo de Reagendado

### 1. Validaciones Previas

Antes de permitir el reagendado, el sistema valida:

```typescript
✅ Cita NO cancelada (estado !== 'CANCELADA')
✅ Cita NO completada (estado !== 'COMPLETADA')
✅ Paciente NO marcado como "no asistió" (estado !== 'NO_ASISTIO')
✅ Cita NO pasada (margen de 2 horas de tolerancia)
```

**Casos que NO se pueden reagendar:**
- ❌ Citas canceladas → "Agenda una nueva cita"
- ❌ Citas completadas → "Agenda una nueva cita"
- ❌ Citas donde no asistió → "Agenda una nueva cita"
- ❌ Citas pasadas (>2h) → "Agenda una nueva cita"

### 2. Proceso de Reagendado

**Paso 1: Usuario hace clic en "Reagendar"**
```
/cita/[codigo] → Botón "Reagendar"
```

**Paso 2: Validación**
```typescript
validarReagendar() → true/false
- Si false: Muestra error específico
- Si true: Muestra modal de confirmación
```

**Paso 3: Confirmación del usuario**
```
Modal: "¿Deseas reagendar esta cita?"
- Muestra fecha/hora actual
- Explica que la cita será cancelada
```

**Paso 4: Cancelación automática**
```typescript
PUT /api/citas/codigo/[codigo]
Body: { accion: 'cancelar' }

→ estado = 'CANCELADA'
→ estado_confirmacion = 'CANCELADA_PACIENTE'
→ Cancelar jobs de mensajes automáticos
```

**Paso 5: Guardar contexto**
```typescript
localStorage.setItem('datosReagendar', {
  nombre: 'Juan Pérez',
  email: 'juan@example.com',
  telefono: '9511234567',
  motivo: 'Consulta nutricional',
  reagendando: true,
  citaOriginal: 'ABC123'
})
```

**Paso 6: Redirección**
```
→ /agendar?reagendar=true
```

**Paso 7: Pre-llenado del formulario**
```typescript
useEffect(() => {
  // Lee datosReagendar de localStorage
  // Pre-llena nombre, email, teléfono, motivo
  // Marca como reagendado para mostrar mensaje especial
  // Limpia localStorage
})
```

**Paso 8: Nueva cita**
```
Usuario selecciona nueva fecha/hora
→ Crea nueva cita normal
→ Genera nuevo código
→ Envía confirmación
```

## 📂 Archivos Modificados

### `/src/app/(public)/cita/[codigo]/page.tsx`

**Estados agregados:**
```typescript
const [reagendando, setReagendando] = useState(false)
const [mostrarConfirmacionReagendar, setMostrarConfirmacionReagendar] = useState(false)
```

**Funciones nuevas:**
```typescript
validarReagendar()      // Valida si se puede reagendar
iniciarReagendar()      // Valida y muestra modal
reagendarCita()         // Ejecuta el reagendado
```

**Modal agregado:**
```tsx
{mostrarConfirmacionReagendar && (
  <div className={styles.modal}>
    {/* Modal de confirmación de reagendado */}
  </div>
)}
```

### `/src/app/(public)/agendar/page.tsx`

**Estado agregado:**
```typescript
const [esReagendado, setEsReagendado] = useState(false)
```

**Hook de carga:**
```typescript
useEffect(() => {
  // Lee datosReagendar de localStorage
  // Pre-llena formulario
  // Limpia localStorage
}, [])
```

**Hero dinámico:**
```typescript
{esReagendado
  ? 'Reagenda tu Consulta'
  : 'Agenda tu Consulta'
}
```

## 🔍 Casos de Uso

### Caso 1: Reagendado Exitoso
```
1. Usuario: "Reagendar" → ✅ Validación pasa
2. Sistema: Muestra modal con fecha actual
3. Usuario: "Sí, reagendar"
4. Sistema: Cancela cita → Guarda datos → Redirige
5. Sistema: Pre-llena formulario en /agendar
6. Usuario: Selecciona nueva fecha/hora
7. Sistema: Crea nueva cita
```

### Caso 2: Cita Cancelada
```
1. Usuario: "Reagendar" → ❌ Validación falla
2. Sistema: Error "No puedes reagendar una cita cancelada..."
3. Usuario: Debe ir a /agendar para crear nueva cita
```

### Caso 3: Cita Pasada
```
1. Usuario: "Reagendar" → ❌ Validación falla (>2h pasada)
2. Sistema: Error "No puedes reagendar una cita pasada..."
3. Usuario: Debe ir a /agendar para crear nueva cita
```

### Caso 4: Cita Próxima (< 2h)
```
1. Usuario: "Reagendar" → ✅ Validación pasa (margen 2h)
2. Sistema: Permite reagendar
3. Nota: Es último momento, pero se permite
```

## 📱 Integración con WhatsApp (Futuro)

### Notificación de Reagendado

Cuando un paciente reagenda, se puede enviar un mensaje automático:

**Ubicación sugerida:**
```typescript
// En reagendarCita(), después de cancelar exitosamente:

if (response.ok) {
  // Enviar notificación por WhatsApp
  await enviarMensajeReagendado({
    telefono: cita.paciente.telefono,
    nombrePaciente: cita.paciente.nombre,
    fechaOriginal: formatearFecha(cita.fecha_hora),
    horaOriginal: formatearHora(cita.fecha_hora),
    codigoOriginal: codigo,
  })
}
```

**Plantilla de mensaje:**
```
Hola {nombre},

Hemos cancelado tu cita programada para:
📅 {fecha}
🕒 {hora}

Por favor, selecciona una nueva fecha y hora en el siguiente enlace:
🔗 {URL_AGENDAR}

Si tienes dudas, contáctanos.

Gracias,
Dr. Paul
```

### API de WhatsApp

**Archivo:** `/src/lib/whatsapp/mensajes.ts`

```typescript
export async function enviarMensajeReagendado(params: {
  telefono: string
  nombrePaciente: string
  fechaOriginal: string
  horaOriginal: string
  codigoOriginal: string
}) {
  const mensaje = `
Hola ${params.nombrePaciente},

Hemos cancelado tu cita programada para:
📅 ${params.fechaOriginal}
🕒 ${params.horaOriginal}

Por favor, agenda tu nueva cita aquí:
🔗 ${process.env.NEXT_PUBLIC_URL}/agendar

Código de referencia: ${params.codigoOriginal}

Gracias,
Dr. Paul
  `.trim()

  // Enviar vía API de WhatsApp
  return await enviarWhatsApp(params.telefono, mensaje)
}
```

### Notificación al Nutriólogo

También se puede notificar al nutriólogo:

```typescript
await enviarMensajeAdmin({
  mensaje: `
⚠️ CITA REAGENDADA

Paciente: ${cita.paciente.nombre}
Teléfono: ${cita.paciente.telefono}

Cita cancelada:
📅 ${fechaOriginal}
🕒 ${horaOriginal}

El paciente está reagendando su cita.
  `
})
```

## 🧪 Testing

### Test Manual

1. **Cita normal → Reagendar:**
   - Crear cita
   - Ir a `/cita/[codigo]`
   - Click "Reagendar"
   - Verificar modal
   - Confirmar
   - Verificar redirección a `/agendar`
   - Verificar datos pre-llenados
   - Completar nueva cita

2. **Cita cancelada → Reagendar:**
   - Cancelar cita
   - Intentar reagendar
   - Verificar error

3. **Cita pasada → Reagendar:**
   - Cita de hace 3+ horas
   - Intentar reagendar
   - Verificar error

### Tests Automatizados (Futuro)

```typescript
describe('Reagendar Cita', () => {
  test('permite reagendar cita válida', async () => {
    // Setup: Crear cita futura
    // Act: Reagendar
    // Assert: Cita cancelada + redireccionado
  })

  test('rechaza reagendar cita cancelada', async () => {
    // Setup: Cita cancelada
    // Act: Intentar reagendar
    // Assert: Error mostrado
  })

  test('rechaza reagendar cita pasada', async () => {
    // Setup: Cita pasada >2h
    // Act: Intentar reagendar
    // Assert: Error mostrado
  })

  test('permite reagendar cita próxima (<2h)', async () => {
    // Setup: Cita en 1h
    // Act: Reagendar
    // Assert: Permitido
  })
})
```

## 📊 Base de Datos

### Cambios en la Cita Original

Cuando se reagenda:

```sql
UPDATE citas SET
  estado = 'CANCELADA',
  estado_confirmacion = 'CANCELADA_PACIENTE',
  google_event_id = NULL,  -- Se elimina la referencia
  updatedAt = NOW()
WHERE codigo_cita = 'ABC123'
```

### Nueva Cita

Se crea una cita completamente nueva:

```sql
INSERT INTO citas (
  paciente_id,
  fecha_hora,
  duracion_minutos,
  motivo_consulta,
  estado,
  codigo_cita,
  google_event_id,  -- Se creará nuevo evento si está configurado
  ...
) VALUES (...)
```

**Nota:** No hay relación directa entre la cita cancelada y la nueva. Se puede agregar en el futuro:

```prisma
model Cita {
  // ...
  reagendada_desde  String?  // Código de la cita original
  reagendada_a      String?  // Código de la nueva cita
}
```

## 📅 Integración con Google Calendar

### Flujo Completo de Reagendado con Google Calendar

El sistema maneja automáticamente la sincronización con Google Calendar durante el proceso de reagendado:

#### 1. Cita Original (Cancelación)

**Archivo:** `/src/app/api/citas/codigo/[codigo]/route.ts`

Cuando el paciente confirma el reagendado:

```typescript
// 1. Cancelar la cita en la base de datos
await prisma.cita.update({
  where: { codigo_cita: codigo },
  data: {
    estado: 'CANCELADA',
    estado_confirmacion: 'CANCELADA_PACIENTE',
  }
})

// 2. Eliminar evento de Google Calendar
const isGoogleConfigured = await isGoogleCalendarConfigured()
if (isGoogleConfigured && cita.google_event_id) {
  await unsyncCitaFromGoogleCalendar(cita.id)
  // Esto ejecuta:
  // - calendar.events.delete() en Google
  // - cita.google_event_id = NULL en DB
}
```

**Resultado en Google Calendar:**
```
✅ Evento eliminado del calendario
✅ Ya no aparece en la agenda del nutriólogo
✅ No se envían notificaciones (sendUpdates: 'none')
```

#### 2. Nueva Cita (Creación)

**Archivo:** `/src/app/api/citas/publica/route.ts`

Cuando el paciente completa el reagendado:

```typescript
// 1. Crear nueva cita en la base de datos
const cita = await prisma.cita.create({
  data: {
    paciente_id: paciente.id,
    fecha_hora: nuevaFechaHora,
    duracion_minutos: config.duracion_cita_default,
    motivo_consulta: validatedData.motivo,
    codigo_cita: nuevoCodigoCita,
    estado: 'PENDIENTE',
    // google_event_id: null (se asignará después)
  }
})

// 2. Sincronizar con Google Calendar
const isConfigured = await isGoogleCalendarConfigured()
if (isConfigured) {
  await syncCitaWithGoogleCalendar(cita.id)
  // Esto ejecuta:
  // - calendar.events.insert() en Google
  // - cita.google_event_id = event.id en DB
}
```

**Resultado en Google Calendar:**
```
✅ Nuevo evento creado en el calendario
✅ Título: "Consulta: [Nombre del Paciente]"
✅ Descripción: Motivo de la consulta
✅ Fecha/Hora: Nueva fecha seleccionada
✅ Duración: Según configuración (default 60 min)
✅ Recordatorios: 24h y 1h antes (solo para nutriólogo)
```

### Funciones de Google Calendar Involucradas

#### `unsyncCitaFromGoogleCalendar(citaId)`

**Ubicación:** `/src/lib/services/google-calendar.ts:422`

```typescript
export async function unsyncCitaFromGoogleCalendar(citaId: string) {
  // 1. Obtener cita con google_event_id
  const cita = await prisma.cita.findUnique({
    where: { id: citaId }
  })

  if (!cita || !cita.google_event_id) {
    return // No hay nada que eliminar
  }

  // 2. Eliminar evento de Google Calendar
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: cita.google_event_id,
    sendUpdates: 'none' // No notificar a nadie
  })

  // 3. Limpiar referencia en la base de datos
  await prisma.cita.update({
    where: { id: citaId },
    data: { google_event_id: null }
  })
}
```

#### `syncCitaWithGoogleCalendar(citaId)`

**Ubicación:** `/src/lib/services/google-calendar.ts:366`

```typescript
export async function syncCitaWithGoogleCalendar(citaId: string) {
  const cita = await prisma.cita.findUnique({
    where: { id: citaId },
    include: { paciente: true }
  })

  const fechaFin = new Date(cita.fecha_hora)
  fechaFin.setMinutes(fechaFin.getMinutes() + cita.duracion_minutos)

  // Si ya tiene google_event_id, actualizar (no aplicable en reagendado)
  if (cita.google_event_id) {
    return await updateCalendarEvent(...)
  }

  // Crear nuevo evento (caso de reagendado)
  const event = await createCalendarEvent({
    titulo: `Consulta: ${cita.paciente.nombre}`,
    descripcion: cita.motivo_consulta,
    fechaInicio: cita.fecha_hora,
    fechaFin: fechaFin,
    pacienteEmail: cita.paciente.email,
    pacienteNombre: cita.paciente.nombre
  })

  // Guardar google_event_id en la cita
  await prisma.cita.update({
    where: { id: citaId },
    data: { google_event_id: event.id }
  })
}
```

### Diagrama de Flujo: Google Calendar en Reagendado

```
┌─────────────────────────────────────────────────────┐
│ PASO 1: Usuario hace clic en "Reagendar"           │
├─────────────────────────────────────────────────────┤
│ • Validaciones pasan                                │
│ • Modal de confirmación                             │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ PASO 2: Usuario confirma reagendado                │
├─────────────────────────────────────────────────────┤
│ API: PUT /api/citas/codigo/[codigo]                │
│ • Cancelar cita en DB                               │
│ • Cancelar jobs de mensajes                         │
│ • ✅ ELIMINAR EVENTO DE GOOGLE CALENDAR             │
│   - calendar.events.delete()                        │
│   - google_event_id = NULL                          │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ PASO 3: Redirigir a /agendar                       │
├─────────────────────────────────────────────────────┤
│ • Pre-llenar formulario desde localStorage          │
│ • Usuario selecciona nueva fecha/hora              │
└──────────────────────┬──────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────┐
│ PASO 4: Usuario completa nueva cita                │
├─────────────────────────────────────────────────────┤
│ API: POST /api/citas/publica                        │
│ • Crear nueva cita en DB                            │
│ • Programar nuevos mensajes                         │
│ • ✅ CREAR NUEVO EVENTO EN GOOGLE CALENDAR          │
│   - calendar.events.insert()                        │
│   - google_event_id = nuevo_event.id                │
└─────────────────────────────────────────────────────┘

RESULTADO EN GOOGLE CALENDAR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Evento Viejo          →  ❌ ELIMINADO
  Evento Nuevo          →  ✅ CREADO (nueva fecha/hora)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Casos Especiales

#### Caso 1: Google Calendar NO configurado

```typescript
// En cancelación
const isGoogleConfigured = await isGoogleCalendarConfigured()
if (isGoogleConfigured) { // FALSE → No ejecuta nada
  await unsyncCitaFromGoogleCalendar(cita.id)
}

// En creación
if (isConfigured) { // FALSE → No ejecuta nada
  await syncCitaWithGoogleCalendar(cita.id)
}

// ✅ El reagendado funciona normalmente sin Google Calendar
```

#### Caso 2: Error al eliminar de Google Calendar

```typescript
try {
  await unsyncCitaFromGoogleCalendar(cita.id)
} catch (calendarError) {
  console.error('Error al eliminar evento:', calendarError)
  // ⚠️ No fallar la operación
  // ✅ La cita se cancela en DB de todos modos
  // ⚠️ El evento quedará huérfano en Google Calendar
  //    (se puede limpiar manualmente después)
}
```

#### Caso 3: Error al crear en Google Calendar

```typescript
try {
  await syncCitaWithGoogleCalendar(cita.id)
} catch (calendarError) {
  console.error('Error al sincronizar:', calendarError)
  // ⚠️ No fallar la operación
  // ✅ La cita se crea en DB de todos modos
  // ⚠️ No aparecerá en Google Calendar
  //    (se puede sincronizar manualmente después)
}
```

### Sincronización Manual (Si falla)

Si por algún error no se sincronizó correctamente, puedes hacerlo desde el panel admin:

**Archivo:** `/src/app/api/citas/[id]/sync-calendar/route.ts` (crear si no existe)

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    await syncCitaWithGoogleCalendar(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al sincronizar' },
      { status: 500 }
    )
  }
}
```

### Configuración de Recordatorios

Los eventos de Google Calendar incluyen recordatorios **solo para el nutriólogo** (no se envían al paciente):

```typescript
reminders: {
  useDefault: false,
  overrides: [
    { method: 'popup', minutes: 24 * 60 }, // 1 día antes
    { method: 'popup', minutes: 60 },      // 1 hora antes
  ]
}
```

**Importante:**
- ✅ `sendUpdates: 'none'` → No envía emails de Google a nadie
- ✅ `attendees: []` → No se agregan invitados
- ✅ Solo el nutriólogo ve el evento en su calendario
- ✅ Los recordatorios al paciente se envían por WhatsApp (sistema propio)

## 🚀 Mejoras Futuras

### 1. Historial de Reagendados
```typescript
interface HistorialReagendado {
  citaOriginal: string
  citaNueva: string
  fecha: Date
  motivo?: string
}
```

### 2. Límite de Reagendados
```typescript
// Permitir solo X reagendados por paciente
const numReagendados = await contarReagendados(pacienteId)
if (numReagendados >= 3) {
  return 'Límite de reagendados alcanzado'
}
```

### 3. Penalización por Reagendados Frecuentes
```typescript
// Si reagenda >3 veces, requerir aprobación admin
if (esReagendadorFrecuente(pacienteId)) {
  await solicitarAprobacionAdmin(citaId)
}
```

### 4. Recordatorio Específico
```typescript
// Mensaje diferente para citas reagendadas
if (cita.reagendada_desde) {
  mensaje = `Recordatorio de tu cita reagendada...`
}
```

## 📝 Notas Importantes

1. **LocalStorage:** Se limpia automáticamente después de cargar datos
2. **Validaciones:** Siempre en servidor (API) Y cliente (UI)
3. **Jobs cancelados:** Al cancelar cita, se cancelan mensajes automáticos pendientes
4. **Código único:** Cada nueva cita tiene su propio código
5. **Sin vínculo DB:** Actualmente no hay FK entre cita original y nueva (agregar si se necesita)

## 🔗 Referencias

- API Cancelar: `/src/app/api/citas/codigo/[codigo]/route.ts`
- Página Cita: `/src/app/(public)/cita/[codigo]/page.tsx`
- Página Agendar: `/src/app/(public)/agendar/page.tsx`
- Jobs Queue: `/src/lib/queue/messages.ts`
