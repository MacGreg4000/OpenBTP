import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// Liste canonique des modules — source de vérité unique
const DEFAULT_MODULES = [
  { code: 'dashboard',            name: 'Dashboard',                 description: "Page d'accueil avec statistiques et vue d'ensemble",    category: 'system',        icon: 'ChartBarIcon',              isActive: true, isSystem: true,  ordre: 0  },
  { code: 'chantiers',            name: 'Chantiers',                 description: "Gestion des chantiers, commandes et états d'avancement", category: 'system',        icon: 'BuildingOfficeIcon',        isActive: true, isSystem: true,  ordre: 1  },
  { code: 'crm',                  name: 'CRM Prospects',             description: 'Gestion des prospects et contacts commerciaux',          category: 'commercial',    icon: 'BuildingOffice2Icon',       isActive: true, isSystem: false, ordre: 2  },
  { code: 'clients',              name: 'Clients',                   description: 'Gestion de la base clients',                             category: 'commercial',    icon: 'UsersIcon',                 isActive: true, isSystem: false, ordre: 3  },
  { code: 'devis',                name: 'Devis',                     description: 'Création et gestion des devis clients',                  category: 'commercial',    icon: 'DocumentTextIcon',          isActive: true, isSystem: false, ordre: 3  },
  { code: 'sous_traitants',       name: 'Sous-traitants',            description: "Gestion des sous-traitants et ouvriers",                 category: 'commercial',    icon: 'UserGroupIcon',             isActive: true, isSystem: false, ordre: 4  },
  { code: 'inventory',            name: 'Inventaire',                description: 'Gestion des matériaux, racks et équipements',            category: 'logistique',    icon: 'CubeIcon',                  isActive: true, isSystem: false, ordre: 10 },
  { code: 'outillage',            name: 'Outillage',                 description: "Gestion des machines et prêts d'outillage",              category: 'logistique',    icon: 'WrenchScrewdriverIcon',     isActive: true, isSystem: false, ordre: 11 },
  { code: 'planning',             name: 'Planning',                  description: 'Planning des chantiers et ressources',                   category: 'organisation',  icon: 'CalendarIcon',              isActive: true, isSystem: false, ordre: 20 },
  { code: 'planning_chargements', name: 'Planification chargements', description: 'Gestion des planifications de chargements',              category: 'logistique',    icon: 'TruckIcon',                 isActive: true, isSystem: false, ordre: 21 },
  { code: 'documents',            name: 'Documents administratifs',  description: 'Gestion des documents et administratif',                 category: 'administratif', icon: 'DocumentTextIcon',          isActive: true, isSystem: false, ordre: 30 },
  { code: 'bons_regie',           name: 'Bons de régie',             description: 'Gestion des bons de régie',                             category: 'administratif', icon: 'ClipboardDocumentListIcon', isActive: true, isSystem: false, ordre: 31 },
  { code: 'choix_clients',        name: 'Choix client',              description: 'Gestion des choix et sélections clients',                category: 'commercial',    icon: 'SwatchIcon',                isActive: true, isSystem: false, ordre: 32 },
  { code: 'sav',                  name: 'SAV',                       description: 'Service après-vente et tickets',                         category: 'commercial',    icon: 'LifebuoyIcon',              isActive: true, isSystem: false, ordre: 33 },
  { code: 'metres',               name: 'Métrés soumis',             description: 'Gestion des métrés et devis',                            category: 'commercial',    icon: 'DocumentDuplicateIcon',     isActive: true, isSystem: false, ordre: 34 },
  { code: 'journal',              name: 'Journal',                   description: "Journal d'activité et historique",                       category: 'administratif', icon: 'CalendarDaysIcon',          isActive: true, isSystem: false, ordre: 40 },
  { code: 'messagerie',           name: 'Messagerie',                description: 'Chat et messagerie entre utilisateurs',                  category: 'communication', icon: 'ChatBubbleLeftRightIcon',   isActive: true, isSystem: false, ordre: 50 },
  { code: 'chat',                 name: 'Assistant IA',              description: 'Chatbot intelligent avec RAG',                           category: 'ia',            icon: 'SparklesIcon',              isActive: true, isSystem: false, ordre: 51 },
  { code: 'notifications',        name: 'Notifications',             description: 'Système de notifications email et in-app',               category: 'system',        icon: 'BellIcon',                  isActive: true, isSystem: false, ordre: 52 },
  { code: 'metres_plan',          name: 'Métré sur plan',            description: 'Outil de mesure et métré sur plan PDF',                  category: 'outils',        icon: 'PencilSquareIcon',          isActive: true, isSystem: false, ordre: 60 },
] as const

// GET /api/modules - Liste tous les modules
export async function GET(request: NextRequest) {
  try {
    // Vérifier que NEXTAUTH_SECRET est défini
    if (!process.env.NEXTAUTH_SECRET) {
      console.error('❌ NEXTAUTH_SECRET n\'est pas défini dans les variables d\'environnement')
      return NextResponse.json(
        { error: 'Configuration d\'authentification manquante. Veuillez définir NEXTAUTH_SECRET dans votre fichier .env' },
        { status: 500 }
      )
    }

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where = activeOnly ? { isActive: true } : {}

    let modules = await prisma.featureModule.findMany({
      where: {},
      orderBy: [{ category: 'asc' }, { ordre: 'asc' }]
    })

    // Auto-création des modules manquants (idempotent)
    const existingCodes = new Set(modules.map(m => m.code))
    const missing = DEFAULT_MODULES.filter(m => !existingCodes.has(m.code))
    if (missing.length > 0) {
      await Promise.all(
        missing.map(mod =>
          prisma.featureModule.upsert({
            where: { code: mod.code },
            update: {},
            create: mod
          })
        )
      )
      modules = await prisma.featureModule.findMany({
        where: {},
        orderBy: [{ category: 'asc' }, { ordre: 'asc' }]
      })
    }

    const filtered = activeOnly ? modules.filter(m => m.isActive) : modules

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Erreur lors de la récupération des modules:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des modules' },
      { status: 500 }
    )
  }
}

// PATCH /api/modules - Mettre à jour un module (activation/désactivation)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Seuls les admins peuvent modifier les modules
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { code, isActive } = body

    if (!code || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Code et isActive requis' },
        { status: 400 }
      )
    }

    // Vérifier que le module existe et n'est pas système
    const featureModule = await prisma.featureModule.findUnique({
      where: { code }
    })

    if (!featureModule) {
      return NextResponse.json(
        { error: 'Module introuvable' },
        { status: 404 }
      )
    }

    if (featureModule.isSystem) {
      return NextResponse.json(
        { error: 'Les modules système ne peuvent pas être désactivés' },
        { status: 400 }
      )
    }

    // Mettre à jour le module
    const updatedModule = await prisma.featureModule.update({
      where: { code },
      data: { isActive }
    })

    return NextResponse.json(updatedModule)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du module:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du module' },
      { status: 500 }
    )
  }
}

