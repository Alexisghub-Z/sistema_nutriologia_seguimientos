# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Healthcare management system for nutritionists built with Next.js 15. Handles patient records, appointment scheduling, digital medical files, automated WhatsApp messaging via Twilio, Google Calendar sync, and AI-powered patient inquiries via OpenAI.

## Technology Stack

- **Next.js 15.1.7** with App Router and React 19
- **TypeScript 5** with strict type checking
- **PostgreSQL 15** with Prisma ORM 6.1
- **Redis 7** with Bull Queue for background jobs
- **NextAuth v5** (beta) with JWT sessions
- **Integrations**: Twilio WhatsApp, Google Calendar API, OpenAI API
- **Monitoring**: Sentry, Winston logging
- **CSS**: CSS Modules + CSS Variables (no Tailwind)

## Development Commands

### Core Development
```bash
npm run dev              # Start Next.js dev server on :3000
npm run worker:dev       # Start Bull Queue worker (REQUIRED in separate terminal)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint check
npm run type-check       # TypeScript check without compilation
```

### Database Operations
```bash
npm run db:generate      # Generate Prisma Client (run after schema changes)
npm run db:push          # Push schema changes to DB without migrations (dev only)
npm run db:migrate       # Create and run new migration (preferred for prod)
npm run db:studio        # Open Prisma Studio GUI on :5555
npm run db:seed          # Seed database with initial data
```

### Docker & Services
```bash
npm run docker:up        # Start PostgreSQL + Redis containers
npm run docker:down      # Stop containers
npm run docker:build     # Rebuild Docker images
```

### Queue Monitoring
```bash
npm run queue:status     # Check Bull Queue job status
npm run monitor:queue    # Bull Board dashboard (visual queue monitor)
npm run monitor:redis    # Redis CLI monitor
```

## Project Architecture

### Route Organization

```
src/app/
├── (admin)/         # Protected routes - require authentication
│   ├── dashboard/   # Admin dashboard with analytics
│   ├── pacientes/   # Patient management
│   ├── citas/       # Appointment management
│   ├── consultas/   # Medical consultation records
│   ├── mensajes/    # WhatsApp inbox
│   └── configuracion/ # System settings
├── (public)/        # Public routes - no auth required
│   ├── agendar/     # Public appointment booking
│   └── cita/[codigo] # Public appointment view/confirmation
├── api/             # REST API routes
└── login/           # Authentication page
```

**Key Pattern**: Route groups `(admin)` and `(public)` organize routes without affecting URL structure. Admin routes use `requireAuth()` in layout or page, public routes are open.

### Component Organization

```
src/components/
├── ui/              # Base UI components (Button, Card, Alert, etc.)
├── forms/           # Form components (PacienteForm, ConsultaForm)
├── dashboard/       # Dashboard-specific components
├── citas/           # Appointment components
├── consultas/       # Medical record components
├── chat/            # Chat/messaging UI
├── calendario/      # Calendar components (react-big-calendar)
├── layout/          # Layout components (Sidebar, Navigation)
└── providers/       # Context providers (SessionProvider)
```

### Services & Utilities

```
src/lib/
├── auth.ts          # NextAuth configuration
├── auth-utils.ts    # Auth helper functions (requireAuth, getAuthUser)
├── prisma.ts        # Prisma client singleton
├── redis.ts         # Redis client setup
├── rate-limit.ts    # Upstash rate limiting
├── logger.ts        # Winston logger configuration
├── queue/
│   ├── messages.ts  # Bull Queue definitions
│   └── worker.ts    # Background job processor (runs separately)
├── services/
│   ├── twilio.ts    # WhatsApp messaging
│   ├── google-calendar.ts # Calendar sync
│   ├── openai-assistant.ts # AI chatbot
│   └── notificaciones.ts # Email/WhatsApp notifications
└── utils/
    ├── phone.ts     # Phone number validation/formatting
    └── plantillas.ts # WhatsApp template utilities
```

## Authentication System

### NextAuth v5 Configuration

- **Strategy**: JWT sessions (stateless, 30-day expiry)
- **Provider**: Credentials (email + password)
- **Password**: bcryptjs with cost factor 12
- **Type Extensions**: Custom `rol` field added to session/user types in `src/lib/auth.ts:8-26`

### Authentication Utilities (`src/lib/auth-utils.ts`)

**Server Components:**
```typescript
import { requireAuth } from '@/lib/auth-utils'

export default async function ProtectedPage() {
  const user = await requireAuth() // Redirects to /login if not authenticated
  // ...
}
```

**API Routes:**
```typescript
import { getAuthUser } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  const user = await getAuthUser() // Returns null if not authenticated
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  // ...
}
```

**Client Components:**
```typescript
'use client'
import { useSession } from 'next-auth/react'

export default function ClientComponent() {
  const { data: session } = useSession()
  // session.user.id, session.user.rol
}
```

**Note**: No middleware-based auth. Each route/page explicitly checks authentication.

## Database & Prisma

### Key Models

- **Usuario**: Admin users with email/password
- **Paciente**: Registered patients with contact info
- **Prospecto**: Unregistered leads (can be converted to Paciente)
- **Cita**: Appointments with confirmation workflow and Google Calendar sync
- **Consulta**: Medical records with measurements, body composition, and notes
- **ArchivoAdjunto**: Medical documents/images per consultation
- **MensajeWhatsApp**: Message history with status tracking
- **MensajeProspecto**: Messages with unregistered leads
- **PlantillaWhatsApp**: Approved WhatsApp templates for production

### Important Enums

- **EstadoCita**: PENDIENTE, COMPLETADA, CANCELADA, NO_ASISTIO
- **EstadoConfirmacion**: PENDIENTE, RECORDATORIO_ENVIADO, CONFIRMADA, NO_CONFIRMADA, CANCELADA_PACIENTE
- **EstadoMensaje**: PENDIENTE, EN_COLA, ENVIADO, ENTREGADO, LEIDO, FALLIDO, NO_ENTREGADO
- **CategoriaArchivo**: LABORATORIO, ESTUDIO_MEDICO, FOTO_PROGRESO, PLAN_ALIMENTICIO, etc.

### Migration Workflow

1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` (creates migration + applies it)
3. Run `npm run db:generate` (regenerates Prisma Client)
4. Restart dev server if types don't update

**Note**: Schema uses composite indexes for common queries (e.g., `[paciente_id, fecha_hora]`) for performance.

## Background Job Queue System

### Architecture

- **Queue**: Bull (Redis-backed job queue)
- **Worker**: Separate long-running process (`npm run worker:dev`)
- **Jobs**: Appointment reminders, follow-ups, no-show marking

### Critical Requirement

**The worker MUST run alongside the main app in both development and production.**

```bash
# Terminal 1
npm run dev

# Terminal 2 (REQUIRED)
npm run worker:dev
```

**Production**: Docker Compose runs worker as separate container (`nutriologo-worker`).

### Job Types

Defined in `src/lib/queue/messages.ts`:
- `CONFIRMACION`: Appointment confirmation message
- `RECORDATORIO_24H`: 24-hour reminder
- `RECORDATORIO_1H`: 1-hour reminder
- `SEGUIMIENTO`: Post-consultation follow-up
- `MARCAR_NO_ASISTIO`: Automatic no-show marking

**Concurrency**: 5 workers per job type, 3 retry attempts with exponential backoff.

### Job Flow

```
API creates job → Redis queue → Worker picks up →
Sends WhatsApp/Email → Updates DB → Job completed
```

## API Route Patterns

### Standard Authentication Pattern

```typescript
import { getAuthUser } from '@/lib/auth-utils'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Route logic here
}
```

### Input Validation with Zod

```typescript
import { z } from 'zod'

const schema = z.object({
  paciente_id: z.string().min(1),
  fecha_hora: z.string().refine((date) => !isNaN(new Date(date).getTime())),
  motivo_consulta: z.string().min(3)
})

const result = schema.safeParse(body)
if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: 400 })
}
```

### Rate Limiting

Uses Upstash Redis (`src/lib/rate-limit.ts`). Falls back to in-memory Map in development if Upstash not configured.

**Example limits:**
- Public appointment booking: 3 per hour per IP
- Messaging: 20 per hour per IP
- Login: 5 attempts per 15 minutes per IP
- Admin API: 100 per minute per IP

**Usage:**
```typescript
import { checkRateLimit, citasPublicasLimiter } from '@/lib/rate-limit'

const rateLimitResult = await checkRateLimit(citasPublicasLimiter, ip)
if (!rateLimitResult.success) {
  return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 })
}
```

## External Integrations

### Google Calendar

- **OAuth2 Flow**: User authorizes app via `/configuracion/google-calendar`
- **Bidirectional Sync**: Create/update/delete appointments in both systems
- **Color Coding**: Green for completed appointments, blue for scheduled
- **Service**: `src/lib/services/google-calendar.ts`

**Environment Variables:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Twilio WhatsApp

- **Production**: Requires Meta-approved templates (Content SIDs in `.env`)
- **Development**: Sandbox mode with free-form messages
- **Webhooks**: `/api/webhooks/twilio` receives incoming messages
- **Service**: `src/lib/services/twilio.ts`

**Environment Variables:**
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
USE_APPROVED_TEMPLATES=false  # true for production
```

**Template Variables**: Managed in `src/lib/utils/plantillas.ts`

### OpenAI Assistant

- **Purpose**: AI-powered chatbot for patient inquiries
- **Model**: GPT-4o or GPT-4o-mini (configurable)
- **Confidence Threshold**: Only auto-responds if confidence > 0.7
- **Knowledge Base**: System instructions in `src/lib/knowledge-base.ts`
- **Service**: `src/lib/services/openai-assistant.ts`

**Environment Variables:**
```env
OPENAI_API_KEY=sk-xxxxxxxxxx
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
AI_CONFIDENCE_THRESHOLD=0.7
AI_ENABLED=true
```

## Important Conventions

### CSS Approach

**This project uses CSS Modules + CSS Variables, NOT Tailwind.**

- **Global Styles**: `src/app/globals.css` defines CSS variables
- **Component Styles**: `ComponentName.module.css` (scoped to component)
- **Common UI Styles**: `src/components/ui/common.module.css` (buttons, inputs, cards, etc.)

**Example:**
```tsx
import styles from './MyComponent.module.css'

export default function MyComponent() {
  return <div className={styles.container}>Content</div>
}
```

**CSS Variables:**
- Colors: `--color-primary`, `--color-secondary`, `--color-gray-*`
- Spacing: `--spacing-xs` to `--spacing-2xl`
- Radius: `--radius-sm` to `--radius-full`
- Shadows: `--shadow-sm` to `--shadow-xl`

### File Upload

- **Location**: `public/uploads/` (configurable via `UPLOAD_DIR`)
- **Max Size**: 10MB (configurable via `MAX_FILE_SIZE`)
- **Validation**: MIME type checking, filename sanitization
- **Naming**: Sanitized + timestamp to prevent conflicts

### Phone Number Format

Mexican phone numbers validated/formatted via `src/lib/utils/phone.ts`:
- Input: Various formats (10-digit, with country code, etc.)
- Output: E.164 format (`+52XXXXXXXXXX`)
- WhatsApp format: `whatsapp:+52XXXXXXXXXX`

### Logging

Winston logger (`src/lib/logger.ts`) with:
- **Console**: Colorized output in development
- **Files**: Daily rotating files in `logs/` directory
- **Levels**: error, warn, info, debug
- **Sentry Integration**: Errors automatically sent to Sentry

**Usage:**
```typescript
import logger from '@/lib/logger'

logger.info('Operation completed', { userId: user.id })
logger.error('Operation failed', { error: err.message })
```

### Error Tracking

Sentry configured in `instrumentation.ts`:
- Captures unhandled errors and rejections
- Performance monitoring enabled
- Source maps for better stack traces

**Environment Variables:**
```env
SENTRY_DSN=https://xxxxx@oxxxxx.ingest.us.sentry.io/xxxxx
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@oxxxxx.ingest.us.sentry.io/xxxxx
```

## Production Deployment

### Docker Compose Architecture

Four services in `docker-compose.yml`:
1. **db**: PostgreSQL 15 with health checks
2. **redis**: Redis 7 with persistence and 512MB memory limit
3. **app**: Next.js application (production build)
4. **worker**: Bull Queue worker (separate container, same codebase)

### Environment-Specific Settings

**Development:**
- `NODE_ENV=development`
- `NEXTAUTH_URL=http://localhost:3000`
- `USE_APPROVED_TEMPLATES=false` (Twilio sandbox mode)

**Production:**
- `NODE_ENV=production`
- `NEXTAUTH_URL=https://your-domain.com`
- `USE_APPROVED_TEMPLATES=true` (requires Meta-approved templates)
- Configure Upstash Redis for rate limiting

### Critical Checks Before Deployment

1. Worker container is running (`docker ps | grep worker`)
2. Database migrations applied (`npm run db:migrate`)
3. Environment variables set correctly (especially secrets)
4. Upstash Redis configured for rate limiting
5. Google Calendar and Twilio credentials valid
6. Sentry DSN configured for error tracking

## Common Patterns

### Creating a New API Route with Auth

```typescript
import { getAuthUser } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  // Define schema
})

export async function POST(request: NextRequest) {
  // 1. Check authentication
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Parse and validate input
  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // 3. Business logic with Prisma
  const data = await prisma.model.create({ data: result.data })

  // 4. Return response
  return NextResponse.json(data, { status: 201 })
}
```

### Queuing a Background Job

```typescript
import { messageQueue } from '@/lib/queue/messages'

await messageQueue.add('RECORDATORIO_24H', {
  citaId: cita.id,
  pacienteId: cita.paciente_id,
  fechaHora: cita.fecha_hora.toISOString(),
}, {
  delay: calculateDelayMs(cita.fecha_hora, 24 * 60 * 60 * 1000),
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
})
```

### Server Component with Protected Data

```typescript
import { requireAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export default async function PacientesPage() {
  const user = await requireAuth() // Redirects if not authenticated

  const pacientes = await prisma.paciente.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return <div>{/* Render pacientes */}</div>
}
```

## Troubleshooting

### Worker Not Processing Jobs

- Check worker is running: `docker ps | grep worker` or check terminal
- Check Redis connection: `npm run monitor:redis`
- Check queue status: `npm run queue:status`

### Database Connection Issues

- Verify containers: `docker ps | grep nutriologo-db`
- Check logs: `docker logs nutriologo-db`
- Verify DATABASE_URL in `.env`

### Prisma Type Errors

- Regenerate client: `npm run db:generate`
- Restart TypeScript server in editor
- Check schema matches database: `npm run db:push --accept-data-loss` (dev only)

### Rate Limiting Not Working

- Check Upstash credentials in `.env`
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Falls back to in-memory Map if Upstash not configured (dev only)
