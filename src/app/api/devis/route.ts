import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/devis - Liste tous les devis
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const statut = searchParams.get('statut')

    const where: any = {}
    
    if (clientId) {
      where.clientId = clientId
    }
    
    if (statut) {
      where.statut = statut
    }

    const devis = await prisma.devis.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            email: true,
            telephone: true
          }
        },
        createur: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            lignes: true
          }
        }
      },
      orderBy: {
        dateCreation: 'desc'
      }
    })

    return NextResponse.json(devis)
  } catch (error) {
    console.error('Erreur lors de la récupération des devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des devis' },
      { status: 500 }
    )
  }
}

// POST /api/devis - Créer un nouveau devis
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, observations, conditionsGenerales, lignes = [] } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'Le client est obligatoire' },
        { status: 400 }
      )
    }

    // Générer le numéro de devis
    const year = new Date().getFullYear()
    const lastDevis = await prisma.devis.findFirst({
      where: {
        numeroDevis: {
          startsWith: `DEV-${year}-`
        }
      },
      orderBy: {
        numeroDevis: 'desc'
      }
    })

    let nextNumber = 1
    if (lastDevis) {
      const lastNumber = parseInt(lastDevis.numeroDevis.split('-')[2])
      nextNumber = lastNumber + 1
    }

    const numeroDevis = `DEV-${year}-${nextNumber.toString().padStart(4, '0')}`

    // Date de validité : +30 jours
    const dateValidite = new Date()
    dateValidite.setDate(dateValidite.getDate() + 30)

    // Créer le devis avec ses lignes
    const devis = await prisma.devis.create({
      data: {
        numeroDevis,
        clientId,
        dateValidite,
        observations,
        conditionsGenerales,
        createdBy: session.user.id,
        lignes: {
          create: lignes.map((ligne: any, index: number) => ({
            ordre: index + 1,
            type: ligne.type || 'QP',
            article: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' 
              ? (ligne.type === 'TITRE' ? 'ARTICLE_TITRE' : 'ARTICLE_SOUS_TITRE')
              : ligne.article,
            description: ligne.description,
            unite: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' ? '' : ligne.unite,
            quantite: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' ? 0 : ligne.quantite,
            prixUnitaire: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' ? 0 : ligne.prixUnitaire,
            remise: ligne.remise || 0,
            total: ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE' ? 0 : ligne.total
          }))
        }
      },
      include: {
        client: true,
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        }
      }
    })

    return NextResponse.json(devis, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du devis' },
      { status: 500 }
    )
  }
}

