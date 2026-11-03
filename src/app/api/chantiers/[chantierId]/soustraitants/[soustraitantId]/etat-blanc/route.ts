import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { etatsSoustraitantDuChantier, REFERENCE_HORS_COMMANDE } from '@/lib/etats/soustraitant'

// POST /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etat-blanc
// Crée un état d'avancement « blanc » pour un sous-traitant sans commande sur ce
// chantier (journée de finitions, poste imprévu…) : tout y est saisi en avenants.
// Une commande technique sans ligne le rattache au chantier.
export async function POST(
  _request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId, soustraitantId } = await context.params

    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: { id: true }
    })
    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id: soustraitantId },
      select: { id: true }
    })
    if (!soustraitant) {
      return NextResponse.json({ error: 'Sous-traitant non trouvé' }, { status: 404 })
    }

    const commandeExistante = await prisma.commandeSousTraitant.findFirst({
      where: { chantierId: chantier.id, soustraitantId },
      select: { id: true }
    })
    if (commandeExistante) {
      return NextResponse.json(
        { error: 'Ce sous-traitant a déjà une commande sur ce chantier : utilisez « Nouvel état » puis « Ajouter un avenant ».' },
        { status: 409 }
      )
    }

    // Anciens états éventuels (rattachés à un état client) : même règle que la création normale
    const dernierEtat = await prisma.soustraitant_etat_avancement.findFirst({
      where: { soustraitantId, ...etatsSoustraitantDuChantier(chantier.id) },
      orderBy: { numero: 'desc' },
      select: { numero: true, estFinalise: true }
    })
    if (dernierEtat && !dernierEtat.estFinalise) {
      return NextResponse.json(
        { error: 'L\'état d\'avancement précédent doit être finalisé avant de créer un nouvel état.' },
        { status: 400 }
      )
    }

    const dernierEtatClient = await prisma.etatAvancement.findFirst({
      where: { chantierId: chantier.id },
      orderBy: { numero: 'desc' },
      select: { id: true }
    })

    const etat = await prisma.$transaction(async (tx: typeof prisma) => {
      const commande = await tx.commandeSousTraitant.create({
        data: {
          chantierId: chantier.id,
          soustraitantId,
          dateCommande: new Date(),
          reference: REFERENCE_HORS_COMMANDE,
          tauxTVA: 0,
          sousTotal: 0,
          tva: 0,
          total: 0,
          statut: 'VALIDEE',
          estVerrouillee: true
        },
        select: { id: true }
      })

      return tx.soustraitant_etat_avancement.create({
        data: {
          soustraitantId,
          commandeSousTraitantId: commande.id,
          numero: dernierEtat ? dernierEtat.numero + 1 : 1,
          date: new Date(),
          etatAvancementId: dernierEtatClient?.id ?? null,
          estFinalise: false,
          commentaires: '',
          updatedAt: new Date()
        },
        select: { id: true, numero: true }
      })
    })

    return NextResponse.json(etat, { status: 201 })
  } catch (error) {
    console.error('Erreur création état blanc:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}
