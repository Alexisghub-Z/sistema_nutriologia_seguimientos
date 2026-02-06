# Configuración de Sentry

Este documento explica cómo está configurado Sentry en el proyecto y cómo utilizarlo.

## ¿Qué es Sentry?

Sentry es una plataforma de monitoreo de errores que captura automáticamente errores y problemas de performance en producción, ayudándote a:

- 🐛 Detectar errores antes de que los usuarios los reporten
- 📊 Ver el contexto completo de cada error (stack trace, breadcrumbs, datos del usuario)
- ⚡ Recibir alertas en tiempo real cuando algo falla
- 📈 Monitorear performance de APIs y operaciones lentas

## Configuración Actual

### Archivos de Configuración

- **`sentry.server.config.ts`** - Captura errores del backend (API routes)
- **`sentry.client.config.ts`** - Captura errores del frontend (navegador)
- **`sentry.edge.config.ts`** - Captura errores del Edge Runtime (middleware)

**IMPORTANTE:** Sentry está configurado para **solo activarse en producción** (`NODE_ENV=production`). En desarrollo usa Winston para logs locales, lo que mejora significativamente la performance.

### Variables de Entorno

Agrega estas variables en `.env.local`:

```bash
# DSN de Sentry (mismo para servidor y cliente)
SENTRY_DSN="https://xxxxx@oxxxxx.ingest.us.sentry.io/xxxxx"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@oxxxxx.ingest.us.sentry.io/xxxxx"
```

### Utilidades Disponibles

Importa las utilidades desde `@/lib/sentry-utils`:

```typescript
import {
  captureError,      // Capturar errores
  captureInfo,       // Capturar eventos informativos
  addBreadcrumb,     // Agregar rastro de navegación
  setUser,           // Identificar usuario
  clearUser,         // Limpiar usuario (al cerrar sesión)
  measurePerformance // Medir performance de operaciones
} from '@/lib/sentry-utils'
```

## Uso en el Código

### 1. Capturar Errores

```typescript
try {
  await operacionRiesgosa()
} catch (error) {
  captureError(error, {
    module: 'citas',
    userId: session.user.id,
    pacienteId: 'pac_123',
    extra: {
      accion: 'crear_cita',
      fecha: nuevaCita.fecha
    }
  })
  throw error // Re-lanzar si es necesario
}
```

### 2. Agregar Breadcrumbs (Rastro de Navegación)

Los breadcrumbs te ayudan a ver qué hizo el usuario antes del error:

```typescript
addBreadcrumb('auth', 'Usuario inició sesión', {
  email: user.email
})

addBreadcrumb('navigation', 'Navegó a /pacientes', {
  from: '/dashboard'
})

addBreadcrumb('api', 'Llamada a API de WhatsApp', {
  to: telefono,
  status: 'success'
})
```

### 3. Identificar Usuario

Cuando un usuario inicie sesión:

```typescript
setUser({
  id: session.user.id,
  email: session.user.email,
  username: session.user.name
})
```

Al cerrar sesión:

```typescript
clearUser()
```

### 4. Medir Performance

```typescript
const pacientes = await measurePerformance(
  'db.query.pacientes',
  async () => {
    return await prisma.paciente.findMany()
  }
)
```

### 5. Wrapper para API Routes

Envuelve tus API routes para capturar errores automáticamente:

```typescript
import { withErrorHandling } from '@/lib/sentry-utils'

export const POST = withErrorHandling(
  async (req: NextRequest) => {
    // Tu código aquí
    const data = await req.json()
    // ...
    return Response.json({ success: true })
  },
  { module: 'citas' }
)
```

## Integración Actual

Sentry ya está integrado en:

✅ **Twilio** (`src/lib/services/twilio.ts`)
- Captura errores al enviar WhatsApp
- Agrega breadcrumbs con detalles del mensaje

✅ **OpenAI** (`src/lib/services/openai-assistant.ts`)
- Captura errores de la API
- Mide performance de llamadas
- Agrega contexto del mensaje y paciente

✅ **Logger** (`src/lib/logger.ts`)
- Sistema dual: Winston para logs locales + Sentry para errores críticos

## Testing

Ejecuta el script de prueba para verificar la integración:

```bash
npx tsx scripts/test-sentry.ts
```

Deberías ver en tu dashboard de Sentry:
- 5 errores capturados
- 1 mensaje informativo
- 1 transaction de performance
- Breadcrumbs en algunos errores
- Usuario identificado

## Monitoreo en Producción

### Dashboard de Sentry

1. Ve a https://sentry.io
2. Navega a tu proyecto
3. Verás:
   - **Issues**: Errores agrupados por tipo
   - **Performance**: Transacciones lentas
   - **Releases**: Errores por versión del código

### Configurar Alertas

1. Ve a **Settings** > **Alerts**
2. Crea reglas como:
   - Notificar si hay más de 10 errores en 1 hora
   - Alerta si un error afecta a más de 5 usuarios
   - Email cuando hay un nuevo tipo de error

### Mejores Prácticas

- ✅ **Usa breadcrumbs generosamente** - Ayudan a entender el contexto
- ✅ **Identifica usuarios** - Facilita reproducir errores
- ✅ **Agrega contexto extra** - IDs relevantes, datos de la operación
- ❌ **No captures información sensible** - Las configuraciones ya filtran headers de autenticación
- ❌ **No captures errores esperados** - Solo errores que requieren acción

## Límites del Plan Gratuito

- **5,000 errores/mes** - Suficiente para tu consultorio
- **10,000 transactions/mes** - Performance monitoring
- **1 GB de attachments** - Screenshots, archivos adjuntos

Si llegas al límite, Sentry deja de capturar eventos hasta el siguiente mes.

## Troubleshooting

### "No DSN provided"

Asegúrate de tener `SENTRY_DSN` en `.env.local` y reinicia el servidor.

### "Transport disabled"

El DSN no está siendo cargado. Verifica que el archivo `.env.local` esté en la raíz del proyecto.

### No veo errores en Sentry

1. Verifica que `NODE_ENV=production` en producción
2. Revisa que los errores no estén en `ignoreErrors` (sentry.*.config.ts)
3. Checa los logs de consola para ver si Sentry está capturando

## Recursos

- [Documentación de Sentry](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Dashboard de Sentry](https://sentry.io)
- [Ejemplos de uso en el código](./src/lib/sentry-utils.ts)
