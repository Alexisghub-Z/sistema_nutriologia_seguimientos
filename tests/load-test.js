/**
 * Test de Carga con k6
 * Herramienta: https://k6.io/
 *
 * Instalación:
 *   - Linux: sudo apt install k6
 *   - macOS: brew install k6
 *   - Windows: choco install k6
 *
 * Uso:
 *   k6 run tests/load-test.js
 *   k6 run --vus 10 --duration 30s tests/load-test.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

// Métricas personalizadas
const errorRate = new Rate('errors')

// Configuración del test
export const options = {
  // Escenarios de prueba
  scenarios: {
    // Escenario 1: Carga constante
    constant_load: {
      executor: 'constant-vus',
      vus: 10, // 10 usuarios virtuales
      duration: '30s', // Durante 30 segundos
    },

    // Escenario 2: Rampa de carga
    // ramp_up: {
    //   executor: 'ramping-vus',
    //   startVUs: 0,
    //   stages: [
    //     { duration: '30s', target: 20 },  // Subir a 20 usuarios en 30s
    //     { duration: '1m', target: 50 },   // Subir a 50 usuarios en 1 min
    //     { duration: '30s', target: 0 },   // Bajar a 0 en 30s
    //   ],
    // },
  },

  // Umbrales de éxito
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% de requests deben responder en <500ms
    errors: ['rate<0.1'], // Tasa de error debe ser <10%
  },
}

// URL base (cambiar según tu entorno)
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Datos de prueba
const pacientes = []
const citas = []

export function setup() {
  console.log('🚀 Iniciando test de carga...')
  return { startTime: new Date() }
}

export default function () {
  // Test 1: Listar pacientes
  let res = http.get(`${BASE_URL}/api/pacientes`, {
    headers: {
      'Content-Type': 'application/json',
      // Agregar headers de autenticación si es necesario
      // 'Authorization': 'Bearer TOKEN'
    },
  })

  check(res, {
    'Listar pacientes - status 200': (r) => r.status === 200,
    'Listar pacientes - respuesta rápida': (r) => r.timings.duration < 500,
  }) || errorRate.add(1)

  sleep(1)

  // Test 2: Crear cita pública
  const citaData = {
    nombre: `Test User ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    telefono: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    fecha_nacimiento: '1990-01-01',
    fecha_cita: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    hora_cita: '10:00',
    motivo: 'Consulta de prueba para test de carga',
    tipo_cita: 'PRESENCIAL',
  }

  res = http.post(`${BASE_URL}/api/citas/publica`, JSON.stringify(citaData), {
    headers: { 'Content-Type': 'application/json' },
  })

  const success = check(res, {
    'Crear cita - status 201': (r) => r.status === 201,
    'Crear cita - respuesta rápida': (r) => r.timings.duration < 1000,
    'Crear cita - tiene código': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.cita && body.cita.codigo_cita
      } catch {
        return false
      }
    },
  })

  if (!success) {
    errorRate.add(1)
    console.error(`Error creando cita: ${res.status} - ${res.body}`)
  }

  sleep(2)
}

export function teardown(data) {
  const endTime = new Date()
  const duration = (endTime - new Date(data.startTime)) / 1000
  console.log(`\n✅ Test completado en ${duration.toFixed(2)} segundos`)
}
