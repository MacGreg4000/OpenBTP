import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/clients - Récupère tous les clients
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour accéder à cette ressource' },
        { status: 401 }
      )
    }

    // S'assurer que Prisma est connecté - attendre que la connexion soit établie
    try {
      if (prisma && typeof (prisma as { $connect?: () => Promise<void> }).$connect === 'function') {
        await (prisma as { $connect: () => Promise<void> }).$connect()
      }
    } catch (connectError: unknown) {
      // Ignorer si déjà connecté
      const errorMsg = String(connectError)
      if (!errorMsg.includes('already connected') && !errorMsg.includes('already initialized')) {
        // Continuer quand même - Prisma peut se connecter automatiquement
        console.warn('Avertissement de connexion Prisma (continuation normale):', errorMsg)
      }
    }

    const clients = await prisma.client.findMany({
      select: {
        id: true,
        nom: true,
        email: true,
        telephone: true,
        adresse: true,
        numeroTva: true,
        Chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            dateDebut: true,
            statut: true,
            budget: true,
            adresseChantier: true,
            commandes: {
              select: {
                total: true,
                statut: true
              }
            }
          },
          orderBy: {
            dateDebut: 'desc'
          }
        }
      },
      orderBy: {
        nom: 'asc'
      }
    })

    return NextResponse.json(clients)
  } catch (error: unknown) {
    console.error('Erreur lors de la récupération des clients:', error)

    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des clients',
        details: (error as Error | undefined)?.message || 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}

// POST /api/clients - Crée un nouveau client
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour créer un client' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Données reçues pour la création du client:', body)

    // Validation des données du client
    if (!body.nom) {
      return NextResponse.json(
        { error: 'Le nom du client est requis' },
        { status: 400 }
      )
    }

    // Générer un ID unique pour le client
    const uniqueId = `CL-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    console.log('ID généré pour le client:', uniqueId)

    // Création du client
    const client = await prisma.client.create({
      data: {
        id: uniqueId,
        nom: body.nom,
        email: body.email || null,
        telephone: body.telephone || null,
        adresse: body.adresse || null,
        numeroTva: body.numeroTva || null,
        updatedAt: new Date() // Ajouter la date de mise à jour
      }
    })

    console.log('Client créé avec succès:', client)
    return NextResponse.json(client)
  } catch (e: unknown) {
    console.error('Erreur lors de la création du client:', e)
    
    return NextResponse.json(
      { error: 'Erreur lors de la création du client' },
      { status: 500 }
    )
  }
} 