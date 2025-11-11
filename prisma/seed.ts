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

    // Seed des modules de fonctionnalités
    await seedFeatureModules()

    console.log('Seed initial exécuté avec succès (pas de création de données pour l\'instant).');

  } catch (error) {
    console.error('Erreur lors du seed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Seed des modules de fonctionnalités
async function seedFeatureModules() {
  const modules = [
    // Modules système (obligatoires)
    {
      code: 'dashboard',
      name: 'Dashboard',
      description: 'Page d\'accueil avec statistiques et vue d\'ensemble',
      category: 'system',
      icon: 'ChartBarIcon',
      isActive: true,
      isSystem: true,
      ordre: 0
    },
    {
      code: 'chantiers',
      name: 'Chantiers',
      description: 'Gestion des chantiers, commandes et états d\'avancement',
      category: 'system',
      icon: 'BuildingOfficeIcon',
      isActive: true,
      isSystem: true,
      ordre: 1
    },
    {
      code: 'clients',
      name: 'Clients',
      description: 'Gestion de la base clients',
      category: 'commercial',
      icon: 'UsersIcon',
      isActive: true,
      isSystem: false,
      ordre: 2
    },
    
    // Modules optionnels
    {
      code: 'inventory',
      name: 'Inventaire',
      description: 'Gestion des matériaux, racks et équipements',
      category: 'logistique',
      icon: 'CubeIcon',
      isActive: true,
      isSystem: false,
      ordre: 10
    },
    {
      code: 'outillage',
      name: 'Outillage',
      description: 'Gestion des machines et prêts d\'outillage',
      category: 'logistique',
      icon: 'WrenchScrewdriverIcon',
      isActive: true,
      isSystem: false,
      ordre: 11
    },
    {
      code: 'planning',
      name: 'Planning',
      description: 'Planning des chantiers et ressources',
      category: 'organisation',
      icon: 'CalendarIcon',
      isActive: true,
      isSystem: false,
      ordre: 20
    },
    {
      code: 'planning_chargements',
      name: 'Planification chargements',
      description: 'Gestion des planifications de chargements',
      category: 'logistique',
      icon: 'TruckIcon',
      isActive: true,
      isSystem: false,
      ordre: 21
    },
    {
      code: 'sous_traitants',
      name: 'Sous-traitants',
      description: 'Gestion des sous-traitants et ouvriers',
      category: 'commercial',
      icon: 'UserGroupIcon',
      isActive: true,
      isSystem: false,
      ordre: 3
    },
    {
      code: 'documents',
      name: 'Documents administratifs',
      description: 'Gestion des documents et administratif',
      category: 'administratif',
      icon: 'DocumentTextIcon',
      isActive: true,
      isSystem: false,
      ordre: 30
    },
    {
      code: 'bons_regie',
      name: 'Bons de régie',
      description: 'Gestion des bons de régie',
      category: 'administratif',
      icon: 'ClipboardDocumentListIcon',
      isActive: true,
      isSystem: false,
      ordre: 31
    },
    {
      code: 'choix_clients',
      name: 'Choix client',
      description: 'Gestion des choix et sélections clients',
      category: 'commercial',
      icon: 'SwatchIcon',
      isActive: true,
      isSystem: false,
      ordre: 32
    },
    {
      code: 'sav',
      name: 'SAV',
      description: 'Service après-vente et tickets',
      category: 'commercial',
      icon: 'LifebuoyIcon',
      isActive: true,
      isSystem: false,
      ordre: 33
    },
    {
      code: 'metres',
      name: 'Métrés soumis',
      description: 'Gestion des métrés et devis',
      category: 'commercial',
      icon: 'DocumentDuplicateIcon',
      isActive: true,
      isSystem: false,
      ordre: 34
    },
    {
      code: 'journal',
      name: 'Journal',
      description: 'Journal d\'activité et historique',
      category: 'administratif',
      icon: 'CalendarDaysIcon',
      isActive: true,
      isSystem: false,
      ordre: 40
    },
    {
      code: 'chat',
      name: 'Assistant IA',
      description: 'Chatbot intelligent avec RAG',
      category: 'ia',
      icon: 'ChatBubbleLeftRightIcon',
      isActive: true,
      isSystem: false,
      ordre: 50
    },
    {
      code: 'notifications',
      name: 'Notifications',
      description: 'Système de notifications email et in-app',
      category: 'system',
      icon: 'BellIcon',
      isActive: true,
      isSystem: false,
      ordre: 51
    }
  ]

  for (const module of modules) {
    await prisma.featureModule.upsert({
      where: { code: module.code },
      update: {
        name: module.name,
        description: module.description,
        category: module.category,
        icon: module.icon,
        ordre: module.ordre
      },
      create: module
    })
  }

  console.log(`✅ ${modules.length} modules de fonctionnalités initialisés`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  }) 