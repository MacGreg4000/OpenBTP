import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { indexChoixClient, removeChoixClientFromIndex } from '@/lib/rag/choix-client-indexer'

export const dynamic = 'force-dynamic'

// GET - Récupérer un choix client spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    const choixClient = await prisma.choixClient.findUnique({
      where: { id },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            adresseChantier: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        detailsChoix: {
          orderBy: {
            numeroChoix: 'asc'
          }
        }
      }
    })

    if (!choixClient) {
      return NextResponse.json(
        { error: 'Choix client non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      choixClient
    })

  } catch (error) {
    console.error('Erreur lors de la récupération du choix client:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du choix client' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un choix client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    
    const {
      nomClient,
      telephoneClient,
      emailClient,
      chantierId,
      dateVisite,
      statut,
      planOriginal,
      planAnnote,
      planAnnoteData,
      notesGenerales,
      documents,
      detailsChoix
    } = body

    // Vérifier que le choix client existe
    const existingChoix = await prisma.choixClient.findUnique({
      where: { id },
      include: { detailsChoix: true }
    })

    if (!existingChoix) {
      return NextResponse.json(
        { error: 'Choix client non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour le choix client
    await prisma.choixClient.update({
      where: { id },
      data: {
        nomClient: nomClient || existingChoix.nomClient,
        telephoneClient,
        emailClient,
        chantierId: chantierId === null ? null : chantierId || existingChoix.chantierId,
        dateVisite: dateVisite ? new Date(dateVisite) : existingChoix.dateVisite,
        statut: statut || existingChoix.statut,
        planOriginal,
        planAnnote,
        planAnnoteData,
        notesGenerales,
        documents
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

    // Si des détails de choix sont fournis, les mettre à jour
    if (detailsChoix && Array.isArray(detailsChoix)) {
      // Supprimer les anciens détails
      await prisma.detailChoix.deleteMany({
        where: { choixClientId: id }
      })

      // Créer les nouveaux détails
      if (detailsChoix.length > 0) {
        await prisma.detailChoix.createMany({
          data: detailsChoix.map((detail: any, index: number) => ({
            choixClientId: id,
            numeroChoix: detail.numeroChoix || index + 1,
            couleurPlan: detail.couleurPlan,
            localisations: detail.localisations,
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
        })
      }
    }

    // Récupérer le choix client mis à jour avec les détails
    const updatedChoixClient = await prisma.choixClient.findUnique({
      where: { id },
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

    // Ré-indexer le choix client dans le RAG (async, ne pas attendre)
    if (updatedChoixClient) {
      indexChoixClient(updatedChoixClient.id).catch(err => 
        console.error('Erreur ré-indexation RAG:', err)
      )
    }

    return NextResponse.json({
      success: true,
      choixClient: updatedChoixClient
    })

  } catch (error) {
    console.error('Erreur lors de la mise à jour du choix client:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du choix client' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un choix client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que le choix client existe
    const existingChoix = await prisma.choixClient.findUnique({
      where: { id }
    })

    if (!existingChoix) {
      return NextResponse.json(
        { error: 'Choix client non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer l'indexation RAG (async, ne pas attendre)
    removeChoixClientFromIndex(id).catch(err => 
      console.error('Erreur suppression indexation RAG:', err)
    )

    // Supprimer le choix client (cascade supprimera aussi les détails)
    await prisma.choixClient.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Choix client supprimé avec succès'
    })

  } catch (error) {
    console.error('Erreur lors de la suppression du choix client:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du choix client' },
      { status: 500 }
    )
  }
}

