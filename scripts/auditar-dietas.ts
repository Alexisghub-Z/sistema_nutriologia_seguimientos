/**
 * Audita las dietas guardadas buscando la etiqueta `modo` cruzada.
 * ------------------------------------------------------------
 * En producción apareció un borrador marcado como DIETA cuyo contenido era en
 * realidad un recetario. Al abrirlo, la pantalla leía `tiempo.alimentos` —que
 * en un recetario no existe— y se caía entera con un TypeError.
 *
 * El código ya no se fía de la etiqueta (deduce la forma del contenido), así
 * que un dato así ya no tumba nada. Este script sirve para encontrar los que
 * quedaron mal guardados y, con `--corregir`, poner la etiqueta que les toca.
 *
 * Uso:
 *   npx tsx scripts/auditar-dietas.ts              # solo informa
 *   npx tsx scripts/auditar-dietas.ts --corregir   # además, arregla
 */

import { PrismaClient } from '@prisma/client'
import { formaDeTiempos } from '../src/lib/dietas/autoguardado'

const prisma = new PrismaClient()
const corregir = process.argv.includes('--corregir')

async function main() {
  const dietas = await prisma.dietaGenerada.findMany({
    select: { id: true, modo: true, estado: true, createdAt: true, contenido: true },
    orderBy: { createdAt: 'desc' },
  })

  const cruzadas: { id: string; etiqueta: string; real: 'DIETA' | 'RECETARIO' }[] = []
  let irreconocibles = 0

  for (const d of dietas) {
    const tiempos = (d.contenido as { tiempos?: unknown } | null)?.tiempos
    const real = formaDeTiempos(tiempos)

    if (real === null) {
      irreconocibles++
      console.log(`⚠️  ${d.id} · contenido irreconocible · etiqueta ${d.modo} · ${d.estado}`)
      continue
    }
    if (real !== d.modo) {
      cruzadas.push({ id: d.id, etiqueta: d.modo, real })
      const fecha = d.createdAt.toISOString().slice(0, 10)
      console.log(`❌ ${d.id} · etiqueta ${d.modo} pero es ${real} · ${d.estado} · ${fecha}`)
    }
  }

  console.log(
    `\nRevisadas ${dietas.length} · cruzadas ${cruzadas.length} · irreconocibles ${irreconocibles}`
  )

  if (cruzadas.length === 0) {
    console.log('✅ Todas las etiquetas coinciden con su contenido.')
  } else if (!corregir) {
    console.log('\nEjecuta con --corregir para poner la etiqueta correcta.')
  } else {
    // Solo se toca la etiqueta: el contenido se deja intacto, porque es el que
    // dice la verdad sobre lo que el nutriólogo escribió.
    for (const c of cruzadas) {
      await prisma.dietaGenerada.update({ where: { id: c.id }, data: { modo: c.real } })
      console.log(`✔️  ${c.id} · ${c.etiqueta} → ${c.real}`)
    }
    console.log(`\n✅ Corregidas ${cruzadas.length}.`)
  }

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
