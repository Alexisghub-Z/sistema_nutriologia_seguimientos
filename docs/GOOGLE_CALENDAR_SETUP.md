# Configuración de Google Calendar API

Esta guía te ayudará a obtener las credenciales necesarias para conectar tu sistema con Google Calendar.

## Paso 1: Crear un Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en el selector de proyectos en la parte superior
4. Haz clic en **"Nuevo Proyecto"**
5. Dale un nombre al proyecto (ej: "Sistema Nutriología")
6. Haz clic en **"Crear"**

## Paso 2: Habilitar la API de Google Calendar

1. En el menú lateral, ve a **"APIs y servicios"** > **"Biblioteca"**
2. Busca "Google Calendar API"
3. Haz clic en **"Google Calendar API"**
4. Haz clic en **"Habilitar"**

## Paso 3: Configurar la Pantalla de Consentimiento de OAuth

1. En el menú lateral, ve a **"APIs y servicios"** > **"Pantalla de consentimiento de OAuth"**
2. Selecciona **"Externo"** como tipo de usuario
3. Haz clic en **"Crear"**
4. Completa la información requerida:
   - **Nombre de la aplicación**: Sistema de Nutriología
   - **Correo electrónico de asistencia del usuario**: tu correo
   - **Correo electrónico del desarrollador**: tu correo
5. Haz clic en **"Guardar y continuar"**
6. En la sección de **"Scopes"**, haz clic en **"Agregar o quitar scopes"**
7. Busca y selecciona los siguientes scopes:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
8. Haz clic en **"Actualizar"** y luego en **"Guardar y continuar"**
9. En **"Usuarios de prueba"**, agrega tu correo electrónico
10. Haz clic en **"Guardar y continuar"**
11. Revisa el resumen y haz clic en **"Volver al panel"**

## Paso 4: Crear Credenciales de OAuth 2.0

1. En el menú lateral, ve a **"APIs y servicios"** > **"Credenciales"**
2. Haz clic en **"Crear credenciales"** > **"ID de cliente de OAuth"**
3. Selecciona **"Aplicación web"** como tipo de aplicación
4. Dale un nombre (ej: "Cliente Web Nutriología")
5. En **"URIs de redireccionamiento autorizados"**, agrega:
   - Para desarrollo: `http://localhost:3000/api/google-calendar/callback`
   - Para producción: `https://tudominio.com/api/google-calendar/callback`
6. Haz clic en **"Crear"**
7. Verás una ventana con tu **Client ID** y **Client Secret**
8. **¡IMPORTANTE!** Copia estos valores, los necesitarás en el siguiente paso

## Paso 5: Configurar las Variables de Entorno

1. Abre tu archivo `.env` en el directorio raíz del proyecto
2. Agrega o actualiza las siguientes variables:

```env
# ============================================
# GOOGLE CALENDAR API
# ============================================
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/google-calendar/callback"
```

3. Reemplaza `tu-client-id` y `tu-client-secret` con los valores que copiaste en el paso anterior
4. Para producción, actualiza `GOOGLE_REDIRECT_URI` con tu dominio real

## Paso 6: Reiniciar la Aplicación

1. Reinicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. La aplicación ahora puede comunicarse con Google Calendar

## Paso 7: Conectar la Cuenta de Google

1. Ve a la página de configuración en tu aplicación:
   - URL: `http://localhost:3000/configuracion/google-calendar`

2. Haz clic en el botón **"Conectar con Google"**

3. Serás redirigido a Google para autorizar la aplicación

4. Selecciona la cuenta de Google que deseas usar (debe ser la misma que agregaste como usuario de prueba)

5. Revisa los permisos solicitados y haz clic en **"Permitir"**

6. Serás redirigido de vuelta a la aplicación

7. Deberías ver el mensaje **"Google Calendar conectado exitosamente"**

## Verificación

Para verificar que todo está funcionando correctamente:

1. Crea una nueva cita en el sistema
2. La cita debería aparecer automáticamente en tu Google Calendar
3. Cualquier invitación de calendario se enviará automáticamente a los pacientes por email

## Sincronización de Citas

### Sincronización Automática

Las citas se sincronizan automáticamente cuando:
- Se crea una nueva cita
- Se actualiza una cita existente
- Se cancela una cita

### Sincronización Manual

También puedes sincronizar citas manualmente usando el endpoint:

```bash
POST /api/google-calendar/sync
Content-Type: application/json

{
  "citaId": "id-de-la-cita",
  "action": "sync"
}
```

Para desincronizar:

```bash
POST /api/google-calendar/sync
Content-Type: application/json

{
  "citaId": "id-de-la-cita",
  "action": "unsync"
}
```

## Características Disponibles

### 1. Sincronización Bidireccional
- Las citas creadas en el sistema aparecen en Google Calendar
- Las modificaciones se sincronizan automáticamente

### 2. Invitaciones Automáticas
- Los pacientes reciben invitaciones de calendario por email
- Pueden aceptar/rechazar desde su propio calendario

### 3. Recordatorios
- Google Calendar envía recordatorios automáticos
- Configurable: 1 día antes y 1 hora antes

### 4. Información Detallada
- Título: "Consulta: [Nombre del Paciente]"
- Descripción: Motivo de la consulta
- Duración: 1 hora (configurable)
- Ubicación: Puede agregarse en futuras versiones

## Solución de Problemas

### Error: "Error en la autenticación con Google"

**Solución:**
- Verifica que las variables de entorno estén correctamente configuradas
- Asegúrate de que el Redirect URI en Google Cloud coincida exactamente con el configurado en `.env`

### Error: "No se recibió código de autorización"

**Solución:**
- El usuario canceló la autorización
- Intenta conectar nuevamente

### Error: "Error al intercambiar código por tokens"

**Solución:**
- Verifica que el Client Secret sea correcto
- Asegúrate de que el Client ID sea correcto
- Verifica que la aplicación tenga los permisos correctos en Google Cloud

### Las citas no aparecen en Google Calendar

**Solución:**
- Verifica que Google Calendar esté conectado en `/configuracion/google-calendar`
- Revisa los logs del servidor para ver si hay errores
- Asegúrate de que los tokens no hayan expirado (la renovación es automática)

## Límites y Cuotas

Google Calendar API tiene los siguientes límites:
- **Consultas por día**: 1,000,000 (más que suficiente para uso normal)
- **Consultas por usuario por segundo**: 10

Si necesitas aumentar estos límites, puedes solicitarlo en Google Cloud Console.

## Seguridad

### Buenas Prácticas

1. **Nunca compartas tus credenciales**
   - Mantén el Client Secret seguro
   - No lo subas a GitHub u otros repositorios públicos

2. **Usa variables de entorno**
   - Las credenciales deben estar en `.env`
   - El archivo `.env` debe estar en `.gitignore`

3. **Usuarios de prueba en desarrollo**
   - Durante el desarrollo, agrega solo usuarios de prueba
   - Esto evita problemas de verificación de Google

4. **Publicar la aplicación**
   - Para uso en producción, deberás verificar la aplicación con Google
   - Sigue el proceso de verificación en Google Cloud Console

## Producción

### Preparar para Producción

1. **Actualizar URIs de redireccionamiento**
   ```env
   GOOGLE_REDIRECT_URI="https://tudominio.com/api/google-calendar/callback"
   ```

2. **Agregar dominio en Google Cloud**
   - Ve a Google Cloud Console
   - Actualiza los URIs de redireccionamiento autorizados
   - Agrega tu dominio de producción

3. **Verificar la aplicación**
   - Para quitar el aviso de "Aplicación no verificada"
   - Sigue el proceso de verificación de Google
   - Puede tomar varios días

4. **Monitoreo**
   - Revisa los logs regularmente
   - Monitorea el uso de la API en Google Cloud Console
   - Configura alertas si es necesario

## Recursos Adicionales

- [Documentación oficial de Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 para aplicaciones web](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)

## Soporte

Si tienes problemas con la configuración:
1. Revisa esta documentación cuidadosamente
2. Verifica los logs del servidor
3. Consulta la documentación oficial de Google
