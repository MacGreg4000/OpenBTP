import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement/[etatId]/avenants/[avenantId]
// Met à jour un avenant spécifique
export async function PUT(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string; avenantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, soustraitantId, etatId, avenantId } = await context.params
    const body = await request.json()

    const etatIdNum = parseInt(etatId)
    const avenantIdNum = parseInt(avenantId)
    
    if (isNaN(etatIdNum) || isNaN(avenantIdNum)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    // Récupérer l'ID interne du chantier
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true }
    })

    if (!chantierData) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Vérifier que l'état existe et appartient au bon sous-traitant
    const etat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        id: etatIdNum,
        soustraitantId
      }
    })

    if (!etat) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'état n'est pas finalisé
    if (etat.estFinalise) {
      return NextResponse.json(
        { error: 'Impossible de modifier un avenant d\'un état finalisé' },
        { status: 400 }
      )
    }

    // Vérifier que l'avenant existe et appartient à cet état
    const avenantExistant = await prisma.avenant_soustraitant_etat_avancement.findFirst({
      where: {
        id: avenantIdNum,
        soustraitantEtatAvancementId: etatIdNum
      }
    })

    if (!avenantExistant) {
      return NextResponse.json(
        { error: 'Avenant non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour l'avenant
    const avenantMisAJour = await prisma.avenant_soustraitant_etat_avancement.update({
      where: {
        id: avenantIdNum
      },
      data: {
        article: body.article,
        description: body.description,
        type: body.type,
        unite: body.unite,
        prixUnitaire: body.prixUnitaire,
        quantite: body.quantite,
        quantitePrecedente: body.quantitePrecedente,
        quantiteActuelle: body.quantiteActuelle,
        quantiteTotale: body.quantiteTotale,
        montantPrecedent: body.montantPrecedent,
        montantActuel: body.montantActuel,
        montantTotal: body.montantTotal,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(avenantMisAJour)
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'avenant:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'avenant' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement/[etatId]/avenants/[avenantId]
// Supprime un avenant spécifique
export async function DELETE(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string; avenantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, soustraitantId, etatId, avenantId } = await context.params

    const etatIdNum = parseInt(etatId)
    const avenantIdNum = parseInt(avenantId)
    
    if (isNaN(etatIdNum) || isNaN(avenantIdNum)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    // Récupérer l'ID interne du chantier
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true }
    })

    if (!chantierData) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Vérifier que l'état existe et appartient au bon sous-traitant
    const etat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        id: etatIdNum,
        soustraitantId
      }
    })

    if (!etat) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'état n'est pas finalisé
    if (etat.estFinalise) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un avenant d\'un état finalisé' },
        { status: 400 }
      )
    }

    // Vérifier que l'avenant existe et appartient à cet état
    const avenantExistant = await prisma.avenant_soustraitant_etat_avancement.findFirst({
      where: {
        id: avenantIdNum,
        soustraitantEtatAvancementId: etatIdNum
      }
    })

    if (!avenantExistant) {
      return NextResponse.json(
        { error: 'Avenant non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer l'avenant
    await prisma.avenant_soustraitant_etat_avancement.delete({
      where: {
        id: avenantIdNum
      }
    })

    return NextResponse.json({ success: true, message: 'Avenant supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'avenant:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'avenant' },
      { status: 500 }
    )
  }
}
