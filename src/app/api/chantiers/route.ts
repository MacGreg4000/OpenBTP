import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// import { Prisma } from '@prisma/client'
import { generatePPSS } from '@/lib/ppss-generator'

// GET /api/chantiers - Liste tous les chantiers
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json([], { status: 401 })
    }

    try {
      const { searchParams } = new URL(request.url)
      const page = Math.max(1, Number(searchParams.get('page') || '1'))
      const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '25')))

      const [total, chantiers] = await Promise.all([
        prisma.chantier.count(),
        prisma.chantier.findMany({
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

      return NextResponse.json({
        data: formattedChantiers,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      })
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

    return NextResponse.json(chantier)
  } catch {
    // Erreur lors de la création du chantier
    return NextResponse.json(
      { error: 'Erreur lors de la création du chantier' },
      { status: 500 }
    )
  }
} 