# Sistema de Gestión de Pacientes para Nutriólogo

Sistema completo de gestión de pacientes, citas, expedientes digitales y mensajería automática por WhatsApp para nutriólogos.

## 🚀 Características

- **Gestión de Pacientes**: Expedientes digitales completos con historial de consultas
- **Agendamiento Público**: Calendario interactivo para que los pacientes agendan citas
- **Integración Google Calendar**: Sincronización automática bidireccional
- **Mensajería WhatsApp**: Confirmaciones, recordatorios y seguimientos automáticos vía Twilio
- **Archivos Adjuntos**: Sistema de almacenamiento de documentos e imágenes por consulta
- **Panel de Administración**: Dashboard completo para gestión de citas y pacientes
- **Inbox de Conversaciones**: Chat integrado para comunicación con pacientes

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), TypeScript, CSS Puro (CSS Variables + CSS Modules)
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de Datos**: PostgreSQL 15
- **Caching/Queue**: Redis + Bull Queue
- **Autenticación**: NextAuth.js
- **Integraciones**: Google Calendar API, Twilio WhatsApp API
- **DevOps**: Docker, Docker Compose

## 📋 Requisitos Previos

- Node.js 18+ y npm 9+
- Docker y Docker Compose
- Cuenta de Google Cloud (para Calendar API)
- Cuenta de Twilio (para WhatsApp)

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd paulnutriologo
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` y configura las variables necesarias:

```env
# Base de datos (se creará automáticamente con Docker)
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/nutriologo_db?schema=public"

# NextAuth - Genera una clave secreta:
# openssl rand -base64 32
NEXTAUTH_SECRET="tu-clave-secreta-generada"
NEXTAUTH_URL="http://localhost:3000"

# Redis
REDIS_URL="redis://:redis123@localhost:6379"

# Google Calendar (obtén credenciales en Google Cloud Console)
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Twilio WhatsApp (obtén credenciales en Twilio Console)
TWILIO_ACCOUNT_SID="tu-account-sid"
TWILIO_AUTH_TOKEN="tu-auth-token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
```

### 4. Levantar servicios con Docker

```bash
# Iniciar PostgreSQL y Redis
npm run docker:up

# Verificar que los servicios están corriendo
docker ps
```

### 5. Configurar base de datos

```bash
# Generar Prisma Client
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Poblar con datos iniciales (usuario admin, plantillas, etc.)
npm run db:seed
```

### 6. Iniciar aplicación en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:3000

### 7. Credenciales por defecto

Después de ejecutar el seed, puedes iniciar sesión con:

- **Email**: admin@nutriologo.com
- **Password**: admin123

**⚠️ IMPORTANTE**: Cambia estas credenciales en producción.

## 📁 Estructura del Proyecto

```
paulnutriologo/
├── prisma/
│   ├── schema.prisma          # Esquema de base de datos
│   ├── migrations/            # Migraciones de Prisma
│   └── seed.ts                # Datos iniciales
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (public)/          # Rutas públicas (agendamiento)
│   │   ├── (admin)/           # Panel de administración
│   │   ├── api/               # API routes
│   │   └── login/             # Página de login
│   ├── components/            # Componentes React
│   │   ├── ui/                # Componentes UI reutilizables
│   │   ├── calendario/        # Componentes de calendario
│   │   ├── citas/             # Componentes de citas
│   │   ├── expediente/        # Componentes de expediente
│   │   ├── mensajes/          # Componentes de mensajería
│   │   └── layout/            # Componentes de layout
│   ├── lib/                   # Librerías y utilidades
│   │   ├── prisma.ts          # Cliente de Prisma
│   │   ├── utils.ts           # Utilidades generales
│   │   ├── validations/       # Esquemas Zod
│   │   ├── google-calendar.ts # Integración Google Calendar
│   │   ├── twilio.ts          # Integración Twilio
│   │   └── queue/             # Bull Queue jobs
│   ├── hooks/                 # React hooks personalizados
│   └── types/                 # Tipos TypeScript
├── public/
│   └── uploads/               # Archivos subidos
├── scripts/                   # Scripts de utilidad
├── docker-compose.yml         # Configuración Docker
└── package.json
```

## 🎨 Sistema de Diseño con CSS Puro

Este proyecto utiliza CSS puro con **CSS Variables** y **CSS Modules** en lugar de frameworks como Tailwind. Esto proporciona:

- ✅ Mayor control sobre los estilos
- ✅ Sin dependencias externas para estilos
- ✅ Mejor rendimiento (sin clases no utilizadas)
- ✅ CSS más semántico y mantenible

### Variables CSS Disponibles

Todas las variables CSS están definidas en `src/app/globals.css`:

**Colores:**
- `--color-primary`: Color principal verde (#2d9f5d)
- `--color-secondary`: Color secundario azul
- `--color-success`, `--color-warning`, `--color-error`, `--color-info`
- `--color-gray-*`: Escala de grises (50-900)

**Espaciado:**
- `--spacing-xs` a `--spacing-2xl`

**Border Radius:**
- `--radius-sm` a `--radius-full`

**Sombras:**
- `--shadow-sm` a `--shadow-xl`

**Tipografía:**
- `--font-size-*`: Tamaños de fuente
- `--font-weight-*`: Pesos de fuente
- `--line-height-*`: Alturas de línea

### Componentes UI Reutilizables

Los estilos para componentes comunes están en `src/components/ui/common.module.css`:

- Botones (primary, secondary, outline, danger)
- Inputs, textareas, selects
- Cards
- Badges
- Tables
- Alerts
- Modals
- Loading spinners

### Uso de CSS Modules

Ejemplo de uso en componentes:

```tsx
import styles from './MiComponente.module.css'

export default function MiComponente() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Título</h1>
      <button className={styles.button}>Acción</button>
    </div>
  )
}
```

### Clases Utility Globales

Clases utilitarias disponibles globalmente:

- `.container`: Contenedor con max-width y padding
- `.flex`, `.flex-col`: Flexbox
- `.items-center`, `.justify-center`, etc.
- `.mb-*`, `.mt-*`: Márgenes
- `.gap-*`: Gaps para flexbox/grid

## 🔗 Configurar Integraciones

### Google Calendar

Para sincronizar citas automáticamente con Google Calendar:

1. **Guía Rápida**: Ver [docs/GOOGLE_CALENDAR_QUICKSTART.md](./docs/GOOGLE_CALENDAR_QUICKSTART.md)
2. **Guía Completa**: Ver [docs/GOOGLE_CALENDAR_SETUP.md](./docs/GOOGLE_CALENDAR_SETUP.md)

Resumen:
- Crear proyecto en Google Cloud Console
- Habilitar Google Calendar API
- Obtener Client ID y Client Secret
- Configurar variables de entorno
- Conectar desde `/configuracion/google-calendar`

### Twilio WhatsApp

Para mensajería automática por WhatsApp:

1. Crear cuenta en Twilio
2. Activar WhatsApp Sandbox para desarrollo
3. Configurar variables de entorno:
   ```env
   TWILIO_ACCOUNT_SID="tu-account-sid"
   TWILIO_AUTH_TOKEN="tu-auth-token"
   TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
   ```

## 🗄️ Comandos Útiles

### Desarrollo

```bash
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Construir para producción
npm run start            # Iniciar en modo producción
npm run lint             # Ejecutar ESLint
npm run format           # Formatear código con Prettier
npm run type-check       # Verificar tipos TypeScript
```

### Base de Datos

```bash
npm run db:generate      # Generar Prisma Client
npm run db:push          # Push schema sin migraciones (desarrollo)
npm run db:migrate       # Crear y ejecutar migración
npm run db:studio        # Abrir Prisma Studio (GUI)
npm run db:seed          # Poblar base de datos
```

### Docker

```bash
npm run docker:up        # Levantar contenedores
npm run docker:down      # Detener contenedores
npm run docker:build     # Reconstruir imágenes
```

### Worker (Tareas Programadas)

```bash
npm run worker:dev       # Iniciar worker en desarrollo
```

## 🔐 Configuración de Integraciones

### Google Calendar API

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Calendar API**
4. Crea credenciales OAuth 2.0:
   - Tipo: Aplicación web
   - URIs de redireccionamiento: `http://localhost:3000/api/auth/google/callback`
   - Scopes necesarios: `calendar.events`, `calendar.readonly`
5. Copia el Client ID y Client Secret a `.env.local`

### Twilio WhatsApp Business

1. Crea una cuenta en [Twilio](https://www.twilio.com)
2. Solicita un número habilitado para WhatsApp Business
3. Configura tu WhatsApp Business Profile
4. Crea plantillas de mensajes y obtén aprobación de Meta
5. Configura el webhook para mensajes entrantes:
   - URL: `https://tu-dominio.com/api/webhooks/twilio`
   - Method: POST
6. Copia Account SID, Auth Token y número a `.env.local`

## 📊 Modelos de Datos Principales

- **Usuario**: Cuenta del nutriólogo/admin
- **Paciente**: Información del paciente
- **Cita**: Citas agendadas (sincronizadas con Google Calendar)
- **Consulta**: Expediente de consulta con notas y archivos
- **ArchivoAdjunto**: Documentos e imágenes por consulta
- **MensajeWhatsApp**: Historial de mensajes
- **PlantillaWhatsApp**: Plantillas de mensajes predefinidas
- **ConfiguracionMensajeCita**: Configuración de mensajes por cita
- **ConfiguracionSistema**: Configuraciones generales

## 🔒 Seguridad

- Autenticación con NextAuth.js y JWT
- Contraseñas hasheadas con bcrypt (cost factor 12)
- Rate limiting en API routes
- Validación exhaustiva con Zod
- Headers de seguridad configurados
- Sanitización de nombres de archivo
- Protección CSRF
- Variables de entorno para credenciales

## 🚀 Despliegue en Producción

### Preparación

1. Configurar dominio y DNS
2. Obtener certificado SSL (Let's Encrypt)
3. Configurar variables de entorno de producción
4. Configurar backups automáticos

### VPS (Contabo/Hetzner)

```bash
# En el servidor
git clone <repository-url>
cd paulnutriologo
cp .env.example .env
# Editar .env con valores de producción
npm install
npm run docker:up
npm run db:migrate
npm run build
npm run start
```

### Nginx (Reverse Proxy)

Configurar Nginx como reverse proxy en puerto 80/443 apuntando a puerto 3000.

## 🐛 Troubleshooting

### Error de conexión a base de datos

```bash
# Verificar que PostgreSQL esté corriendo
docker ps | grep nutriologo-db

# Ver logs del contenedor
docker logs nutriologo-db
```

### Error con Prisma

```bash
# Regenerar Prisma Client
npm run db:generate

# Resetear base de datos (⚠️ ELIMINA TODOS LOS DATOS)
npx prisma migrate reset
```

### Puerto 3000 en uso

```bash
# Cambiar puerto en .env.local
APP_PORT=3001

# O matar el proceso
lsof -ti:3000 | xargs kill
```

## 📝 Próximos Pasos

Ahora que el proyecto está inicializado, los siguientes pasos son:

**Fase 1**: Implementar autenticación completa y páginas base
**Fase 2**: Desarrollar el sistema de agendamiento público
**Fase 3**: Crear el panel de administración de citas
**Fase 4**: Implementar expediente digital con archivos
**Fase 5**: Integrar mensajería WhatsApp completa
**Fase 6**: Testing, optimización y deployment

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 🤝 Soporte

Para dudas o problemas, contacta al equipo de desarrollo.

---

**⚠️ NOTA IMPORTANTE**: Este sistema maneja datos de salud sensibles. Asegúrate de cumplir con todas las regulaciones locales de protección de datos (GDPR, HIPAA, LFPDPPP en México, etc.).
