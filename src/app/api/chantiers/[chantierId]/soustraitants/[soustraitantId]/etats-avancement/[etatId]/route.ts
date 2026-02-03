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

    console.log('[GET État Soustraitant] Paramètres:', { chantierId, soustraitantId, etatId })

    // Récupérer l'ID interne du chantier
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true }
    })

    if (!chantierData) {
      console.error('[GET État Soustraitant] Chantier non trouvé:', chantierId)
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    console.log('[GET État Soustraitant] Chantier ID interne:', chantierData.id)

    // Récupérer d'abord l'état sans filtre sur le chantier
    const etat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        id: parseInt(etatId),
        soustraitantId
      },
      include: {
        ligne_soustraitant_etat_avancement: {
          orderBy: { id: 'asc' }
        },
        avenant_soustraitant_etat_avancement: {
          orderBy: { id: 'asc' }
        },
        soustraitant: true,
        etat_avancement: {
          select: {
            id: true,
            chantierId: true,
            numero: true
          }
        }
      }
    })

    console.log('[GET État Soustraitant] État trouvé:', etat ? `ID ${etat.id}, Numéro ${etat.numero}` : 'null')

    if (!etat) {
      console.error('[GET État Soustraitant] État non trouvé pour:', { etatId, soustraitantId })
      return NextResponse.json({ error: 'État d\'avancement non trouvé' }, { status: 404 })
    }

    // Vérifier que l'état appartient bien au bon chantier
    if (etat.etat_avancement.chantierId !== chantierData.id) {
      console.error('[GET État Soustraitant] Chantier mismatch:', { 
        expected: chantierData.id, 
        actual: etat.etat_avancement.chantierId 
      })
      return NextResponse.json({ error: 'État d\'avancement non trouvé pour ce chantier' }, { status: 404 })
    }

    console.log('[GET État Soustraitant] État récupéré avec succès:', {
      lignes: etat.ligne_soustraitant_etat_avancement.length,
      avenants: etat.avenant_soustraitant_etat_avancement.length
    })

    return NextResponse.json({
      id: etat.id,
      numero: etat.numero,
      date: etat.date,
      soustraitantId: etat.soustraitantId,
      soustraitantNom: etat.soustraitant.nom,
      commentaires: etat.commentaires,
      estFinalise: etat.estFinalise,
      commandeSousTraitantId: etat.commandeSousTraitantId,
      lignes: etat.ligne_soustraitant_etat_avancement,
      avenants: etat.avenant_soustraitant_etat_avancement
    })
  } catch (error) {
    console.error('[GET État Soustraitant] Erreur:', error)
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

    // Vérifier que l'état existe et appartient au bon sous-traitant ET au bon chantier
    const etatExistant = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        id: etatIdNum,
        soustraitantId,
        etat_avancement: {
          chantierId: chantierData.id
        }
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

    // Créer les avenants "nouveaux" (id manquant ou <= 0) envoyés par le frontend mais pas encore en base
    if (body.avenants && Array.isArray(body.avenants) && body.avenants.length > 0) {
      const newAvenants = body.avenants.filter(
        (a: { id?: number }) => a.id == null || a.id <= 0
      )
      if (newAvenants.length > 0) {
        for (const avenant of newAvenants) {
          await prisma.avenant_soustraitant_etat_avancement.create({
            data: {
              soustraitantEtatAvancementId: etatIdNum,
              article: avenant.article ?? '',
              description: avenant.description ?? '',
              type: avenant.type ?? 'QP',
              unite: avenant.unite ?? 'U',
              prixUnitaire: Number(avenant.prixUnitaire) || 0,
              quantite: Number(avenant.quantite) || 0,
              quantitePrecedente: Number(avenant.quantitePrecedente) || 0,
              quantiteActuelle: Number(avenant.quantiteActuelle) || 0,
              quantiteTotale: Number(avenant.quantiteTotale) || 0,
              montantPrecedent: Number(avenant.montantPrecedent) || 0,
              montantActuel: Number(avenant.montantActuel) || 0,
              montantTotal: Number(avenant.montantTotal) || 0,
              updatedAt: new Date()
            }
          })
        }
      }
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
        ligne_soustraitant_etat_avancement: { orderBy: { id: 'asc' } },
        avenant_soustraitant_etat_avancement: { orderBy: { id: 'asc' } },
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

    // Vérifier qu'il s'agit du dernier état (numéro le plus élevé) pour ce sous-traitant ET ce chantier
    const dernierEtat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        soustraitantId,
        etat_avancement: {
          chantierId: chantierData.id
        }
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