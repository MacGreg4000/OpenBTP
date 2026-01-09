import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma/client';

// Fonction pour initialiser les modules de fonctionnalités
async function initializeFeatureModules() {
  const modules = [
    // Modules système (obligatoires)
    { code: 'dashboard', name: 'Dashboard', description: 'Page d\'accueil avec statistiques', category: 'system', icon: 'ChartBarIcon', isActive: true, isSystem: true, ordre: 0 },
    { code: 'chantiers', name: 'Chantiers', description: 'Gestion des chantiers', category: 'system', icon: 'BuildingOfficeIcon', isActive: true, isSystem: true, ordre: 1 },
    { code: 'clients', name: 'Clients', description: 'Gestion de la base clients', category: 'commercial', icon: 'UsersIcon', isActive: true, isSystem: false, ordre: 2 },
    { code: 'devis', name: 'Devis', description: 'Création et gestion des devis', category: 'commercial', icon: 'DocumentTextIcon', isActive: true, isSystem: false, ordre: 3 },
    { code: 'sous_traitants', name: 'Sous-traitants', description: 'Gestion des sous-traitants et ouvriers', category: 'commercial', icon: 'UserGroupIcon', isActive: true, isSystem: false, ordre: 4 },
    
    // Modules optionnels
    { code: 'inventory', name: 'Inventaire', description: 'Gestion des matériaux', category: 'logistique', icon: 'CubeIcon', isActive: true, isSystem: false, ordre: 10 },
    { code: 'outillage', name: 'Outillage', description: 'Gestion des machines', category: 'logistique', icon: 'WrenchScrewdriverIcon', isActive: true, isSystem: false, ordre: 11 },
    { code: 'planning', name: 'Planning', description: 'Planning des chantiers', category: 'organisation', icon: 'CalendarIcon', isActive: true, isSystem: false, ordre: 20 },
    { code: 'planning_chargements', name: 'Planification chargements', description: 'Gestion des chargements', category: 'logistique', icon: 'TruckIcon', isActive: true, isSystem: false, ordre: 21 },
    { code: 'journal', name: 'Journal', description: 'Journal des activités', category: 'organisation', icon: 'CalendarDaysIcon', isActive: true, isSystem: false, ordre: 22 },
    { code: 'documents', name: 'Documents administratifs', description: 'Gestion documentaire', category: 'gestion', icon: 'DocumentTextIcon', isActive: true, isSystem: false, ordre: 30 },
    { code: 'bons_regie', name: 'Bons de régie', description: 'Gestion des bons de régie', category: 'gestion', icon: 'ClipboardDocumentListIcon', isActive: true, isSystem: false, ordre: 31 },
    { code: 'sav', name: 'SAV', description: 'Service après-vente', category: 'commercial', icon: 'DocumentDuplicateIcon', isActive: true, isSystem: false, ordre: 32 },
    { code: 'metres', name: 'Métrés soumis', description: 'Gestion des métrés', category: 'commercial', icon: 'ChartBarIcon', isActive: true, isSystem: false, ordre: 33 },
    { code: 'choix_clients', name: 'Choix client', description: 'Gestion des choix clients', category: 'commercial', icon: 'SwatchIcon', isActive: true, isSystem: false, ordre: 34 },
    { code: 'factures', name: 'Factures', description: 'Gestion de la facturation', category: 'gestion', icon: 'DocumentTextIcon', isActive: true, isSystem: false, ordre: 40 },
    { code: 'messagerie', name: 'Messagerie', description: 'Chat entre utilisateurs', category: 'communication', icon: 'ChatBubbleLeftRightIcon', isActive: true, isSystem: false, ordre: 50 },
    { code: 'chat', name: 'Assistant IA', description: 'Chatbot intelligent', category: 'ia', icon: 'SparklesIcon', isActive: true, isSystem: false, ordre: 51 },
    { code: 'notifications', name: 'Notifications', description: 'Système de notifications', category: 'system', icon: 'BellIcon', isActive: true, isSystem: false, ordre: 52 }
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

export async function POST(request: NextRequest) {
  try {
    const { company, admin } = await request.json();

    // Vérifier si l'application est déjà configurée
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        { error: 'L\'application est déjà configurée' },
        { status: 400 }
      );
    }

    // Vérifier les données requises
    if (!company?.name || !company?.address || !company?.email || !company?.tva) {
      return NextResponse.json(
        { error: 'Toutes les informations obligatoires de la société sont requises (nom, adresse, email, TVA)' },
        { status: 400 }
      );
    }

    if (!admin?.email || !admin?.password || !admin?.prenom || !admin?.nom) {
        return NextResponse.json(
        { error: 'Toutes les informations de l\'administrateur sont requises' },
            { status: 400 }
        );
    }

    // Hacher le mot de passe
    const hashedPassword = await hash(admin.password, 12);

    // Initialiser les modules de fonctionnalités
    await initializeFeatureModules();

    // Créer les données de l'entreprise et l'utilisateur admin dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer ou mettre à jour les paramètres de l'entreprise
      const companySettings = await tx.companysettings.upsert({
        where: { id: 'COMPANY_SETTINGS' },
        update: {
          name: company.name,
          address: company.address,
          zipCode: company.zipCode,
          city: company.city,
          phone: company.phone,
          email: company.email,
          tva: company.tva,
          iban: company.iban || null,
        },
        create: {
          id: 'COMPANY_SETTINGS',
          name: company.name,
          address: company.address,
          zipCode: company.zipCode,
          city: company.city,
          phone: company.phone,
          email: company.email,
          tva: company.tva,
          iban: company.iban || null,
          updatedAt: new Date(),
        },
      });

      // Créer l'utilisateur administrateur
      const adminUser = await tx.user.create({
        data: {
          id: `user_${Date.now()}`,
          email: admin.email,
          password: hashedPassword,
          name: `${admin.prenom} ${admin.nom}`,
          role: 'ADMIN',
          updatedAt: new Date(),
        },
      });

      return { companySettings, adminUser };
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration initiale terminée avec succès',
      data: {
        company: result.companySettings.name,
        adminEmail: result.adminUser.email,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la configuration initiale:', error);

    // Gestion des erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        );
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Des données en conflit existent déjà' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur lors de la configuration' },
      { status: 500 }
    );
  }
}

// Endpoint pour vérifier si l'application est déjà configurée
export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const companySettings = await prisma.companysettings.findFirst();

    const isConfigured = userCount > 0 && companySettings;

    return NextResponse.json({
      isConfigured,
      userCount,
      hasCompanySettings: !!companySettings,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la configuration:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de la configuration' },
      { status: 500 }
    );
  }
} 