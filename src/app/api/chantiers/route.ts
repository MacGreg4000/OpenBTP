import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readPortalSessionFromCookie } from '@/app/public/portail/auth'
// import { Prisma } from '@prisma/client'
import { generatePPSS } from '@/lib/ppss-generator'
import { notifier } from '@/lib/services/notificationService'

// GET /api/chantiers - Liste tous les chantiers
export async function GET(request: Request) {
  try {
    // Essayer d'abord l'authentification normale
    const session = await getServerSession(authOptions)
    
    // Si pas de session normale, essayer l'authentification portail
    if (!session) {
      const cookieHeader = request.headers.get('cookie')
      console.log('🍪 Cookie header reçu:', cookieHeader)
      
      const portalSession = readPortalSessionFromCookie(cookieHeader)
      console.log('🔍 Session portail extraite:', portalSession)
      
      if (portalSession && (portalSession.t === 'OUVRIER_INTERNE' || portalSession.t === 'SOUSTRAITANT' || portalSession.t === 'MAGASINIER')) {
        console.log('🔐 Authentification portail détectée pour chantiers:', portalSession.t)
      } else {
        console.log('❌ Authentification portail échouée')
        return NextResponse.json([], { status: 401 })
      }
    }

    try {
      const { searchParams } = new URL(request.url)
      const page = Math.max(1, Number(searchParams.get('page') || '1'))
      const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '25')))
      const filtreEtat = searchParams.get('etat')
      const filtreNomChantier = searchParams.get('nomChantier')
      const filtreNomClient = searchParams.get('nomClient')

      // Construire le filtre de statut selon le paramètre fourni
      // Par défaut = actifs seulement (en préparation et en cours)
      // "tous" = tous les chantiers sans filtre de statut
      const whereClause: any = {}
      if (filtreEtat !== 'tous') {
        whereClause.statut = {
          in: ['EN_PREPARATION', 'EN_COURS']
        }
      }
      const filterClientId = searchParams.get('clientId')
      if (filterClientId) {
        whereClause.clientId = filterClientId
      }
      
      // Filtre par nom de chantier
      if (filtreNomChantier && filtreNomChantier.trim() !== '') {
        whereClause.nomChantier = {
          contains: filtreNomChantier
          // mode: 'insensitive' n'existe pas en MySQL/MariaDB (insensible par défaut)
        }
      }
      
      // Filtre par nom de client
      if (filtreNomClient && filtreNomClient.trim() !== '') {
        console.log('[FILTRE CLIENT] Recherche de:', filtreNomClient.trim())
        whereClause.client = {
          nom: {
            contains: filtreNomClient.trim()
            // mode: 'insensitive' n'existe pas en MySQL/MariaDB (insensible par défaut)
          }
        }
      }
      
      if (filtreEtat && filtreEtat !== '' && filtreEtat !== 'Tous les états' && filtreEtat !== 'tous') {
        // Convertir le libellé d'affichage vers le statut de la DB
        let statutDB = 'EN_PREPARATION' // valeur par défaut
        if (filtreEtat === 'En cours') statutDB = 'EN_COURS'
        else if (filtreEtat === 'Terminé') statutDB = 'TERMINE'
        else if (filtreEtat === 'À venir') statutDB = 'A_VENIR'
        else if (filtreEtat === 'En préparation') statutDB = 'EN_PREPARATION'
        
        whereClause.statut = { in: [statutDB] }
      }
      // Si filtreEtat est vide ou "Tous les états", le comportement par défaut (actifs seulement) est déjà défini

      const [total, chantiers] = await Promise.all([
        prisma.chantier.count({ where: whereClause }),
        prisma.chantier.findMany({
          where: whereClause,
          include: {
            client: {
              select: {
                nom: true,
                email: true,
                adresse: true
              }
            },
            commandes: {
              select: {
                total: true,
                statut: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: (page - 1) * pageSize,
          take: pageSize
        })
      ])

      if (!chantiers || !Array.isArray(chantiers)) {
        return NextResponse.json([])
      }

      // Transformer les données pour compatibilité avec l'interface existante
      const formattedChantiers = chantiers.map((chantier) => {
        // Conversion des états pour l'interface utilisateur
        let etatChantier = 'En préparation'
        if (chantier.statut === 'EN_COURS') etatChantier = 'En cours'
        else if (chantier.statut === 'TERMINE') etatChantier = 'Terminé'
        else if (chantier.statut === 'A_VENIR') etatChantier = 'À venir'

        // Calculer le montant total des commandes validées pour ce chantier
        const montantTotalCommandes = chantier.commandes
          .filter(commande => commande.statut !== 'BROUILLON') // Exclure les brouillons
          .reduce((total, commande) => total + (commande.total || 0), 0);

        // logs de debug supprimés en production

        return {
          id: chantier.id,
          chantierId: chantier.chantierId,
          numeroIdentification: chantier.numeroIdentification,
          clientId: chantier.clientId,
          nomChantier: chantier.nomChantier,
          dateCommencement: chantier.dateDebut,
          etatChantier,
          clientNom: chantier.client?.nom || '',
          clientEmail: chantier.client?.email || '',
          clientAdresse: chantier.client?.adresse || '',
          adresseChantier: chantier.adresseChantier || '',
          villeChantier: chantier.villeChantier || '',
          budget: montantTotalCommandes > 0 ? montantTotalCommandes : (chantier.budget || 0),
          dureeEnJours: chantier.dureeEnJours,
          typeDuree: chantier.typeDuree || 'CALENDRIER',
          createdAt: chantier.createdAt,
          updatedAt: chantier.updatedAt
        }
      })

      const response = {
        chantiers: formattedChantiers,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
      
      console.log('📊 Chantiers retournés:', {
        count: formattedChantiers.length,
        total,
        page,
        pageSize,
        filtreNomClient: filtreNomClient || 'aucun',
        clientsTrouvés: formattedChantiers.map(c => c.clientNom).filter((v, i, a) => a.indexOf(v) === i).join(', ')
      })
      
      return NextResponse.json(response)
    } catch {
      // Erreur DB capturée
      // Retourner un tableau vide en cas d'erreur de base de données
      return NextResponse.json([])
    }
  } catch {
    // Erreur générique capturée
    // Retourner un tableau vide en cas d'erreur générale
    return NextResponse.json([])
  }
}

// Fonction pour générer une chaîne aléatoire
function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// POST /api/chantiers - Créer un nouveau chantier
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    
    const { 
      nomChantier, 
      numeroIdentification,
      dateCommencement, 
      etatChantier, 
      adresseChantier, 
      dureeEnJours, 
      typeDuree,
      clientId, 
      contactId // Récupération du contactId
    } = body

    // Génération d'un ID unique pour le chantier
    const year = new Date().getFullYear()
    const randomId = generateRandomString(6).toUpperCase()
    const chantierId = `CH-${year}-${randomId}`

    // Conversion des états pour correspondre au schéma prisma
    let statut = 'EN_PREPARATION' // Valeur par défaut correspondant à "En préparation"
    if (etatChantier === 'En cours') statut = 'EN_COURS'
    else if (etatChantier === 'Terminé') statut = 'TERMINE'
    else if (etatChantier === 'À venir') statut = 'A_VENIR'

    const chantier = await prisma.chantier.create({
      data: {
        chantierId,
        numeroIdentification: numeroIdentification || null,
        nomChantier,
        dateDebut: dateCommencement ? new Date(dateCommencement) : null,
        statut,
        adresseChantier,
        dureeEnJours: dureeEnJours ? parseInt(dureeEnJours) : null,
        typeDuree: typeDuree || 'CALENDRIER',
        clientId,
        contactId: contactId || null,
        updatedAt: new Date(),
        createdAt: new Date()
      },
      include: {
        client: {
          select: {
            nom: true,
            email: true,
            adresse: true
          }
        }
      }
    })

    // Générer automatiquement le PPSS pour ce nouveau chantier
    try {
      // Génération automatique du PPSS pour le nouveau chantier
      await generatePPSS(chantierId, session.user.id);
      // PPSS généré avec succès pour le nouveau chantier
    } catch {
      // Ne pas bloquer la création du chantier si la génération du PPSS échoue
      // Erreur lors de la génération automatique du PPSS (non bloquant)
    }

    // 🔔 NOTIFICATION : Nouveau chantier créé
    await notifier({
      code: 'CHANTIER_CREE',
      rolesDestinataires: ['ADMIN', 'MANAGER'],
      metadata: {
        chantierId: chantier.chantierId,
        chantierNom: chantier.nomChantier,
        userName: session.user.name || session.user.email || 'Un utilisateur',
      },
    })

    return NextResponse.json(chantier)
  } catch {
    // Erreur lors de la création du chantier
    return NextResponse.json(
      { error: 'Erreur lors de la création du chantier' },
      { status: 500 }
    )
  }
} 