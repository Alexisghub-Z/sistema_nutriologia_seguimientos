/**
 * Migra las dietas guardadas en el campo antiguo `CuadroDietosintetico.dieta_ia`
 * al modelo nuevo `DietaGenerada`.
 *
 * Contexto: antes cada cuadro guardaba UNA sola dieta embebida como JSON. Ahora
 * las dietas viven en su propia tabla, lo que permite varias por cuadro y un
 * estado propio (borrador / finalizada).
 *
 * Es IDEMPOTENTE: si un cuadro ya tiene dietas migradas, lo salta. Se puede
 * correr varias veces sin duplicar nada.
 *
 * Las dietas migradas quedan como FINALIZADA: ya se entregaron al paciente en su
 * momento, así que son versiones definitivas de facto. Además, el contexto que
 * recibe la IA filtra por FINALIZADA, así que marcarlas como borrador dejaría al
 * generador sin historial del paciente.
 *
 * Uso:
 *   npx tsx scripts/migrar-dietas-generadas.ts            (migra)
 *   npx tsx scripts/migrar-dietas-generadas.ts --dry-run  (solo informa)
 */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

/** Forma esperada del JSON antiguo. */
interface DietaIaAntigua {
  modo?: string
  tiempos?: unknown[]
}

async function main() {
  console.log(dryRun ? '— Simulación (no se escribe nada) —\n' : '— Migrando dietas —\n')

  const cuadros = await prisma.cuadroDietosintetico.findMany({
    where: { dieta_ia: { not: Prisma.DbNull } },
    select: {
      id: true,
      paciente_id: true,
      dieta_ia: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Cuadros con dieta_ia: ${cuadros.length}`)
  if (cuadros.length === 0) {
    console.log('No hay nada que migrar.')
    return
  }

  let migradas = 0
  let saltadas = 0
  let invalidas = 0

  for (const c of cuadros) {
    // Idempotencia: si ya tiene dietas, este cuadro se migró antes.
    const yaTiene = await prisma.dietaGenerada.count({ where: { cuadro_id: c.id } })
    if (yaTiene > 0) {
      saltadas++
      continue
    }

    const dieta = c.dieta_ia as DietaIaAntigua | null
    if (!dieta || !Array.isArray(dieta.tiempos) || dieta.tiempos.length === 0) {
      console.warn(`  ⚠ Cuadro ${c.id}: dieta_ia sin tiempos válidos, se omite.`)
      invalidas++
      continue
    }

    const modo = dieta.modo === 'recetario' ? 'RECETARIO' : 'DIETA'

    if (!dryRun) {
      await prisma.dietaGenerada.create({
        data: {
          cuadro_id: c.id,
          paciente_id: c.paciente_id,
          modo,
          contenido: { tiempos: dieta.tiempos } as Prisma.InputJsonValue,
          estado: 'FINALIZADA',
          finalizada_at: c.updatedAt,
          // Conserva el orden del historial del paciente.
          createdAt: c.createdAt,
        },
      })
    }
    migradas++
  }

  console.log('\nResumen:')
  console.log(`  Migradas: ${migradas}`)
  console.log(`  Saltadas (ya migradas): ${saltadas}`)
  if (invalidas > 0) console.log(`  Omitidas por datos inválidos: ${invalidas}`)
  if (dryRun) console.log('\n(Simulación: vuelve a correr sin --dry-run para aplicar.)')
}

main()
  .catch((e) => {
    console.error('Error en la migración:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
