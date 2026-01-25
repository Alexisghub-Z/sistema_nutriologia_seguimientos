# 📧 Configuración de Notificaciones

Este documento explica cómo configurar las notificaciones para recibir alertas cuando se agenda una nueva cita.

---

## 🔔 Tipos de Notificaciones Implementadas

### 1. Google Calendar (Notificación ~1 minuto después de crear cita)
- ✅ Popup en la app de Google Calendar
- ✅ Email de Google Calendar
- ✅ Ya configurado automáticamente

### 2. Email Directo (Notificación INSTANTÁNEA)
- ✅ Email HTML profesional
- ✅ Información completa del paciente y cita
- ✅ Requiere configuración

---

## 📱 Configurar Google Calendar

### En tu Celular:
1. Instala **Google Calendar** (Android/iOS)
2. Inicia sesión con la cuenta donde conectaste el calendario
3. Ve a **☰ Menú** → **Configuración**
4. Selecciona tu calendario
5. Activa **"Notificaciones"**
6. En ajustes del celular, permite notificaciones de Google Calendar

### En tu Computadora:
1. Abre **calendar.google.com**
2. Haz clic en **⚙️ Configuración**
3. **Notificaciones** → Activar todo
4. Acepta permitir notificaciones del navegador

---

## 📧 Configurar Email con Gmail

### Paso 1: Crear App Password de Gmail

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. En el menú izquierdo: **Seguridad**
3. En "Cómo inicias sesión en Google": **Verificación en 2 pasos**
4. Si no está activada, actívala primero
5. Una vez activada, regresa a **Seguridad**
6. Busca **Contraseñas de aplicaciones** (App passwords)
7. Clic en **Contraseñas de aplicaciones**
8. Selecciona:
   - App: **Correo**
   - Dispositivo: **Otro (personalizado)**
   - Nombre: `Sistema Nutriología`
9. Haz clic en **Generar**
10. Copia el código de 16 caracteres que aparece (ej: `abcd efgh ijkl mnop`)

**IMPORTANTE:** Guarda este código, solo se muestra una vez.

### Paso 2: Configurar Variables de Entorno

Edita tu archivo `.env` (NO `.env.example`) y agrega:

```bash
# Email del nutriólogo que recibirá las notificaciones
NUTRIOLOGO_EMAIL="tu-email@gmail.com"

# Cuenta de Gmail para enviar emails
GMAIL_USER="tu-email@gmail.com"

# App Password generado en el paso anterior (SIN espacios)
GMAIL_APP_PASSWORD="abcdefghijklmnop"
```

**Nota:** Si el App Password tiene espacios (ej: `abcd efgh ijkl mnop`), quítalos: `abcdefghijklmnop`

### Paso 3: Reiniciar Aplicación

```bash
# Detener servidor (Ctrl+C)

# Reiniciar
npm run dev
```

---

## ✅ Probar que Funciona

### Test 1: Email

1. Ve a http://localhost:3000/agendar
2. Agenda una cita de prueba
3. **Inmediatamente** deberías recibir un email como:

```
De: Sistema de Citas
Asunto: 🔔 Nueva Cita Agendada - Juan Pérez

🔔 Nueva Cita Agendada
[Tarjeta bonita con todos los datos del paciente]
```

### Test 2: Google Calendar

1. Agenda una cita de prueba
2. Espera **1-2 minutos**
3. Deberías recibir:
   - 📱 Notificación popup en Google Calendar
   - 📧 Email de Google Calendar

---

## 🛠️ Troubleshooting

### No recibo emails

**Problema: No llegan emails**

1. Verifica que las variables estén en `.env` (NO `.env.example`)
2. Verifica que no haya espacios en `GMAIL_APP_PASSWORD`
3. Verifica que la verificación en 2 pasos esté activa
4. Revisa los logs del servidor:
   ```bash
   npm run dev
   # Busca mensajes como:
   # ✅ Email de notificación enviado
   # o
   # ❌ Error al enviar email
   ```

**Problema: Error "Invalid login"**

- Regenera el App Password
- Asegúrate de usar el App Password, NO tu contraseña normal de Gmail

**Problema: Email va a spam**

- Marca como "No es spam" en Gmail
- Los emails futuros llegarán a la bandeja principal

### No recibo notificaciones de Google Calendar

**Problema: No aparecen popups**

1. Verifica que Google Calendar esté conectado correctamente
2. Revisa que las notificaciones estén activadas en la app
3. Verifica permisos del navegador/app

**Problema: La notificación llega mucho tiempo después**

- Esto es normal, Google procesa las notificaciones cada 1-5 minutos
- Por eso el email instantáneo es más confiable

---

## 📊 Ejemplo de Email Recibido

Cuando alguien agenda una cita, recibirás un email profesional como:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔔 Nueva Cita Agendada
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆕 PACIENTE NUEVO (o 🔄 PACIENTE RECURRENTE)

👤 INFORMACIÓN DEL PACIENTE:
• Nombre: Juan Pérez García
• Email: juan@example.com
• Teléfono: +5219515886761

📅 DETALLES DE LA CITA:
• Fecha: miércoles, 28 de enero de 2026
• Hora: 18:00
• Modalidad: 🏥 Presencial

📋 MOTIVO DE CONSULTA:
Quiero empezar un plan nutricional para bajar de peso

🔑 CÓDIGO DE CITA: ABC12345

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Este es un mensaje automático.
La cita también ha sido agregada a tu Google Calendar.
```

---

## 🔐 Seguridad

### ¿Es seguro usar App Password?

✅ **Sí**, los App Passwords son seguros:
- Son específicos para una aplicación
- Puedes revocarlos en cualquier momento
- No dan acceso completo a tu cuenta
- Solo permiten enviar emails desde tu cuenta

### Revocar acceso

Si necesitas revocar el acceso:

1. Ve a https://myaccount.google.com/apppasswords
2. Encuentra "Sistema Nutriología"
3. Haz clic en **Eliminar**
4. Genera uno nuevo si es necesario

---

## 🎯 Resumen de Notificaciones

| Método | Velocidad | Configuración | Confiabilidad |
|--------|-----------|---------------|---------------|
| **Email directo** | Instantánea (0-5 seg) | Media | ⭐⭐⭐⭐⭐ |
| **Google Calendar Popup** | 1-5 minutos | Baja | ⭐⭐⭐⭐ |
| **Google Calendar Email** | 1-5 minutos | Baja | ⭐⭐⭐⭐ |

**Recomendación:** Configura ambos para máxima confiabilidad.

---

## 📞 Agregar WhatsApp (Opcional)

Si quieres también recibir WhatsApp cuando se agenda una cita, avísame y te ayudo a implementarlo con Twilio (que ya tienes configurado).
