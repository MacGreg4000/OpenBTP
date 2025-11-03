import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement/[etatId]
// Récupère un état d'avancement spécifique
export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, soustraitantId, etatId } = await context.params

    // Récupérer l'ID interne du chantier
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true }
    })

    if (!chantierData) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer l'état d'avancement et vérifier qu'il appartient à ce chantier
    const etatAvancementPrincipal = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantierData.id
      }
    })

    if (!etatAvancementPrincipal) {
      return NextResponse.json({ error: 'Aucun état d\'avancement principal trouvé pour ce chantier' }, { status: 404 })
    }

    const etat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        id: parseInt(etatId),
        soustraitantId,
        etatAvancementId: etatAvancementPrincipal.id
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true,
        soustraitant: true
      }
    })

    if (!etat) {
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      id: etat.id,
      numero: etat.numero,
      date: etat.date,
      soustraitantId: etat.soustraitantId,
      soustraitantNom: etat.soustraitant.nom,
      commentaires: etat.commentaires,
      estFinalise: etat.estFinalise,
      lignes: etat.ligne_soustraitant_etat_avancement,
      avenants: etat.avenant_soustraitant_etat_avancement
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement/[etatId]
// Met à jour un état d'avancement (commentaires, finalisation)
export async function PUT(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, soustraitantId, etatId } = await context.params
    const body = await request.json()

    // Valider que etatId n'est pas 0 (nouvel état)
    if (etatId === '0') {
      return NextResponse.json(
        { error: 'Cannot update state with ID 0. Create state first.' },
        { status: 400 }
      )
    }

    const etatIdNum = parseInt(etatId)
    if (isNaN(etatIdNum)) {
      return NextResponse.json({ error: 'ID d\'état invalide' }, { status: 400 })
    }

    // Récupérer l'ID interne du chantier
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true }
    })

    if (!chantierData) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer l'état d'avancement principal pour ce chantier
    const etatAvancementPrincipal = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantierData.id
      }
    })

    if (!etatAvancementPrincipal) {
      return NextResponse.json(
        { error: 'Aucun état d\'avancement principal trouvé pour ce chantier' },
        { status: 404 }
      )
    }

    // Vérifier que l'état existe et appartient au bon sous-traitant ET au bon chantier
    const etatExistant = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        id: etatIdNum,
        soustraitantId,
        etatAvancementId: etatAvancementPrincipal.id
      }
    })

    if (!etatExistant) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'état n'est pas finalisé (sauf si on veut le finaliser)
    if (etatExistant.estFinalise && !body.estFinalise) {
      return NextResponse.json(
        { error: 'Impossible de modifier un état finalisé' },
        { status: 400 }
      )
    }

    // Mettre à jour l'état
    const etatMisAJour = await prisma.soustraitant_etat_avancement.update({
      where: { id: etatIdNum },
      data: {
        commentaires: body.commentaires,
        estFinalise: body.estFinalise,
        updatedAt: new Date()
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true,
        soustraitant: true
      }
    })

    return NextResponse.json({
      id: etatMisAJour.id,
      numero: etatMisAJour.numero,
      date: etatMisAJour.date,
      soustraitantId: etatMisAJour.soustraitantId,
      soustraitantNom: etatMisAJour.soustraitant.nom,
      commentaires: etatMisAJour.commentaires,
      estFinalise: etatMisAJour.estFinalise,
      lignes: etatMisAJour.ligne_soustraitant_etat_avancement,
      avenants: etatMisAJour.avenant_soustraitant_etat_avancement
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement/[etatId]
// Supprime un état d'avancement sous-traitant
export async function DELETE(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, soustraitantId, etatId } = await context.params

    const etatIdNum = parseInt(etatId)
    if (isNaN(etatIdNum)) {
      return NextResponse.json({ error: 'ID d\'état invalide' }, { status: 400 })
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
    const etatExistant = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        id: etatIdNum,
        soustraitantId
      }
    })

    if (!etatExistant) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que l'état n'est pas finalisé
    if (etatExistant.estFinalise) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un état finalisé' },
        { status: 400 }
      )
    }

    // Récupérer l'état d'avancement principal pour ce chantier
    const etatAvancementPrincipal = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantierData.id
      }
    })

    if (!etatAvancementPrincipal) {
      return NextResponse.json(
        { error: 'Aucun état d\'avancement principal trouvé pour ce chantier' },
        { status: 404 }
      )
    }

    // Vérifier qu'il s'agit du dernier état (numéro le plus élevé) pour ce sous-traitant ET ce chantier
    const dernierEtat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        soustraitantId,
        etatAvancementId: etatAvancementPrincipal.id
      },
      orderBy: {
        numero: 'desc'
      }
    })

    if (!dernierEtat || dernierEtat.id !== etatIdNum) {
      return NextResponse.json(
        { error: 'Seul le dernier état d\'avancement peut être supprimé' },
        { status: 400 }
      )
    }

    // Supprimer d'abord les dépendances
    await prisma.ligne_soustraitant_etat_avancement.deleteMany({
      where: { soustraitantEtatAvancementId: etatIdNum }
    })

    await prisma.avenant_soustraitant_etat_avancement.deleteMany({
      where: { soustraitantEtatAvancementId: etatIdNum }
    })

    // Supprimer l'état d'avancement
    await prisma.soustraitant_etat_avancement.delete({
      where: { id: etatIdNum }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}