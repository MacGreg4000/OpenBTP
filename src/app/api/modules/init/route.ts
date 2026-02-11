import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';

// Fonction pour initialiser/réinitialiser les modules
async function initializeFeatureModules() {
  const modules = [
    // Modules système (obligatoires)
    { code: 'dashboard', name: 'Dashboard', description: 'Page d\'accueil avec statistiques et vue d\'ensemble', category: 'system', icon: 'ChartBarIcon', isActive: true, isSystem: true, ordre: 0 },
    { code: 'chantiers', name: 'Chantiers', description: 'Gestion des chantiers, commandes et états d\'avancement', category: 'system', icon: 'BuildingOfficeIcon', isActive: true, isSystem: true, ordre: 1 },
    { code: 'clients', name: 'Clients', description: 'Gestion de la base clients', category: 'commercial', icon: 'UsersIcon', isActive: true, isSystem: false, ordre: 2 },
    { code: 'devis', name: 'Devis', description: 'Création et gestion des devis clients', category: 'commercial', icon: 'DocumentTextIcon', isActive: true, isSystem: false, ordre: 3 },
    { code: 'sous_traitants', name: 'Sous-traitants', description: 'Gestion des sous-traitants et ouvriers', category: 'commercial', icon: 'UserGroupIcon', isActive: true, isSystem: false, ordre: 4 },
    
    // Modules optionnels
    { code: 'logistique', name: 'Logistique', description: 'Tâches magasiniers et suivi', category: 'organisation', icon: 'TruckIcon', isActive: true, isSystem: false, ordre: 9 },
    { code: 'inventory', name: 'Inventaire', description: 'Gestion des matériaux, racks et équipements', category: 'logistique', icon: 'CubeIcon', isActive: true, isSystem: false, ordre: 10 },
    { code: 'outillage', name: 'Outillage', description: 'Gestion des machines et prêts d\'outillage', category: 'logistique', icon: 'WrenchScrewdriverIcon', isActive: true, isSystem: false, ordre: 11 },
    { code: 'planning', name: 'Planning', description: 'Planning des chantiers et ressources', category: 'organisation', icon: 'CalendarIcon', isActive: true, isSystem: false, ordre: 20 },
    { code: 'planning_chargements', name: 'Planification chargements', description: 'Gestion des planifications de chargements', category: 'logistique', icon: 'TruckIcon', isActive: true, isSystem: false, ordre: 21 },
    { code: 'journal', name: 'Journal', description: 'Journal des activités et pointages', category: 'organisation', icon: 'CalendarDaysIcon', isActive: true, isSystem: false, ordre: 22 },
    { code: 'documents', name: 'Documents administratifs', description: 'Gestion documentaire centralisée', category: 'gestion', icon: 'DocumentTextIcon', isActive: true, isSystem: false, ordre: 30 },
    { code: 'bons_regie', name: 'Bons de régie', description: 'Gestion des bons de régie et heures supplémentaires', category: 'gestion', icon: 'ClipboardDocumentListIcon', isActive: true, isSystem: false, ordre: 31 },
    { code: 'sav', name: 'SAV', description: 'Service après-vente et tickets de maintenance', category: 'commercial', icon: 'DocumentDuplicateIcon', isActive: true, isSystem: false, ordre: 32 },
    { code: 'metres', name: 'Métrés soumis', description: 'Gestion des métrés et validations', category: 'commercial', icon: 'ChartBarIcon', isActive: true, isSystem: false, ordre: 33 },
    { code: 'choix_clients', name: 'Choix client', description: 'Gestion des choix et sélections clients', category: 'commercial', icon: 'SwatchIcon', isActive: true, isSystem: false, ordre: 34 },
    { code: 'factures', name: 'Factures', description: 'Gestion de la facturation client', category: 'gestion', icon: 'DocumentTextIcon', isActive: true, isSystem: false, ordre: 40 },
    { code: 'messagerie', name: 'Messagerie', description: 'Chat et messagerie entre utilisateurs', category: 'communication', icon: 'ChatBubbleLeftRightIcon', isActive: true, isSystem: false, ordre: 50 },
    { code: 'chat', name: 'Assistant IA', description: 'Chatbot intelligent avec RAG', category: 'ia', icon: 'SparklesIcon', isActive: true, isSystem: false, ordre: 51 },
    { code: 'notifications', name: 'Notifications', description: 'Système de notifications email et in-app', category: 'system', icon: 'BellIcon', isActive: true, isSystem: false, ordre: 52 }
  ];

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
    });
  }

  console.log(`✅ ${modules.length} modules de fonctionnalités initialisés automatiquement`);
}

export async function POST() {
  try {
    // Vérifier que l'utilisateur est admin
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Initialiser les modules
    await initializeFeatureModules();

    return NextResponse.json({
      success: true,
      message: 'Modules initialisés avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des modules:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'initialisation des modules' },
      { status: 500 }
    );
  }
}

// GET pour vérifier le statut des modules
export async function GET() {
  try {
    const moduleCount = await prisma.featureModule.count();
    const activeModules = await prisma.featureModule.count({
      where: { isActive: true }
    });

    return NextResponse.json({
      total: moduleCount,
      active: activeModules,
      needsInit: moduleCount === 0
    });
  } catch (error) {
    console.error('Erreur lors de la vérification des modules:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification des modules' },
      { status: 500 }
    );
  }
}