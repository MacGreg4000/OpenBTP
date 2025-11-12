import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

interface LignePayload {
  id?: string
  type?: string
  article?: string | null
  description?: string | null
  unite?: string | null
  quantite?: number
  prixUnitaire?: number
  remise?: number
  total?: number
}

interface CreateDevisPayload {
  typeDevis?: 'DEVIS' | 'AVENANT'
  reference?: string | null
  clientId: string
  chantierId?: string | null
  observations?: string | null
  tauxTVA?: number
  remiseGlobale?: number
  montantHT?: number
  montantTVA?: number
  montantTTC?: number
  lignes?: LignePayload[]
}

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

    const devis = await prisma.devis.findMany({
      where: {
        ...(clientId ? { clientId } : {}),
        ...(statut ? { statut } : {})
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            email: true,
            telephone: true
          }
        },
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
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

    const body = (await request.json()) as CreateDevisPayload
    const { 
      typeDevis = 'DEVIS',
      reference,
      clientId, 
      chantierId,
      observations, 
      tauxTVA = 21, 
      remiseGlobale = 0, 
      montantHT = 0, 
      montantTVA = 0, 
      montantTTC = 0, 
      lignes = [] 
    } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'Le client est obligatoire' },
        { status: 400 }
      )
    }

    // Validation selon le type
    if (typeDevis === 'AVENANT' && !chantierId) {
      return NextResponse.json(
        { error: 'Le chantier est obligatoire pour un avenant' },
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
        typeDevis,
        reference: reference || null,
        clientId,
        chantierId: chantierId || null,
        dateValidite,
        observations,
        tauxTVA,
        remiseGlobale,
        montantHT,
        montantTVA,
        montantTTC,
        createdBy: session.user.id,
        lignes: {
          create: lignes.map((ligne, index) => {
            const typeLigne = ligne.type ?? 'QP'
            const isSection = typeLigne === 'TITRE' || typeLigne === 'SOUS_TITRE'
            return {
              ordre: index + 1,
              type: typeLigne,
              article: isSection
                ? (typeLigne === 'TITRE' ? 'ARTICLE_TITRE' : 'ARTICLE_SOUS_TITRE')
                : ligne.article ?? null,
              description: ligne.description ?? null,
              unite: isSection ? '' : ligne.unite ?? '',
              quantite: isSection ? 0 : ligne.quantite ?? 0,
              prixUnitaire: isSection ? 0 : ligne.prixUnitaire ?? 0,
              remise: ligne.remise ?? 0,
              total: isSection ? 0 : ligne.total ?? 0
            }
          })
        }
      },
      include: {
        client: true,
        chantier: true,
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

