import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement/[etatId]/lignes/[ligneId]
export async function PUT(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; etatId: string; ligneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { etatId, ligneId } = await context.params
    const body = await request.json()

    const idNum = parseInt(ligneId)
    const etatNum = parseInt(etatId)
    if (!etatNum || Number.isNaN(etatNum)) {
      return NextResponse.json({ error: 'etatId invalide' }, { status: 400 })
    }

    // Si ligneId invalide (0/NaN) ou ligne inexistante, on bascule en création
    let ligne
    if (!idNum || Number.isNaN(idNum)) {
      ligne = await prisma.ligne_soustraitant_etat_avancement.create({
        data: {
          soustraitant_etat_avancement: { connect: { id: etatNum } },
          article: body.article ?? '',
          description: body.description ?? '',
          type: body.type ?? 'QP',
          unite: body.unite ?? '',
          prixUnitaire: body.prixUnitaire ?? 0,
          quantite: body.quantite ?? 0,
          quantitePrecedente: body.quantitePrecedente ?? 0,
          quantiteActuelle: body.quantiteActuelle ?? 0,
          quantiteTotale: body.quantiteTotale ?? 0,
          montantPrecedent: body.montantPrecedent ?? 0,
          montantActuel: body.montantActuel ?? 0,
          montantTotal: body.montantTotal ?? 0,
          updatedAt: new Date()
        }
      })
    } else {
      // Tenter un update, sinon créer si introuvable
      try {
        ligne = await prisma.ligne_soustraitant_etat_avancement.update({
          where: { id: idNum },
          data: {
            quantiteActuelle: body.quantiteActuelle,
            quantiteTotale: body.quantiteTotale,
            montantActuel: body.montantActuel,
            montantTotal: body.montantTotal,
            updatedAt: new Date()
          }
        })
      } catch {
        // Création fallback
        ligne = await prisma.ligne_soustraitant_etat_avancement.create({
          data: {
            soustraitant_etat_avancement: { connect: { id: etatNum } },
            article: body.article ?? '',
            description: body.description ?? '',
            type: body.type ?? 'QP',
            unite: body.unite ?? '',
            prixUnitaire: body.prixUnitaire ?? 0,
            quantite: body.quantite ?? 0,
            quantitePrecedente: body.quantitePrecedente ?? 0,
            quantiteActuelle: body.quantiteActuelle ?? 0,
            quantiteTotale: body.quantiteTotale ?? 0,
            montantPrecedent: body.montantPrecedent ?? 0,
            montantActuel: body.montantActuel ?? 0,
            montantTotal: body.montantTotal ?? 0,
            updatedAt: new Date()
          }
        })
      }
    }

    return NextResponse.json(ligne)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la ligne' },
      { status: 500 }
    )
  }
} 