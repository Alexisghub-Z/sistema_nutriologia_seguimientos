# 🧪 Guía Completa de Testing

Esta guía cubre todas las herramientas disponibles para testear tu sistema de nutriología.

---

## 📋 Tabla de Contenidos

1. [Monitoreo en Tiempo Real](#1-monitoreo-en-tiempo-real)
2. [Testing de Carga/Performance](#2-testing-de-cargaperformance)
3. [Testing de Cola de Mensajes](#3-testing-de-cola-de-mensajes)
4. [Testing de APIs](#4-testing-de-apis)
5. [Testing de Base de Datos](#5-testing-de-base-de-datos)
6. [Monitoreo en Producción](#6-monitoreo-en-producción)

---

## 1. Monitoreo en Tiempo Real

### 🎯 Bull Board - Dashboard Visual de la Cola

**Instalado:** ✅ Ya está configurado

**Qué hace:** Interfaz web para ver todos tus jobs de mensajería en tiempo real.

**Usar:**
```bash
npm run monitor:queue
```

Luego abre: **http://localhost:3001**

**Lo que puedes ver:**
- Jobs en espera (waiting)
- Jobs activos (active)
- Jobs completados (completed)
- Jobs fallidos (failed)
- Jobs programados (delayed)
- Detalles de cada job
- Logs y errores

**Acciones disponibles:**
- ✅ Reintentar jobs fallidos
- ❌ Eliminar jobs
- 🧹 Limpiar cola completa
- 🔍 Buscar jobs específicos

---

### 🔴 Monitor de Redis

**Qué hace:** Muestra estadísticas de uso de memoria, keys, y estado de Redis.

**Usar:**
```bash
npm run monitor:redis
```

**Salida:**
- Versión de Redis
- Memoria usada vs límite
- Cantidad de keys
- Keys de Bull Queue específicamente
- Conexiones y comandos procesados

---

## 2. Testing de Carga/Performance

### ⚡ Test de Escalabilidad Interno

**Instalado:** ✅ Script custom incluido

**Qué hace:** Simula la creación de citas masivas y mide performance.

**Usar:**
```bash
# Test pequeño (100 citas)
npm run test:escalabilidad

# Test mediano (500 citas)
NUM_CITAS=500 npm run test:escalabilidad

# Test grande (1000 citas)
NUM_CITAS=1000 npm run test:escalabilidad

# Personalizado
NUM_CITAS=2000 npm run test:escalabilidad
```

**Métricas que mide:**
- ⏱️ Tiempo de creación de citas
- ⏱️ Tiempo de cancelación de citas
- 🚀 Comparación búsqueda O(1) vs O(n)
- 📊 Estado de la cola antes/después

**Después del test:**
```bash
npm run queue:status  # Ver estado
npm run queue:clean   # Limpiar jobs de prueba
```

---

### 🔥 k6 - Testing de Carga Profesional

**Instalación:**
```bash
# Linux
sudo apt install k6

# macOS
brew install k6

# Windows
choco install k6
```

**Usar:**
```bash
# Test básico
k6 run tests/load-test.js

# Test con 50 usuarios durante 1 minuto
k6 run --vus 50 --duration 1m tests/load-test.js

# Test con configuración custom
k6 run --vus 100 --duration 2m tests/load-test.js
```

**Archivo de configuración:** `tests/load-test.js`

**Qué testea:**
- Crear citas públicas masivamente
- Listar pacientes
- Tiempo de respuesta
- Tasa de errores
- Percentiles (p95, p99)

**Ejemplo de salida:**
```
scenarios: (100.00%) 1 scenario, 50 max VUs, 1m30s max duration
✓ Crear cita - status 201
✓ Crear cita - respuesta rápida

checks.........................: 98.50% ✓ 1970  ✗ 30
http_req_duration..............: avg=245ms p(95)=450ms
http_req_failed................: 1.50%
iterations.....................: 1000
```

---

### 💥 Artillery - Alternativa a k6

**Instalación:**
```bash
npm install -g artillery
```

**Usar:**
```bash
# Test básico
artillery run tests/artillery-load-test.yml

# Con reporte JSON
artillery run --output report.json tests/artillery-load-test.yml

# Generar reporte HTML
artillery report report.json
```

**Archivo de configuración:** `tests/artillery-load-test.yml`

**Fases del test:**
1. Warm up: 10 usuarios/seg durante 30s
2. Sustained load: 20 usuarios/seg durante 60s
3. Spike: 50 usuarios/seg durante 30s

**Ventajas:**
- Configuración YAML simple
- Reportes HTML bonitos
- Escenarios complejos fáciles

---

### 🏃 Test Rápido con curl/Apache Bench

**Instalación Apache Bench (opcional):**
```bash
# Ubuntu/Debian
sudo apt install apache2-utils

# macOS
brew install httpd
```

**Usar:**
```bash
npm run test:api

# Con configuración custom
NUM_REQUESTS=500 CONCURRENCY=50 npm run test:api
```

**Qué hace:**
1. Verifica que el servidor esté corriendo
2. Crea una cita de prueba
3. Ejecuta test de carga con Apache Bench (si está instalado)
4. Verifica conexión a Redis

**No requiere instalación extra** - funciona con curl básico.

---

## 3. Testing de Cola de Mensajes

### 📊 Ver Estado de la Cola

```bash
npm run queue:status
```

Muestra:
- Jobs waiting, active, completed, failed, delayed
- Detalles de cada tipo de job
- Próximos jobs programados

---

### 🧹 Limpiar Cola

```bash
# Limpiar TODOS los jobs (usar con cuidado)
npm run queue:clean

# Limpiar solo jobs antiguos (seguro)
npm run queue:cleanup
```

---

### 🔍 Inspeccionar Jobs Específicos

Usa Bull Board para inspección detallada:
```bash
npm run monitor:queue
```

En el dashboard puedes:
- Ver payload de cada job
- Ver logs de ejecución
- Ver stack traces de errores
- Reintentar manualmente

---

## 4. Testing de APIs

### 🧪 Postman / Insomnia

**Recomendado para:** Testing manual de endpoints

**Colección de prueba:**

1. **POST /api/citas/publica** - Crear cita
```json
{
  "nombre": "Test User",
  "email": "test@example.com",
  "telefono": "5512345678",
  "fecha_nacimiento": "1990-01-01",
  "fecha_cita": "2026-02-15",
  "hora_cita": "10:00",
  "motivo": "Consulta de prueba",
  "tipo_cita": "PRESENCIAL"
}
```

2. **GET /api/pacientes** - Listar pacientes (requiere auth)

3. **PATCH /api/citas/{id}** - Actualizar estado
```json
{
  "estado": "CANCELADA"
}
```

---

### 🔥 Thunder Client (VS Code)

**Instalación:** Extensión de VS Code

**Ventajas:**
- Integrado en VS Code
- No requiere app externa
- Colecciones guardadas en proyecto

---

## 5. Testing de Base de Datos

### 📊 Prisma Studio

```bash
npm run db:studio
```

Abre: **http://localhost:5555**

**Qué puedes hacer:**
- Ver todos los datos
- Editar registros
- Crear/eliminar datos
- Ver relaciones

---

### 🔍 PostgreSQL directamente

```bash
# Conectar a la base de datos
docker exec -it nutriologo-db psql -U postgres -d nutriologo_db

# Consultas útiles
\dt              # Listar tablas
SELECT * FROM "Cita" LIMIT 10;
SELECT COUNT(*) FROM "Cita" WHERE estado = 'PENDIENTE';
```

---

## 6. Monitoreo en Producción

### 📊 PM2 Monitoring (Recomendado para producción)

**Instalación:**
```bash
npm install -g pm2
```

**Configurar:**
```bash
# Iniciar aplicación
pm2 start npm --name "nutriologo-app" -- start

# Iniciar worker
pm2 start npm --name "nutriologo-worker" -- run worker:dev

# Ver logs
pm2 logs

# Ver dashboard
pm2 monit

# Guardar configuración
pm2 save
pm2 startup  # Ejecutar al iniciar sistema
```

---

### 📈 Grafana + Prometheus (Avanzado)

**Para:** Métricas y alertas profesionales

**Setup:**
1. Instalar Prometheus
2. Configurar Node Exporter
3. Configurar Grafana
4. Importar dashboards pre-hechos

**Dashboards útiles:**
- Bull Queue metrics
- Redis metrics
- Next.js performance
- PostgreSQL stats

---

## 🎯 Checklist de Testing Antes de Deploy

```bash
# 1. Verificar TypeScript
npm run type-check

# 2. Test de escalabilidad
NUM_CITAS=500 npm run test:escalabilidad
npm run queue:clean

# 3. Test de carga (k6 o Artillery)
k6 run --vus 50 --duration 1m tests/load-test.js

# 4. Verificar Redis
npm run monitor:redis

# 5. Verificar cola
npm run monitor:queue

# 6. Test de API rápido
npm run test:api

# 7. Verificar base de datos
npm run db:studio

# 8. Build de producción
npm run build
```

---

## 📊 Métricas Objetivo

| Métrica | Objetivo | Crítico |
|---------|----------|---------|
| Tiempo de respuesta API | <500ms | >1s |
| Creación de citas | >100/seg | <10/seg |
| Cancelación de citas | >50/seg | <5/seg |
| Memoria Redis | <400MB | >500MB |
| Jobs fallidos | <1% | >5% |
| Uptime | >99.5% | <99% |

---

## 🚨 Troubleshooting

### Redis no responde
```bash
npm run docker:up
npm run monitor:redis
```

### Jobs no se procesan
```bash
# Verificar worker
pm2 logs nutriologo-worker

# Verificar cola
npm run monitor:queue
```

### API lenta
```bash
# Test de carga
k6 run tests/load-test.js

# Ver logs
pm2 logs
```

### Base de datos lenta
```bash
# Ver queries lentas en Prisma Studio
npm run db:studio

# Analizar queries
docker exec -it nutriologo-db psql -U postgres -d nutriologo_db
EXPLAIN ANALYZE SELECT * FROM "Cita" WHERE ...
```

---

## 🛠️ Herramientas Adicionales

### RedisInsight (GUI para Redis)
- **URL:** https://redis.io/insight/
- **Qué hace:** Interfaz gráfica profesional para Redis
- **Features:** Ver keys, analizar memoria, profiler

### Redis Commander (Alternativa web)
```bash
npm install -g redis-commander
redis-commander --redis-port 6380 --redis-password redis123
```
Abre: **http://localhost:8081**

### pgAdmin (GUI para PostgreSQL)
- **URL:** https://www.pgadmin.org/
- **Conectar:** localhost:5432, user: postgres

---

## 📚 Recursos Adicionales

- **k6 Docs:** https://k6.io/docs/
- **Artillery Docs:** https://www.artillery.io/docs
- **Bull Docs:** https://github.com/OptimalBits/bull
- **Prisma Docs:** https://www.prisma.io/docs/
- **PM2 Docs:** https://pm2.keymetrics.io/docs/

---

¿Preguntas? Revisa los logs:
```bash
pm2 logs          # Logs de aplicación
npm run queue:status   # Estado de cola
npm run monitor:redis  # Estado de Redis
```
