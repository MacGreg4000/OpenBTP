import { PrismaClient } from '@prisma/client'
// import { hash } from 'bcrypt' // Import inutilisé, commenté

// Éviter l'exécution côté build: export d'aucun symbole utilisé par Next
const prisma = new PrismaClient()

async function main() {
  try {
    // Nettoyer la base de données
    // await prisma.user.deleteMany() // Commenté car l'utilisateur admin n'est plus créé ici
    // await prisma.chantier.deleteMany() // Commenté car les chantiers de démo ne sont plus créés ici

    // Créer l'utilisateur admin
    // const hashedPassword = await hash('Secotech2024!', 12)
    // const admin = await prisma.user.create({
    //   data: {
    //     email: 'admin@secotech.fr',
    //     password: hashedPassword,
    //     firstName: 'Admin', // Corrigé: nom -> firstName
    //     lastName: 'Super', // Corrigé: prenom -> lastName
    //     role: 'ADMIN'
    //   }
    // })

    // console.log('Utilisateur admin créé:', admin)

    // Créer deux chantiers de test
    // const chantier1 = await prisma.chantier.create({
    //   data: {
    //     chantierId: "chantier_test_1_id", // Ajout d'un ID arbitraire
    //     name: "Construction Résidence Les Oliviers", // Corrigé: nomChantier -> name
    //     startDate: new Date('2024-03-01'), // Corrigé: dateCommencement -> startDate
    //     status: "EN_COURS", // Doit correspondre à un état valide (ex: enum)
    //     // Les informations client sont maintenant dans un modèle séparé
    //     // clientNom: "SCI Les Oliviers",
    //     // clientEmail: "contact@scilesoliviers.fr",
    //     // clientAdresse: "15 rue des Oliviers, 13100 Aix-en-Provence",
    //     address: "25 avenue de la République, 13100 Aix-en-Provence", // Corrigé: adresseChantier -> address
    //     // montantTotal: 850000.00 // Commenté précédemment
    //   }
    // })

    // const chantier2 = await prisma.chantier.create({
    //   data: {
    //     chantierId: "chantier_test_2_id", // Ajout d'un ID arbitraire
    //     name: "Rénovation Immeuble Le Prado", // Corrigé: nomChantier -> name
    //     startDate: new Date('2024-04-15'), // Corrigé: dateCommencement -> startDate
    //     status: "EN_COURS", // Doit correspondre à un état valide
    //     // Les informations client sont maintenant dans un modèle séparé
    //     // clientNom: "Copropriété Le Prado",
    //     // clientEmail: "syndic@leprado.fr",
    //     // clientAdresse: "45 avenue du Prado, 13008 Marseille",
    //     address: "45 avenue du Prado, 13008 Marseille", // Corrigé: adresseChantier -> address
    //     // montantTotal: 350000.00 // Commenté précédemment
    //   }
    // })

    // console.log('Chantiers de test créés:', { chantier1, chantier2 })

    console.log('Seed initial exécuté avec succès (pas de création de données pour l\'instant).');

  } catch (error) {
    console.error('Erreur lors du seed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  }) 