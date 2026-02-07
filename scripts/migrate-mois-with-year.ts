/**
 * Migration : ajoute l'année au champ mois des états d'avancement client
 *
 * Convertit les valeurs "Janvier", "Février", etc. en "Janvier 2024", "Février 2024"
 * en utilisant l'année du champ date de chaque enregistrement.
 *
 * Usage : npx ts-node --project tsconfig.scripts.json scripts/migrate-mois-with-year.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** Vérifie si le mois a déjà une année (format "Mois 2024") */
function hasYear(mois: string | null): boolean {
  if (!mois?.trim()) return false
  return / \d{4}$/.test(mois.trim())
}

async function main() {
  console.log('🔄 Migration des périodes (mois + année)...')

  const etats = await prisma.etatAvancement.findMany({
    where: { mois: { not: null } },
    select: { id: true, mois: true, date: true }
  })

  const toMigrate = etats.filter(
    (e) => e.mois != null && (e.mois as string).trim() !== '' && !hasYear(e.mois)
  )

  let updated = 0
  if (toMigrate.length > 0) {
    for (const etat of toMigrate) {
      const year = new Date(etat.date).getFullYear()
      const newMois = `${(etat.mois as string).trim()} ${year}`
      await prisma.etatAvancement.update({
        where: { id: etat.id },
        data: { mois: newMois }
      })
      updated++
      console.log(`  - ID ${etat.id}: "${etat.mois}" → "${newMois}"`)
    }
  } else {
    console.log('  Aucun enregistrement à migrer (tous ont déjà mois + année).')
  }

  // Nettoyage : remettre à null les périodes invalides (ex. " 2025", "2025 2025", mois vides)
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const validPattern = new RegExp(`^(${monthNames.join('|')}) \\d{4}$`)
  const withMois = await prisma.etatAvancement.findMany({
    where: { mois: { not: null } },
    select: { id: true, mois: true }
  })
  const toClean = withMois.filter((e) => {
    const m = (e.mois as string).trim()
    return m !== '' && !validPattern.test(m)
  })
  for (const e of toClean) {
    await prisma.etatAvancement.update({
      where: { id: e.id },
      data: { mois: null }
    })
    console.log(`  - Nettoyage ID ${e.id}: "${e.mois}" → null`)
  }
  if (toClean.length > 0) {
    console.log(`  → ${toClean.length} enregistrement(s) nettoyé(s).`)
  }

  console.log(`\n✅ Migration terminée : ${updated} enregistrement(s) mis à jour.`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
