#!/usr/bin/env bash
# ============================================================
# Alta de un cliente nuevo (SaaS container-per-cliente)
# ============================================================
# Genera el .env del cliente a partir de deploy/cliente.env.plantilla,
# rellenando los valores compartidos desde deploy/base.env y los
# específicos del cliente que se piden de forma interactiva.
# Luego (opcional) levanta sus contenedores con Traefik.
#
# Uso:
#   ./deploy/nuevo-cliente.sh <cliente> <dominio>
#   ./deploy/nuevo-cliente.sh dra-martinez citas.dra-martinez.com
#
# Requisitos previos (una sola vez en el VPS):
#   - docker network create web
#   - docker compose -f deploy/traefik.yml up -d
#   - deploy/base.env con los secretos COMPARTIDOS (ver base.env.example)
#   - La BD del cliente ya creada en Neon (pega su DATABASE_URL cuando se pida)
#   - El número de Twilio del cliente ya comprado

set -euo pipefail

CLIENTE="${1:-}"
DOMINIO="${2:-}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "$CLIENTE" || -z "$DOMINIO" ]]; then
  echo "Uso: $0 <cliente> <dominio>"
  echo "Ej:  $0 dra-martinez citas.dra-martinez.com"
  exit 1
fi

# Validar nombre de cliente (solo minúsculas, números y guiones)
if [[ ! "$CLIENTE" =~ ^[a-z0-9-]+$ ]]; then
  echo "❌ El nombre del cliente solo puede tener minúsculas, números y guiones."
  exit 1
fi

BASE_ENV="$DIR/base.env"
PLANTILLA="$DIR/cliente.env.plantilla"
DESTINO="$DIR/clientes/${CLIENTE}.env"

if [[ ! -f "$BASE_ENV" ]]; then
  echo "❌ Falta $BASE_ENV (copia base.env.example y rellena los secretos compartidos)."
  exit 1
fi
if [[ -f "$DESTINO" ]]; then
  echo "❌ Ya existe $DESTINO. Bórralo si quieres regenerarlo."
  exit 1
fi

# Cargar secretos compartidos
set -a; source "$BASE_ENV"; set +a

# Pedir los datos específicos del cliente
echo "── Datos del cliente '$CLIENTE' ($DOMINIO) ──"
read -rp "DATABASE_URL (de Neon para este cliente): " DATABASE_URL
read -rp "TWILIO_ACCOUNT_SID: " TWILIO_ACCOUNT_SID
read -rp "TWILIO_AUTH_TOKEN: " TWILIO_AUTH_TOKEN
read -rp "TWILIO_WHATSAPP_NUMBER (ej: whatsapp:+521...): " TWILIO_WHATSAPP_NUMBER
echo "── Usuario administrador del nutriólogo ──"
read -rp "Email del admin (login del nutriólogo): " ADMIN_EMAIL
read -rp "Nombre del admin: " ADMIN_NOMBRE
read -rp "Contraseña (vacío = generar aleatoria segura): " ADMIN_PASSWORD

# Generar un NEXTAUTH_SECRET único por cliente
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

mkdir -p "$DIR/clientes"

# Rellenar la plantilla
sed \
  -e "s|{{CLIENTE}}|${CLIENTE}|g" \
  -e "s|{{DOMINIO}}|${DOMINIO}|g" \
  -e "s|{{NEXTAUTH_SECRET}}|${NEXTAUTH_SECRET}|g" \
  -e "s|{{DATABASE_URL}}|${DATABASE_URL}|g" \
  -e "s|{{S3_ENDPOINT}}|${S3_ENDPOINT}|g" \
  -e "s|{{S3_BUCKET}}|${S3_BUCKET}|g" \
  -e "s|{{S3_ACCESS_KEY}}|${S3_ACCESS_KEY}|g" \
  -e "s|{{S3_SECRET_KEY}}|${S3_SECRET_KEY}|g" \
  -e "s|{{TWILIO_ACCOUNT_SID}}|${TWILIO_ACCOUNT_SID}|g" \
  -e "s|{{TWILIO_AUTH_TOKEN}}|${TWILIO_AUTH_TOKEN}|g" \
  -e "s|{{TWILIO_WHATSAPP_NUMBER}}|${TWILIO_WHATSAPP_NUMBER}|g" \
  -e "s|{{GOOGLE_CLIENT_ID}}|${GOOGLE_CLIENT_ID}|g" \
  -e "s|{{GOOGLE_CLIENT_SECRET}}|${GOOGLE_CLIENT_SECRET}|g" \
  -e "s|{{OPENAI_API_KEY}}|${OPENAI_API_KEY}|g" \
  -e "s|{{RESEND_API_KEY}}|${RESEND_API_KEY}|g" \
  -e "s|{{RESEND_FROM_EMAIL}}|${RESEND_FROM_EMAIL}|g" \
  -e "s|{{SENTRY_DSN}}|${SENTRY_DSN:-}|g" \
  "$PLANTILLA" > "$DESTINO"

chmod 600 "$DESTINO"
echo "✅ Generado $DESTINO"

# Aplicar migraciones de esquema a la BD del cliente (crea las tablas)
echo "── Aplicando esquema a la BD del cliente ──"
if DATABASE_URL="$DATABASE_URL" npx prisma db push --skip-generate; then
  # Crear el usuario admin del nutriólogo en su BD
  echo "── Creando usuario administrador ──"
  DATABASE_URL="$DATABASE_URL" \
  ADMIN_EMAIL="$ADMIN_EMAIL" \
  ADMIN_NOMBRE="$ADMIN_NOMBRE" \
  ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    npx tsx "$DIR/../prisma/crear-admin.ts" || echo "⚠️  No se pudo crear el admin. Créalo luego con prisma/crear-admin.ts"
else
  echo "⚠️  No se pudo aplicar el esquema. Revisa la DATABASE_URL. El .env quedó generado."
  echo "   (No se creó el usuario admin porque la BD no está lista.)"
fi

echo ""
echo "── Levantando contenedores del cliente ──"
read -rp "¿Levantar ahora los contenedores de '$CLIENTE'? [y/N] " LEVANTAR
if [[ "${LEVANTAR:-N}" =~ ^[Yy]$ ]]; then
  docker compose -f "$DIR/cliente.compose.yml" \
    --env-file "$DESTINO" \
    -p "$CLIENTE" up -d --build
  echo ""
  echo "🎉 Cliente '$CLIENTE' desplegado en https://$DOMINIO"
  echo "   Traefik emitirá el certificado SSL en unos segundos."
  echo "   Falta: el nutriólogo entra con su email/contraseña, conecta su Google"
  echo "   Calendar en /configuracion y se configura el webhook de Twilio."
else
  echo "Cuando quieras levantarlo:"
  echo "  docker compose -f deploy/cliente.compose.yml --env-file $DESTINO -p $CLIENTE up -d --build"
fi
