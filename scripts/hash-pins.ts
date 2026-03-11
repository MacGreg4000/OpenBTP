/**
 * Script de migration : hachage des PINs en clair
 *
 * Ce script lit tous les PINs stockés en clair dans la table public_access_pin
 * et les hache avec bcryptjs. Les PINs déjà hachés (préfixe $2a$ ou $2b$) sont ignorés.
 *
 * Usage: npx ts-node scripts/hash-pins.ts
 * (ou : npx tsx scripts/hash-pins.ts)
 *
 * IMPORTANT : Sauvegarder la base de données AVANT d'exécuter ce script.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 12

async function main() {
  console.log('🔐 Début du hachage des PINs...')

  const all = await prisma.publicAccessPIN.findMany()
  console.log(`→ ${all.length} enregistrement(s) trouvé(s)`)

  let hashed = 0
  let skipped = 0

  for (const record of all) {
    // Ignorer les PINs déjà hachés (bcrypt commence par $2a$ ou $2b$)
    if (record.codePIN.startsWith('$2a$') || record.codePIN.startsWith('$2b$')) {
      skipped++
      continue
    }

    const hash = await bcrypt.hash(record.codePIN, BCRYPT_ROUNDS)
    await prisma.publicAccessPIN.update({
      where: { id: record.id },
      data: { codePIN: hash },
    })
    hashed++
    process.stdout.write('.')
  }

  console.log(`\n✅ Terminé : ${hashed} PIN(s) hachés, ${skipped} déjà hachés (ignorés)`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur :', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
