import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// POST /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement/[etatId]/avenants
// Ajoute un nouvel avenant à un état d'avancement
export async function POST(
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
        { error: 'Cannot add avenant to state with ID 0. Create state first.' },
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
        { error: 'Impossible d\'ajouter un avenant à un état finalisé' },
        { status: 400 }
      )
    }

    // Créer le nouvel avenant
    const nouvelAvenant = await prisma.avenant_soustraitant_etat_avancement.create({
      data: {
        soustraitantEtatAvancementId: etatIdNum,
        article: body.article || '',
        description: body.description || '',
        type: body.type || 'QP',
        unite: body.unite || 'U',
        prixUnitaire: body.prixUnitaire || 0,
        quantite: body.quantite || 0,
        quantitePrecedente: body.quantitePrecedente || 0,
        quantiteActuelle: body.quantiteActuelle || 0,
        quantiteTotale: body.quantiteTotale || 0,
        montantPrecedent: body.montantPrecedent || 0,
        montantActuel: body.montantActuel || 0,
        montantTotal: body.montantTotal || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json(nouvelAvenant)
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'avenant:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout de l\'avenant' },
      { status: 500 }
    )
  }
}