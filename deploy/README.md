# Despliegue multi-cliente (SaaS)

Arquitectura **container-per-cliente**: cada nutriólogo corre su propia app + worker
+ Redis, con su propia base de datos (Neon) y su carpeta de archivos aislada en
object storage. Un Traefik compartido enruta los dominios y emite el SSL.

```
        VPS
   Traefik (proxy + SSL Let's Encrypt)
     cliente1.dominio → cliente1-app + cliente1-worker + cliente1-redis
     cliente2.dominio → cliente2-app + cliente2-worker + cliente2-redis
              ↓                         ↓
   Neon Postgres (1 BD/cliente)   Object storage (carpeta/cliente vía S3_PREFIX)
```

Servicios **compartidos** (una cuenta para todos, en `base.env`): object storage,
Google Cloud (OAuth Calendar), OpenAI, Resend, Sentry.
Servicios **por cliente**: base de datos Neon, número de Twilio, dominio.

---

## Preparación del VPS (una sola vez)

```bash
# 1. Red compartida de Docker
docker network create web

# 2. Secretos compartidos
cp deploy/base.env.example deploy/base.env
nano deploy/base.env        # rellenar S3, Google, OpenAI, Resend...

# 3. Levantar Traefik (edita el ACME_EMAIL dentro del yml o expórtalo)
export ACME_EMAIL=tu-correo@ejemplo.com
docker compose -f deploy/traefik.yml up -d
```

## Dar de alta un cliente nuevo

Antes: (a) crea su base de datos en Neon y copia su `DATABASE_URL`; (b) compra su
número de WhatsApp en Twilio; (c) apunta su dominio (registro A) a la IP del VPS.

```bash
./deploy/nuevo-cliente.sh dra-martinez citas.dra-martinez.com
```

El script (interactivo — pide DATABASE_URL, datos de Twilio y del admin):
1. Genera `deploy/clientes/dra-martinez.env` (con un `NEXTAUTH_SECRET` único).
2. Aplica el esquema Prisma a la BD del cliente (`prisma db push`).
3. **Crea el usuario admin del nutriólogo** (si no das contraseña, genera una
   aleatoria y la muestra una sola vez — guárdala).
4. Levanta sus contenedores conectados a Traefik.

En ~1 minuto Traefik emite el certificado y el cliente queda en
`https://citas.dra-martinez.com`, con el nutriólogo ya pudiendo entrar.

### Falta manual tras el alta
- El nutriólogo entra con su email/contraseña y conecta su Google Calendar desde
  `/configuracion`.
- Configurar el webhook de Twilio de su número → `https://<dominio>/api/webhooks/twilio`.

### Crear/resetear el admin a mano (si hace falta)
```bash
ADMIN_EMAIL=doc@ejemplo.com ADMIN_NOMBRE="Dra. Martínez" ADMIN_PASSWORD=... \
  DATABASE_URL="<url-neon-del-cliente>" npx tsx prisma/crear-admin.ts
```
Es idempotente (upsert): si el usuario ya existe, actualiza su contraseña.

## Operación

```bash
# Ver contenedores de un cliente
docker compose -f deploy/cliente.compose.yml --env-file deploy/clientes/<cliente>.env -p <cliente> ps

# Actualizar un cliente a la última versión del código
git pull
docker compose -f deploy/cliente.compose.yml --env-file deploy/clientes/<cliente>.env -p <cliente> up -d --build

# Detener / eliminar un cliente
docker compose -f deploy/cliente.compose.yml --env-file deploy/clientes/<cliente>.env -p <cliente> down
```

## Seguridad de datos
- Cada cliente = BD propia (Neon, con backups automáticos) + carpeta propia de
  archivos + Redis propio → **imposible mezclar datos entre clientes**.
- Los archivos `base.env` y `clientes/*.env` contienen secretos y **NO se suben a
  git** (ver `deploy/.gitignore`).
- Cada cliente tiene su propio `NEXTAUTH_SECRET`.

## Notas
- Un VPS mediano (8 GB) aguanta ~10-15 clientes con el build standalone. Al llenarse,
  agrega otro VPS con su propio Traefik (o un Traefik central + varios VPS backend).
- Google pide **verificar la app** de OAuth cuando tenga muchos usuarios (proceso de
  Google, gratis, toma días). Tenlo en el radar al crecer.
