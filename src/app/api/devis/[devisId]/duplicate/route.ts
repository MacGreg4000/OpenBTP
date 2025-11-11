import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST /api/devis/[devisId]/duplicate - Dupliquer un devis
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ devisId: string }> }
) {
  const params = await props.params
  const { devisId } = params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const originalDevis = await prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        }
      }
    })

    if (!originalDevis) {
      return NextResponse.json(
        { error: 'Devis introuvable' },
        { status: 404 }
      )
    }

    // Générer le nouveau numéro de devis
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

    // Créer la copie
    const newDevis = await prisma.devis.create({
      data: {
        numeroDevis,
        clientId: originalDevis.clientId,
        dateValidite,
        observations: originalDevis.observations,
        conditionsGenerales: originalDevis.conditionsGenerales,
        remiseGlobale: originalDevis.remiseGlobale,
        createdBy: session.user.id,
        statut: 'BROUILLON',
        lignes: {
          create: originalDevis.lignes.map((ligne) => ({
            ordre: ligne.ordre,
            type: ligne.type,
            article: ligne.article,
            description: ligne.description,
            unite: ligne.unite,
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixUnitaire,
            remise: ligne.remise,
            total: ligne.total
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

    return NextResponse.json(newDevis, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la duplication du devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la duplication du devis' },
      { status: 500 }
    )
  }
}

