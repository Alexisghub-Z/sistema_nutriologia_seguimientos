/**
 * Script de prueba para el sistema de logging
 * Prueba diferentes niveles y escenarios
 */

import { logger, logError, logSuccess, logWarning, logDebug } from '../src/lib/logger'

console.log('🧪 Iniciando prueba del sistema de logging...\n')

// Esperar un poco para que el logger se inicialice
setTimeout(() => {
  console.log('📝 Probando diferentes niveles de log:\n')

  // 1. Log de información normal
  logger.info('Usuario inició sesión', {
    userId: 'user_123',
    email: 'test@example.com',
    ip: '192.168.1.1',
  })

  // 2. Log de debug (solo visible en desarrollo)
  logDebug('Detalles de la consulta a base de datos', {
    query: 'SELECT * FROM pacientes WHERE id = ?',
    params: ['pac_456'],
    duration: '23ms',
  })

  // 3. Log de éxito
  logSuccess('Cita creada correctamente', {
    citaId: 'cita_789',
    pacienteId: 'pac_456',
    fecha: '2026-02-10',
    tipo: 'Presencial',
  })

  // 4. Log de advertencia
  logWarning('Paciente sin email, no se enviará confirmación', {
    pacienteId: 'pac_789',
    telefono: '+5219511234567',
  })

  // 5. Log de error simulado
  try {
    throw new Error('Error simulado: No se pudo conectar a Twilio')
  } catch (error) {
    logError('Error al enviar mensaje de WhatsApp', error, {
      telefono: '+5219511234567',
      mensaje: 'Recordatorio de cita',
      intentos: 3,
    })
  }

  // 6. Log de error con objeto no-Error
  logError('Error inesperado en el sistema', 'String de error desconocido', {
    contexto: 'procesamiento de webhook',
    timestamp: new Date().toISOString(),
  })

  // 7. Logs múltiples para probar concurrencia
  console.log('\n📊 Generando múltiples logs...\n')

  for (let i = 1; i <= 5; i++) {
    logger.info(`Mensaje procesado #${i}`, {
      messageId: `msg_${i}`,
      from: `+52951123456${i}`,
      content: `Mensaje de prueba ${i}`,
      timestamp: new Date().toISOString(),
    })
  }

  // 8. Log con estructura compleja
  logger.info('Consulta completada', {
    consultaId: 'cons_123',
    paciente: {
      id: 'pac_456',
      nombre: 'Juan Pérez',
      edad: 35,
    },
    mediciones: {
      peso: 75.5,
      altura: 1.75,
      imc: 24.7,
    },
    plan: {
      calorias: 2000,
      comidas: 5,
      duracion_dias: 30,
    },
  })

  console.log('\n✅ Pruebas completadas!')
  console.log('\n📁 Revisa los logs en:')
  console.log('   - logs/combined-YYYY-MM-DD.log (todos los logs)')
  console.log('   - logs/error-YYYY-MM-DD.log (solo errores)')
  console.log('   - Consola (en desarrollo)')
  console.log('\n💡 Tip: Puedes cambiar LOG_LEVEL en .env (debug, info, warn, error)\n')

}, 100)
