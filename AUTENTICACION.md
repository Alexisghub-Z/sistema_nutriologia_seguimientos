# 🔐 Sistema de Autenticación

Documentación completa del sistema de autenticación implementado con NextAuth v5 (Auth.js).

## 📋 Índice

1. [Características](#características)
2. [Arquitectura](#arquitectura)
3. [Uso](#uso)
4. [API](#api)
5. [Seguridad](#seguridad)

---

## ✨ Características

✅ **NextAuth v5 (Auth.js)** - Última versión compatible con Next.js 15
✅ **Autenticación con Credentials** - Email y contraseña
✅ **JWT Sessions** - Sesiones ligeras basadas en tokens
✅ **Middleware de Protección** - Rutas protegidas automáticamente
✅ **Utilidades para Server Components** - `requireAuth()`, `getCurrentSession()`
✅ **Hooks para Client Components** - `useSession()`, `signIn()`, `signOut()`
✅ **TypeScript** - Tipado completo de sesiones y usuarios
✅ **Hashing Seguro** - Contraseñas con bcrypt (cost factor 12)

---

## 🏗️ Arquitectura

### Archivos Principales

```
src/
├── lib/
│   ├── auth.ts                    # Configuración central de NextAuth
│   └── auth-utils.ts              # Utilidades de autenticación
├── app/
│   ├── api/auth/[...nextauth]/   # API route de NextAuth
│   │   └── route.ts
│   ├── login/                     # Página de login
│   │   ├── page.tsx
│   │   └── login.module.css
│   └── (admin)/                   # Rutas protegidas
│       └── dashboard/
├── components/providers/
│   └── SessionProvider.tsx        # Provider para cliente
└── middleware.ts                  # Middleware de protección
```

### Flujo de Autenticación

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  /login (UI)    │ ◄── Formulario de login
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ signIn() credentials │ ◄── Envía email/password
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────┐
│ /api/auth/callback/        │ ◄── NextAuth valida
│  credentials               │
└──────────┬─────────────────┘
           │
           ▼
┌──────────────────────────┐
│ Buscar usuario en BD      │ ◄── Prisma query
│ Verificar password (bcrypt)│
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────┐
│ Crear JWT token      │ ◄── Token con user.id, rol
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Redirigir /dashboard │ ◄── Usuario autenticado
└──────────────────────┘
```

---

## 🚀 Uso

### En Server Components

```tsx
import { requireAuth, getCurrentSession } from '@/lib/auth-utils'

// Opción 1: Obtener sesión (puede ser null)
export default async function MyPage() {
  const session = await getCurrentSession()

  if (!session) {
    return <div>No autenticado</div>
  }

  return <div>Hola {session.user.name}</div>
}

// Opción 2: Requerir autenticación (redirige si no está autenticado)
export default async function ProtectedPage() {
  const user = await requireAuth() // Redirige a /login si no está autenticado

  return <div>Hola {user.name}</div>
}
```

### En Client Components

```tsx
'use client'

import { useSession, signIn, signOut } from 'next-auth/react'

export default function MyComponent() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Cargando...</div>
  }

  if (status === 'unauthenticated') {
    return (
      <button onClick={() => signIn()}>
        Iniciar Sesión
      </button>
    )
  }

  return (
    <div>
      <p>Hola {session?.user.name}</p>
      <button onClick={() => signOut()}>
        Cerrar Sesión
      </button>
    </div>
  )
}
```

### Login Programático

```tsx
'use client'

import { signIn } from 'next-auth/react'

async function handleLogin() {
  const result = await signIn('credentials', {
    email: 'admin@nutriologo.com',
    password: 'admin123',
    redirect: false, // No redirigir automáticamente
  })

  if (result?.error) {
    console.error('Error de login:', result.error)
  } else {
    // Login exitoso
    router.push('/dashboard')
  }
}
```

### Logout

```tsx
'use client'

import { signOut } from 'next-auth/react'

async function handleLogout() {
  await signOut({ callbackUrl: '/login' })
}
```

---

## 📡 API

### Endpoints de NextAuth

NextAuth v5 expone automáticamente estos endpoints:

- `GET /api/auth/signin` - Página de login (redirige a `/login`)
- `POST /api/auth/callback/credentials` - Validación de credenciales
- `GET /api/auth/session` - Obtener sesión actual
- `POST /api/auth/signout` - Cerrar sesión
- `GET /api/auth/csrf` - Token CSRF
- `GET /api/auth/providers` - Listar providers

### Session Object

```typescript
{
  user: {
    id: string,          // ID del usuario en BD
    name: string,        // Nombre completo
    email: string,       // Email
    rol: "ADMIN",        // Rol del usuario
  },
  expires: string        // Fecha de expiración
}
```

---

## 🔒 Seguridad

### Protección de Contraseñas

```typescript
// Hash con bcrypt (cost factor 12)
const passwordHash = await bcrypt.hash(password, 12)

// Verificación
const isValid = await bcrypt.compare(password, passwordHash)
```

### JWT Tokens

- **Expiración**: 30 días
- **Secret**: Variable de entorno `NEXTAUTH_SECRET`
- **Storage**: HttpOnly cookies (no accesibles desde JavaScript)
- **CSRF Protection**: Automático con NextAuth

### Middleware de Protección

```typescript
// src/middleware.ts
export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAdminRoute = pathname.startsWith('/dashboard')

  // Redirigir a login si no está autenticado
  if (isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
})
```

### Rutas Protegidas

**Públicas (sin autenticación):**
- `/` - Home
- `/login` - Login
- `/agendar` - Agendamiento público
- `/api/auth/*` - Endpoints de NextAuth

**Protegidas (requieren autenticación):**
- `/dashboard` - Dashboard principal
- `/citas` - Gestión de citas
- `/pacientes` - Gestión de pacientes
- `/mensajes` - Mensajería WhatsApp
- `/configuracion` - Configuración del sistema

---

## 🧪 Testing

### Credenciales de Prueba

```
Email: admin@nutriologo.com
Password: admin123
```

### Probar Autenticación

1. **Acceder a ruta protegida sin login:**
   - Ir a `http://localhost:3000/dashboard`
   - Debe redirigir a `/login`

2. **Login exitoso:**
   - Ir a `http://localhost:3000/login`
   - Ingresar credenciales
   - Debe redirigir a `/dashboard`

3. **Logout:**
   - En `/dashboard`, hacer clic en "Cerrar Sesión"
   - Debe redirigir a `/login`

4. **Acceder a login estando autenticado:**
   - Estando logueado, ir a `/login`
   - Debe redirigir a `/dashboard`

---

## 🔧 Configuración

### Variables de Entorno Requeridas

```env
# .env o .env.local
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
DATABASE_URL="postgresql://..."
```

### Generar NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

---

## 🚨 Troubleshooting

### Error: "NEXTAUTH_SECRET is not set"

**Solución:** Asegúrate de tener `NEXTAUTH_SECRET` en tu archivo `.env` o `.env.local`

### Error: "Credenciales inválidas"

**Posibles causas:**
- Email o contraseña incorrectos
- Usuario no existe en la base de datos
- Base de datos no está corriendo

**Solución:** Verifica que ejecutaste el seed: `npm run db:seed`

### Sesión no persiste al recargar

**Posibles causas:**
- SessionProvider no está en el layout raíz
- Cookies bloqueadas por el navegador

**Solución:**
- Verificar que `<SessionProvider>` envuelve la app
- Limpiar cookies del navegador

### Middleware no protege rutas

**Solución:** Verifica que `middleware.ts` esté en la raíz de `src/`

---

## 📚 Recursos Adicionales

- [NextAuth v5 Documentation](https://authjs.dev/getting-started/introduction)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)

---

**✅ Sistema de autenticación completamente funcional y listo para producción.**
