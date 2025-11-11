import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const chantierId = 'CH-2025-9OOUQU' // Lantin

  console.log(`🔍 Recherche des avenants pour le chantier ${chantierId}...`)

  // Trouver tous les devis de type AVENANT pour ce chantier qui sont convertis
  const avenants = await prisma.devis.findMany({
    where: {
      chantierId,
      typeDevis: 'AVENANT',
      statut: 'CONVERTI'
    }
  })

  console.log(`📋 Trouvé ${avenants.length} avenant(s) converti(s)`)

  if (avenants.length === 0) {
    console.log('✅ Aucun avenant à réinitialiser')
    return
  }

  // Afficher les avenants trouvés
  avenants.forEach(a => {
    console.log(`  - ${a.numeroDevis}${a.reference ? ` (${a.reference})` : ''}`)
  })

  // Supprimer les avenants de l'état d'avancement
  const descriptions = avenants.map(a => `${a.numeroDevis}${a.reference ? ` - ${a.reference}` : ''}`)
  
  const deletedAvenants = await prisma.avenantEtatAvancement.deleteMany({
    where: {
      description: {
        in: descriptions
      }
    }
  })

  console.log(`🗑️  Supprimé ${deletedAvenants.count} ligne(s) d'avenant de l'état d'avancement`)

  // Réinitialiser leur statut
  const results = await Promise.all(
    avenants.map(async (avenant) => {
      const updated = await prisma.devis.update({
        where: { id: avenant.id },
        data: {
          statut: 'ACCEPTE',
          convertedToCommandeId: null,
          convertedToEtatId: null
        }
      })
      console.log(`✅ ${avenant.numeroDevis} réinitialisé à statut ACCEPTE`)
      return updated
    })
  )

  console.log(`\n🎉 ${results.length} avenant(s) réinitialisé(s) avec succès!`)
  console.log('Tu peux maintenant les reconvertir depuis l\'interface.')
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

