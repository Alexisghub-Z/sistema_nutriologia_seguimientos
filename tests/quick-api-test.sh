#!/bin/bash
# Test rápido de API con curl y Apache Bench
# No requiere instalación de herramientas extra

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
NUM_REQUESTS="${NUM_REQUESTS:-100}"
CONCURRENCY="${CONCURRENCY:-10}"

echo ""
echo "🧪 ========================================"
echo "   TEST RÁPIDO DE API"
echo "   ========================================"
echo ""
echo "📊 Configuración:"
echo "   - URL Base: $BASE_URL"
echo "   - Requests: $NUM_REQUESTS"
echo "   - Concurrencia: $CONCURRENCY"
echo ""

# Test 1: Verificar que el servidor esté corriendo
echo "🔍 Test 1: Verificando servidor..."
if curl -s -f "$BASE_URL" > /dev/null 2>&1; then
    echo "   ✅ Servidor respondiendo"
else
    echo "   ❌ Servidor no responde en $BASE_URL"
    echo "   Asegúrate de que Next.js esté corriendo (npm run dev)"
    exit 1
fi

# Test 2: Crear una cita de prueba
echo ""
echo "📝 Test 2: Creando cita de prueba..."

TIMESTAMP=$(date +%s)
RESPONSE=$(curl -s -X POST "$BASE_URL/api/citas/publica" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test User '"$TIMESTAMP"'",
    "email": "test'"$TIMESTAMP"'@example.com",
    "telefono": "5512345678",
    "fecha_nacimiento": "1990-01-01",
    "fecha_cita": "2026-02-15",
    "hora_cita": "10:00",
    "motivo": "Consulta de prueba para testing",
    "tipo_cita": "PRESENCIAL"
  }')

if echo "$RESPONSE" | grep -q "codigo_cita"; then
    CODIGO=$(echo "$RESPONSE" | grep -o '"codigo_cita":"[^"]*"' | cut -d'"' -f4)
    echo "   ✅ Cita creada exitosamente"
    echo "   📋 Código: $CODIGO"
else
    echo "   ❌ Error creando cita"
    echo "   Response: $RESPONSE"
fi

# Test 3: Test de carga con Apache Bench (si está instalado)
echo ""
echo "⚡ Test 3: Test de carga..."

if command -v ab &> /dev/null; then
    echo "   Ejecutando Apache Bench ($NUM_REQUESTS requests, $CONCURRENCY concurrentes)..."

    # Test GET simple
    ab -n "$NUM_REQUESTS" -c "$CONCURRENCY" -q "$BASE_URL/" > /tmp/ab-test.txt 2>&1

    echo ""
    echo "   📊 Resultados:"
    grep "Requests per second" /tmp/ab-test.txt | sed 's/^/   /'
    grep "Time per request" /tmp/ab-test.txt | sed 's/^/   /'
    grep "Failed requests" /tmp/ab-test.txt | sed 's/^/   /'

    echo ""
    echo "   📄 Reporte completo guardado en: /tmp/ab-test.txt"
else
    echo "   ⚠️  Apache Bench (ab) no instalado"
    echo "   Instalación:"
    echo "     - Ubuntu/Debian: sudo apt install apache2-utils"
    echo "     - macOS: brew install httpd (incluye ab)"
    echo ""
    echo "   Ejecutando test simple con curl..."

    START=$(date +%s)
    SUCCESS=0
    FAILED=0

    for i in $(seq 1 20); do
        if curl -s -f "$BASE_URL/" > /dev/null 2>&1; then
            SUCCESS=$((SUCCESS + 1))
        else
            FAILED=$((FAILED + 1))
        fi
    done

    END=$(date +%s)
    DURATION=$((END - START))
    RPS=$(echo "scale=2; 20 / $DURATION" | bc)

    echo ""
    echo "   📊 Resultados (20 requests):"
    echo "   - Tiempo total: ${DURATION}s"
    echo "   - Exitosas: $SUCCESS"
    echo "   - Fallidas: $FAILED"
    echo "   - Requests/segundo: ~$RPS"
fi

# Test 4: Verificar estado de Redis
echo ""
echo "🔴 Test 4: Verificando Redis..."

if command -v redis-cli &> /dev/null; then
    REDIS_HOST="${REDIS_HOST:-localhost}"
    REDIS_PORT="${REDIS_PORT:-6380}"
    REDIS_PASS="${REDIS_PASSWORD:-redis123}"

    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASS" --no-auth-warning ping > /dev/null 2>&1; then
        echo "   ✅ Redis conectado"

        # Obtener info de memoria
        MEMORY=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASS" --no-auth-warning info memory | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
        KEYS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASS" --no-auth-warning dbsize | cut -d: -f2 | tr -d '\r')

        echo "   📊 Memoria usada: $MEMORY"
        echo "   🔑 Keys totales: $KEYS"
    else
        echo "   ⚠️  No se pudo conectar a Redis"
    fi
else
    echo "   ⚠️  redis-cli no instalado"
fi

echo ""
echo "✅ ========================================"
echo "   TEST COMPLETADO"
echo "   ========================================"
echo ""
