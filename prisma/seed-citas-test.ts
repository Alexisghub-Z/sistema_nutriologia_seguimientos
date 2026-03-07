/**
 * Script para poblar citas de prueba en el calendario
 * Crea citas en el mes actual con varios estados y pacientes
 *
 * Uso: npx tsx prisma/seed-citas-test.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Tomar los primeros 3 pacientes existentes
  const pacientes = await prisma.paciente.findMany({ take: 3, select: { id: true, nombre: true } })

  if (pacientes.length === 0) {
    console.error('No hay pacientes en la base de datos. Crea al menos uno primero.')
    process.exit(1)
  }

  console.log(`Usando ${pacientes.length} paciente(s):`)
  pacientes.forEach((p) => console.log(`  - ${p.nombre} (${p.id})`))

  const ahora = new Date()
  const año = ahora.getFullYear()
  const mes = ahora.getMonth() // 0-based

  // Dias del mes actual con sus citas de prueba
  // [dia, hora, pacienteIndex, estado, tipo, confirmada]
  const citasConfig: [number, string, number, string, string, boolean][] = [
    // Dias pasados
    [2,  '10:00', 0, 'COMPLETADA',  'PRESENCIAL', true],
    [2,  '11:00', 1, 'COMPLETADA',  'PRESENCIAL', true],
    [3,  '16:00', 2, 'COMPLETADA',  'EN_LINEA',   true],
    [4,  '17:00', 0, 'NO_ASISTIO',  'PRESENCIAL', false],
    [5,  '09:00', 1, 'CANCELADA',   'PRESENCIAL', false],
    [5,  '10:00', 2, 'COMPLETADA',  'PRESENCIAL', true],

    // Dia actual — varias citas para probar el "+N más"
    [ahora.getDate(), '09:00', 0, 'PENDIENTE', 'PRESENCIAL', false],
    [ahora.getDate(), '10:00', 1, 'PENDIENTE', 'PRESENCIAL', true],
    [ahora.getDate(), '11:00', 2, 'PENDIENTE', 'EN_LINEA',   false],
    [ahora.getDate(), '12:00', 0, 'PENDIENTE', 'PRESENCIAL', true],
    [ahora.getDate(), '16:00', 1, 'PENDIENTE', 'EN_LINEA',   false],

    // Proximos dias
    [ahora.getDate() + 1, '10:00', 0, 'PENDIENTE', 'PRESENCIAL', true],
    [ahora.getDate() + 1, '11:00', 1, 'PENDIENTE', 'EN_LINEA',   false],
    [ahora.getDate() + 1, '17:00', 2, 'PENDIENTE', 'PRESENCIAL', false],
    [ahora.getDate() + 2, '09:00', 2, 'PENDIENTE', 'PRESENCIAL', true],
    [ahora.getDate() + 2, '10:00', 0, 'PENDIENTE', 'EN_LINEA',   false],
    [ahora.getDate() + 2, '11:00', 1, 'PENDIENTE', 'PRESENCIAL', true],
    [ahora.getDate() + 2, '16:00', 2, 'PENDIENTE', 'PRESENCIAL', false],
    [ahora.getDate() + 5, '10:00', 1, 'PENDIENTE', 'PRESENCIAL', true],
    [ahora.getDate() + 7, '09:00', 0, 'PENDIENTE', 'EN_LINEA',   false],
    [ahora.getDate() + 7, '16:00', 2, 'PENDIENTE', 'PRESENCIAL', true],
    [ahora.getDate() + 10,'10:00', 1, 'PENDIENTE', 'PRESENCIAL', false],
    [ahora.getDate() + 14,'11:00', 0, 'PENDIENTE', 'EN_LINEA',   false],
  ]

  const motivos = [
    'Control de peso',
    'Plan alimenticio personalizado',
    'Seguimiento nutricional',
    'Consulta inicial',
    'Revisión de análisis',
  ]

  let creadas = 0
  let omitidas = 0

  for (const [dia, hora, pacIdx, estado, tipo, confirmada] of citasConfig) {
    const paciente = pacientes[pacIdx % pacientes.length]!
    const [hh, mm] = hora.split(':').map(Number)

    // Construir fecha en UTC noon para evitar desfases de zona horaria
    const fecha = new Date(Date.UTC(año, mes, dia, hh!, mm!, 0))

    // Saltar si el día no existe en este mes (ej. dia 32)
    if (fecha.getUTCMonth() !== mes) {
      omitidas++
      continue
    }

    const motivo = motivos[Math.floor(Math.random() * motivos.length)]!

    try {
      await prisma.cita.create({
        data: {
          paciente_id: paciente.id,
          fecha_hora: fecha,
          duracion_minutos: 60,
          motivo_consulta: motivo,
          tipo_cita: tipo as 'PRESENCIAL' | 'EN_LINEA',
          estado: estado as 'PENDIENTE' | 'COMPLETADA' | 'CANCELADA' | 'NO_ASISTIO',
          estado_confirmacion: confirmada ? 'CONFIRMADA' : 'PENDIENTE',
          confirmada_por_paciente: confirmada,
          fecha_confirmacion: confirmada ? new Date() : null,
        },
      })
      console.log(`  [OK] ${dia}/${mes + 1} ${hora} - ${paciente.nombre} - ${estado}`)
      creadas++
    } catch (err) {
      console.warn(`  [SKIP] ${dia}/${mes + 1} ${hora} - ${(err as Error).message.slice(0, 60)}`)
      omitidas++
    }
  }

  console.log(`\nListo: ${creadas} citas creadas, ${omitidas} omitidas.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
