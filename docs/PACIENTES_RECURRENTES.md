# Sistema de Pacientes Recurrentes

## 📋 Descripción

Cuando un paciente que ya tiene citas anteriores quiere agendar una nueva cita, el sistema maneja automáticamente la actualización de sus datos.

## 🔑 Identificación de Paciente

El sistema identifica pacientes por **EMAIL (único)**:

```
Clave principal: email
Claves secundarias: telefono (también único)
```

## 🔄 Flujo de Agendado - Cliente Recurrente

### Escenario: Cliente que ya tiene cuenta

**Primera cita (hace 3 meses):**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@email.com",
  "telefono": "9511234567",
  "fecha_nacimiento": "1990-01-15"
}
```

**Nueva cita (hoy):**
```json
{
  "nombre": "Juan Pérez García",  // ✏️ Cambió
  "email": "juan@email.com",       // ✅ Mismo (clave)
  "telefono": "9519876543",        // ✏️ Cambió
  "fecha_nacimiento": "1990-01-15" // ✅ Mismo
}
```

### Proceso Automático:

1. **Buscar por email**: `juan@email.com`
   ```typescript
   const paciente = await prisma.paciente.findUnique({
     where: { email: validatedData.email }
   })
   ```

2. **Paciente encontrado** ✅
   - Ya existe en la base de datos
   - Tiene citas anteriores

3. **Verificar cambios**:
   ```typescript
   Nombre: "Juan Pérez" → "Juan Pérez García" ✏️
   Teléfono: "9511234567" → "9519876543" ✏️
   Fecha nacimiento: Sin cambios ✅
   ```

4. **Validar teléfono nuevo**:
   - ¿El nuevo teléfono está en uso por OTRO paciente?
   - Si SÍ → Error ❌
   - Si NO → Continuar ✅

5. **Actualizar datos**:
   ```typescript
   await prisma.paciente.update({
     where: { id: paciente.id },
     data: {
       nombre: "Juan Pérez García",
       telefono: "9519876543"
     }
   })
   ```

6. **Crear nueva cita**:
   ```typescript
   await prisma.cita.create({
     data: {
       paciente_id: paciente.id, // ✅ Mismo paciente
       fecha_hora: nuevaFecha,
       motivo_consulta: nuevoMotivo,
       ...
     }
   })
   ```

## 📊 Casos de Uso

### Caso 1: Solo cambia el nombre
```
Email: juan@email.com (mismo)
Nombre: "Juan" → "Juan Pérez"
Teléfono: 9511234567 (mismo)
Fecha nacimiento: 1990-01-15 (mismo)

✅ Resultado: Actualiza solo el nombre
```

### Caso 2: Solo cambia el teléfono
```
Email: juan@email.com (mismo)
Nombre: Juan Pérez (mismo)
Teléfono: 9511234567 → 9519876543
Fecha nacimiento: 1990-01-15 (mismo)

✅ Resultado:
  1. Verifica que 9519876543 no esté en uso
  2. Actualiza solo el teléfono
```

### Caso 3: Solo cambia fecha de nacimiento
```
Email: juan@email.com (mismo)
Nombre: Juan Pérez (mismo)
Teléfono: 9511234567 (mismo)
Fecha nacimiento: 1990-01-15 → 1990-02-20

✅ Resultado: Actualiza solo la fecha de nacimiento
```

### Caso 4: Todo cambió
```
Email: juan@email.com (mismo)
Nombre: "Juan" → "Juan Pérez García"
Teléfono: 9511234567 → 9519876543
Fecha nacimiento: 1990-01-15 → 1990-02-20

✅ Resultado: Actualiza nombre, teléfono y fecha de nacimiento
```

### Caso 5: Nada cambió
```
Email: juan@email.com (mismo)
Nombre: Juan Pérez (mismo)
Teléfono: 9511234567 (mismo)
Fecha nacimiento: 1990-01-15 (mismo)

✅ Resultado: No actualiza nada, solo crea la cita
```

## ⚠️ Validaciones y Errores

### Error 1: Teléfono ya registrado en otra cuenta

```typescript
// Usuario intenta usar teléfono de otro paciente
Email: juan@email.com
Teléfono: 9519999999 // Este teléfono pertenece a maria@email.com

❌ Error: "Este teléfono ya está registrado con otra cuenta"
```

### Error 2: Email ya existe pero con otro teléfono registrado

```typescript
// Dos pacientes intentan usar el mismo email
Paciente A (existente):
  email: juan@email.com
  telefono: 9511234567

Paciente B (nuevo intento):
  email: juan@email.com
  telefono: 9519999999

✅ Resultado: Se actualiza el paciente A con el nuevo teléfono
(Asumiendo que 9519999999 no está en uso)
```

## 🔍 Lógica del Código

### Actualización Inteligente

```typescript
// Solo actualiza campos que cambiaron
const datosActualizados: any = {}

if (paciente.nombre !== validatedData.nombre) {
  datosActualizados.nombre = validatedData.nombre
}

if (paciente.telefono !== validatedData.telefono) {
  datosActualizados.telefono = validatedData.telefono
}

const fechaNueva = new Date(validatedData.fecha_nacimiento)
const fechaActual = new Date(paciente.fecha_nacimiento)
if (fechaNueva.getTime() !== fechaActual.getTime()) {
  datosActualizados.fecha_nacimiento = fechaNueva
}

// Solo ejecuta UPDATE si hay cambios
if (Object.keys(datosActualizados).length > 0) {
  await prisma.paciente.update({
    where: { id: paciente.id },
    data: datosActualizados
  })
}
```

### Ventajas:

1. ✅ **No hace UPDATE innecesarios** si nada cambió
2. ✅ **Mantiene historial** - mismo paciente, múltiples citas
3. ✅ **Actualización automática** - datos siempre actualizados
4. ✅ **Previene duplicados** - un email = un paciente

## 🗂️ Impacto en la Base de Datos

### Tabla Pacientes

```sql
-- Antes (primera cita)
id: abc123
nombre: Juan Pérez
email: juan@email.com
telefono: 9511234567
fecha_nacimiento: 1990-01-15

-- Después (segunda cita con cambios)
id: abc123  -- ✅ Mismo ID
nombre: Juan Pérez García  -- ✏️ Actualizado
email: juan@email.com  -- ✅ No cambia (clave)
telefono: 9519876543  -- ✏️ Actualizado
fecha_nacimiento: 1990-01-15  -- ✅ No cambió
```

### Tabla Citas

```sql
-- Primera cita (hace 3 meses)
id: cita001
paciente_id: abc123
fecha_hora: 2025-10-15 10:00
estado: COMPLETADA

-- Segunda cita (nueva)
id: cita002
paciente_id: abc123  -- ✅ Mismo paciente
fecha_hora: 2026-01-20 14:00
estado: PENDIENTE
```

**Resultado:**
- 1 paciente
- 2 citas
- Datos actualizados automáticamente

## 📱 Experiencia del Usuario

### Escenario Real:

1. **Octubre 2025**: Juan agenda primera cita
   - Llena formulario completo
   - Sistema crea paciente nuevo

2. **Enero 2026**: Juan quiere agendar otra cita
   - Llena formulario de nuevo (puede haber olvidado datos exactos)
   - Pone su mismo email
   - Sistema detecta que ya existe
   - Actualiza automáticamente sus datos si cambiaron
   - Crea nueva cita vinculada al mismo paciente

3. **Beneficios**:
   - ✅ Juan no necesita "iniciar sesión"
   - ✅ Sistema mantiene historial completo
   - ✅ Datos siempre actualizados
   - ✅ No se duplican pacientes

## 🎯 Mejores Prácticas

### Para el Nutriólogo:

1. **Revisar datos actualizados**:
   - Si un paciente cambió teléfono, verificar antes de llamar
   - Sistema mantiene registro de cambios en `updatedAt`

2. **Historial completo**:
   - Todas las citas del paciente visibles en su perfil
   - Independiente de cambios en sus datos

3. **Comunicación**:
   - Usar teléfono más reciente para WhatsApp
   - Sistema siempre usa datos actualizados

### Para el Paciente:

1. **Usar mismo email**:
   - Mantener historial de citas
   - Datos se actualizan automáticamente

2. **No preocuparse por datos viejos**:
   - Si cambió teléfono, solo poner el nuevo
   - Sistema actualiza todo automáticamente

3. **Acceso a citas anteriores**:
   - Con el código de cualquier cita puede ver su historial
   - Todas vinculadas al mismo perfil

## 🔐 Seguridad y Privacy

### Datos Protegidos:

- ✅ Email único por paciente
- ✅ Teléfono único por paciente
- ✅ Validación antes de actualizar
- ✅ No se puede "robar" cuenta cambiando email

### Logs y Auditoría:

```typescript
console.log(`✏️  Datos del paciente actualizados: ${paciente.id}`,
  Object.keys(datosActualizados))

// Ejemplo de output:
// ✏️  Datos del paciente actualizados: abc123 ['nombre', 'telefono']
```

## 📝 Resumen

**Pregunta:** ¿Qué pasa si un cliente quiere hacer una cita después de ya haber hecho citas antes?

**Respuesta:**
1. ✅ Sistema lo identifica por email
2. ✅ Actualiza automáticamente cualquier dato que cambió (nombre, teléfono, fecha nacimiento)
3. ✅ Crea nueva cita vinculada al mismo paciente
4. ✅ Mantiene historial completo de todas sus citas
5. ✅ No se duplican pacientes
6. ✅ Datos siempre actualizados

**Es transparente y automático** - el paciente no necesita hacer nada especial. 🎯
