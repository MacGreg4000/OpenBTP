import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { indexChoixClient } from '@/lib/rag/choix-client-indexer'

export const dynamic = 'force-dynamic'

// GET - Liste de tous les choix clients
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const chantierId = searchParams.get('chantierId')

    const whereClause: {
      statut?: string
      chantierId?: string
    } = {}
    
    if (statut) {
      whereClause.statut = statut
    }
    
    if (chantierId) {
      whereClause.chantierId = chantierId
    }

    const choixClients = await prisma.choixClient.findMany({
      where: whereClause,
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        },
        detailsChoix: {
          select: {
            id: true,
            numeroChoix: true,
            couleurPlan: true,
            localisations: true,
            marque: true,
            modele: true
          },
          orderBy: {
            numeroChoix: 'asc'
          }
        }
      },
      orderBy: {
        dateVisite: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      choixClients
    })

  } catch (error) {
    console.error('Erreur lors de la récupération des choix clients:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des choix clients' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau choix client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const {
      nomClient,
      telephoneClient,
      emailClient,
      chantierId,
      dateVisite,
      statut,
      notesGenerales,
      detailsChoix
    } = body

    if (!nomClient) {
      return NextResponse.json(
        { error: 'Le nom du client est requis' },
        { status: 400 }
      )
    }

    const choixClient = await prisma.choixClient.create({
      data: {
        nomClient,
        telephoneClient,
        emailClient,
        chantierId: chantierId || null,
        dateVisite: dateVisite ? new Date(dateVisite) : new Date(),
        statut: statut || 'BROUILLON',
        notesGenerales,
        createdBy: session.user.id,
        detailsChoix: detailsChoix && detailsChoix.length > 0 ? {
          create: detailsChoix.map((detail: {
            numeroChoix: number
            couleurPlan: string
            localisations: string[]
            type: string
            marque: string
            collection?: string
            modele: string
            reference?: string
            couleur?: string
            formatLongueur?: number
            formatLargeur?: number
            epaisseur?: number
            finition?: string
            surfaceEstimee?: number
            couleurJoint?: string
            largeurJoint?: number
            typeJoint?: string
            typePose?: string
            sensPose?: string
            particularitesPose?: string
            photosShowroom?: string[]
            notes?: string
            zoneDessineeData?: unknown
          }, index: number) => ({
            numeroChoix: index + 1,
            couleurPlan: detail.couleurPlan,
            localisations: detail.localisations || [],
            type: detail.type || 'SOL',
            marque: detail.marque,
            collection: detail.collection,
            modele: detail.modele,
            reference: detail.reference,
            couleur: detail.couleur,
            formatLongueur: detail.formatLongueur,
            formatLargeur: detail.formatLargeur,
            epaisseur: detail.epaisseur,
            finition: detail.finition,
            surfaceEstimee: detail.surfaceEstimee,
            couleurJoint: detail.couleurJoint,
            largeurJoint: detail.largeurJoint,
            typeJoint: detail.typeJoint,
            typePose: detail.typePose,
            sensPose: detail.sensPose,
            particularitesPose: detail.particularitesPose,
            photosShowroom: detail.photosShowroom,
            notes: detail.notes,
            zoneDessineeData: detail.zoneDessineeData
          }))
        } : undefined
      },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        },
        detailsChoix: {
          orderBy: {
            numeroChoix: 'asc'
          }
        }
      }
    })

    // Indexer le choix client dans le RAG (async, ne pas attendre)
    indexChoixClient(choixClient.id).catch(err => 
      console.error('Erreur indexation RAG:', err)
    )

    return NextResponse.json({
      success: true,
      choixClient
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur lors de la création du choix client:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du choix client' },
      { status: 500 }
    )
  }
}

