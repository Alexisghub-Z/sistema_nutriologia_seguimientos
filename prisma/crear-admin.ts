/**
 * Crea (o actualiza) el usuario administrador de un cliente.
 *
 * Reutilizable por el alta de clientes (deploy/nuevo-cliente.sh) y a mano.
 * Usa la DATABASE_URL del entorno, así que apunta a la BD del cliente.
 *
 * Uso:
 *   ADMIN_EMAIL=... ADMIN_NOMBRE=... ADMIN_PASSWORD=... \
 *     DATABASE_URL=... npx tsx prisma/crear-admin.ts
 *
 * Si no se pasa ADMIN_PASSWORD, genera una aleatoria y la imprime una sola vez.
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim()
  const nombre = process.env.ADMIN_NOMBRE?.trim() || 'Administrador'

  if (!email) {
    console.error('❌ Falta ADMIN_EMAIL')
    process.exit(1)
  }

  // Password: la provista, o una aleatoria segura
  const passwordGenerada = !process.env.ADMIN_PASSWORD
  const password = process.env.ADMIN_PASSWORD || randomBytes(9).toString('base64url')

  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: { nombre, password_hash: passwordHash, rol: 'ADMIN' },
    create: { email, nombre, password_hash: passwordHash, rol: 'ADMIN' },
  })

  console.log(`✅ Usuario admin listo: ${admin.email}`)
  if (passwordGenerada) {
    console.log('')
    console.log('   ⚠️  GUARDA ESTA CONTRASEÑA (se muestra una sola vez):')
    console.log(`   Email:      ${email}`)
    console.log(`   Contraseña: ${password}`)
    console.log('')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error al crear admin:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
