# Google Calendar - Guía Rápida

## Resumen

Esta guía te permite configurar Google Calendar en 5 minutos.

## Pasos Rápidos

### 1. Crear Proyecto en Google Cloud (2 min)

1. Ve a https://console.cloud.google.com/
2. Crea un nuevo proyecto
3. Habilita "Google Calendar API" en la biblioteca de APIs

### 2. Configurar OAuth (2 min)

1. Ve a "Pantalla de consentimiento de OAuth"
2. Selecciona "Externo" y completa la información básica
3. Agrega estos scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
4. Agrega tu email como usuario de prueba

### 3. Obtener Credenciales (1 min)

1. Ve a "Credenciales" > "Crear credenciales" > "ID de cliente de OAuth"
2. Tipo: "Aplicación web"
3. URI de redireccionamiento: `http://localhost:3000/api/google-calendar/callback`
4. Copia el **Client ID** y **Client Secret**

### 4. Configurar Variables de Entorno

Agrega a tu archivo `.env`:

```env
GOOGLE_CLIENT_ID="tu-client-id-aqui.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret-aqui"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google-calendar/callback"
```

### 5. Reiniciar y Conectar

```bash
# Reinicia el servidor
npm run dev

# Visita: http://localhost:3000/configuracion/google-calendar
# Haz clic en "Conectar con Google"
```

## ¡Listo!

Ahora las citas se sincronizarán automáticamente con Google Calendar.

## Documentación Completa

Para más detalles, consulta: [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md)
