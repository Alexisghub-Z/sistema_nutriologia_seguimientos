/**
 * Script de prueba para Sentry
 * Simula diferentes tipos de errores para verificar que se capturen correctamente
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') })

import * as Sentry from '@sentry/nextjs'

console.log('🧪 Iniciando prueba de Sentry...\n')

// Inicializar Sentry manualmente para el test
Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: 'test',
  debug: true,
  tracesSampleRate: 1.0, // Capturar 100% en tests
})

if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
  console.log('⚠️  SENTRY_DSN no está configurado')
  console.log('📝 Para probar Sentry:')
  console.log('   1. Crea una cuenta en https://sentry.io')
  console.log('   2. Crea un proyecto Next.js')
  console.log('   3. Copia el DSN y agrégalo a .env.local')
  console.log('   4. Ejecuta este script de nuevo\n')
  console.log('💡 Por ahora, los errores solo se mostrarán en consola\n')
}

console.log('📝 Enviando eventos de prueba a Sentry:\n')

// 1. Error simple
console.log('1️⃣  Error simple de JavaScript...')
Sentry.captureException(new Error('Error de prueba: División por cero'))

// 2. Error con contexto
console.log('2️⃣  Error con contexto adicional...')
Sentry.captureException(new Error('Error al procesar pago'), {
  tags: {
    modulo: 'pagos',
    tipo: 'stripe',
  },
  extra: {
    monto: 500,
    paciente_id: 'pac_123',
    intento: 3,
  },
})

// 3. Mensaje manual (no error)
console.log('3️⃣  Mensaje de información...')
Sentry.captureMessage('Usuario completó onboarding', 'info')

// 4. Error con usuario identificado
console.log('4️⃣  Error con usuario identificado...')
Sentry.setUser({
  id: 'user_456',
  email: 'test@example.com',
  username: 'TestUser',
})
Sentry.captureException(new Error('Error en dashboard del usuario'))

// 5. Breadcrumbs (rastro de acciones)
console.log('5️⃣  Error con breadcrumbs (rastro de navegación)...')
Sentry.addBreadcrumb({
  category: 'auth',
  message: 'Usuario inició sesión',
  level: 'info',
})
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'Navegó a /dashboard',
  level: 'info',
})
Sentry.addBreadcrumb({
  category: 'api',
  message: 'Llamada a API: GET /api/pacientes',
  level: 'info',
  data: {
    status: 200,
    duration: '235ms',
  },
})
Sentry.captureException(new Error('Error al cargar lista de pacientes'))

// 6. Performance monitoring (usando la nueva API)
console.log('6️⃣  Span de performance...')
Sentry.startSpan(
  {
    op: 'test',
    name: 'Test Transaction',
  },
  async () => {
    await Sentry.startSpan(
      {
        op: 'db.query',
        name: 'SELECT * FROM pacientes',
      },
      async () => {
        // Simular query
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    )
    console.log('   ✅ Span completado\n')
  }
)

// Esperar a que todos los eventos se envíen
setTimeout(() => {
  console.log('✅ Eventos de prueba enviados a Sentry!\n')
  console.log('📊 Ve a tu dashboard de Sentry para ver los eventos:')
  console.log('   https://sentry.io\n')
  console.log('💡 Deberías ver:')
  console.log('   - 5 errores capturados')
  console.log('   - 1 mensaje informativo')
  console.log('   - 1 transaction de performance')
  console.log('   - Breadcrumbs en el último error')
  console.log('   - Usuario identificado en algunos errores\n')

  // Forzar flush antes de salir
  Sentry.close(2000).then(() => {
    process.exit(0)
  })
}, 1000)
