import { PrismaClient } from '@prisma/client'
import { normalizarTelefonoMexico } from '../src/lib/utils/phone'

const prisma = new PrismaClient()

/**
 * Script para migrar números de teléfono existentes al formato E.164
 *
 * Este script:
 * 1. Lee todos los pacientes de la base de datos
 * 2. Normaliza sus teléfonos al formato +5219515886761
 * 3. Actualiza los registros en la base de datos
 *
 * Uso: npx ts-node scripts/migrar-telefonos.ts
 */

interface ResultadoMigracion {
  exitosos: number
  fallidos: number
  detalles: {
    nombre: string
    telefonoAntiguo: string
    telefonoNuevo?: string
    error?: string
  }[]
}

async function migrarTelefonos() {
  console.log('🔄 Iniciando migración de números telefónicos...\n')

  const resultado: ResultadoMigracion = {
    exitosos: 0,
    fallidos: 0,
    detalles: [],
  }

  try {
    // Obtener todos los pacientes
    const pacientes = await prisma.paciente.findMany({
      select: {
        id: true,
        nombre: true,
        telefono: true,
      },
    })

    console.log(`📊 Total de pacientes a procesar: ${pacientes.length}\n`)

    if (pacientes.length === 0) {
      console.log('✅ No hay pacientes para migrar')
      return resultado
    }

    // Procesar cada paciente
    for (const paciente of pacientes) {
      try {
        // Intentar normalizar el teléfono
        const telefonoNormalizado = normalizarTelefonoMexico(paciente.telefono)

        // Solo actualizar si el teléfono cambió
        if (telefonoNormalizado !== paciente.telefono) {
          await prisma.paciente.update({
            where: { id: paciente.id },
            data: { telefono: telefonoNormalizado },
          })

          console.log(`✅ ${paciente.nombre}`)
          console.log(`   Antes:  ${paciente.telefono}`)
          console.log(`   Después: ${telefonoNormalizado}\n`)

          resultado.exitosos++
          resultado.detalles.push({
            nombre: paciente.nombre,
            telefonoAntiguo: paciente.telefono,
            telefonoNuevo: telefonoNormalizado,
          })
        } else {
          console.log(`⏭️  ${paciente.nombre}`)
          console.log(`   Ya está normalizado: ${paciente.telefono}\n`)

          resultado.exitosos++
          resultado.detalles.push({
            nombre: paciente.nombre,
            telefonoAntiguo: paciente.telefono,
            telefonoNuevo: telefonoNormalizado,
          })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'

        console.error(`❌ Error con ${paciente.nombre}:`)
        console.error(`   Teléfono: ${paciente.telefono}`)
        console.error(`   Error: ${errorMessage}\n`)

        resultado.fallidos++
        resultado.detalles.push({
          nombre: paciente.nombre,
          telefonoAntiguo: paciente.telefono,
          error: errorMessage,
        })
      }
    }

    // Resumen final
    console.log('\n' + '='.repeat(60))
    console.log('📋 RESUMEN DE MIGRACIÓN')
    console.log('='.repeat(60))
    console.log(`✅ Exitosos: ${resultado.exitosos}`)
    console.log(`❌ Fallidos:  ${resultado.fallidos}`)
    console.log(`📊 Total:     ${pacientes.length}`)
    console.log('='.repeat(60) + '\n')

    // Mostrar errores si los hay
    if (resultado.fallidos > 0) {
      console.log('⚠️  ERRORES ENCONTRADOS:')
      resultado.detalles
        .filter((d) => d.error)
        .forEach((d) => {
          console.log(`   - ${d.nombre}: ${d.error}`)
        })
      console.log('')
    }

    return resultado
  } catch (error) {
    console.error('❌ Error fatal en la migración:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar migración
migrarTelefonos()
  .then((resultado) => {
    if (resultado.fallidos === 0) {
      console.log('✨ Migración completada exitosamente')
      process.exit(0)
    } else {
      console.log('⚠️  Migración completada con errores')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  })
