import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

// Generar código único de 8 caracteres (ej: ABC12DEF)
function generarCodigo(): string {
  return randomBytes(4).toString('hex').toUpperCase().substring(0, 8)
}

async function main() {
  console.log('🔄 Generando códigos para citas existentes...')

  const citasSinCodigo = await prisma.cita.findMany({
    where: { codigo_cita: null },
  })

  console.log(`📋 Encontradas ${citasSinCodigo.length} citas sin código`)

  for (const cita of citasSinCodigo) {
    let codigo = generarCodigo()
    
    // Asegurar que el código sea único
    let existente = await prisma.cita.findUnique({ where: { codigo_cita: codigo } })
    while (existente) {
      codigo = generarCodigo()
      existente = await prisma.cita.findUnique({ where: { codigo_cita: codigo } })
    }

    await prisma.cita.update({
      where: { id: cita.id },
      data: { codigo_cita: codigo },
    })

    console.log(`✅ Cita ${cita.id} → Código: ${codigo}`)
  }

  console.log('✨ Códigos generados exitosamente')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
