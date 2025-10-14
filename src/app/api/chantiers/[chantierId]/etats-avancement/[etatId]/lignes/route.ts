import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/chantiers/[chantierId]/etats-avancement/[etatId]/lignes
export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: params.chantierId,
        numero: parseInt(params.etatId)
      }
    })

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    const ligne = await prisma.ligneEtatAvancement.create({
      data: {
        etatAvancementId: etatAvancement.id,
        ligneCommandeId: body.ligneCommandeId,
        article: body.article,
        description: body.description,
        type: body.type,
        unite: body.unite,
        prixUnitaire: body.prixUnitaire,
        quantite: body.quantite,
        quantitePrecedente: body.quantitePrecedente || 0,
        quantiteActuelle: body.quantiteActuelle || 0,
        quantiteTotale: body.quantiteTotale || 0,
        montantPrecedent: body.montantPrecedent || 0,
        montantActuel: body.montantActuel || 0,
        montantTotal: body.montantTotal || 0
      }
    })

    return NextResponse.json(ligne)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la ligne' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId]/etats-avancement/[etatId]/lignes/[ligneId]
export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string; ligneId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const ligne = await prisma.ligneEtatAvancement.update({
      where: {
        id: parseInt(params.ligneId)
      },
      data: {
        quantiteActuelle: body.quantiteActuelle,
        quantiteTotale: body.quantiteTotale,
        montantActuel: body.montantActuel,
        montantTotal: body.montantTotal
      }
    })

    return NextResponse.json(ligne)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la ligne' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId]/etats-avancement/[etatId]/lignes/[ligneId]
export async function DELETE(
  request: Request,
  props: { params: Promise<{ chantierId: string; etatId: string; ligneId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    await prisma.ligneEtatAvancement.delete({
      where: {
        id: parseInt(params.ligneId)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la ligne' },
      { status: 500 }
    )
  }
} 