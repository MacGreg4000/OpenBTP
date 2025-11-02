import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { notifier } from '@/lib/services/notificationService'

interface MetreLineInput {
  ligneCommandeId?: number
  article: string
  description?: string
  type?: string
  unite?: string
  prixUnitaire?: number
  quantite?: number
  estSupplement?: boolean
}

// POST: créer/soumettre un métré
// Body: { chantierId?, freeChantierNom?, commandeId?, statut?, commentaire?, piecesJointes?: string[], lignes: [...] }
export async function POST(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const { type, actorId } = await props.params
  if (type !== 'soustraitant') {
    return NextResponse.json({ error: 'Type non supporté' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { statut, commentaire, piecesJointes, lignes, freeChantierNom } = body as {
      statut?: string
      commentaire?: string | null
      piecesJointes?: string[]
      lignes: MetreLineInput[]
      freeChantierNom?: string
    }
    let { chantierId, commandeId } = body as { chantierId?: string; commandeId?: number | null }

    if (!Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json({ error: 'lignes requis' }, { status: 400 })
    }

    // Cas chantier libre: créer un chantier minimal si pas de chantierId fourni
    if (!chantierId && freeChantierNom) {
      const newChantierId = `CH-LIBRE-${Date.now()}`
      const created = await prisma.chantier.create({
        data: {
          chantierId: newChantierId,
          nomChantier: String(freeChantierNom).slice(0, 120) || 'Chantier libre',
        }
      })
      chantierId = created.chantierId
      commandeId = null
    }

    if (!chantierId) {
      return NextResponse.json({ error: 'chantierId manquant' }, { status: 400 })
    }

    // Vérifier commande éligible si fournie, sinon vérifier au moins une commande existante sauf chantier libre
    let existeCommande: { id: number } | null = null
    if (commandeId) {
      existeCommande = await prisma.commandeSousTraitant.findFirst({
        where: { soustraitantId: actorId, id: Number(commandeId) },
        select: { id: true }
      })
      if (!existeCommande) return NextResponse.json({ error: 'Commande non autorisée' }, { status: 403 })
    } else {
      existeCommande = await prisma.commandeSousTraitant.findFirst({
        where: { soustraitantId: actorId, chantierId },
        select: { id: true }
      })
    }

    const metre = await prisma.metreSoustraitant.create({
      data: {
        chantierId,
        soustraitantId: actorId,
        commandeId: existeCommande?.id ?? null,
        statut: (statut ?? 'SOUMIS'),
        commentaire: commentaire ?? null,
        piecesJointes: Array.isArray(piecesJointes) ? piecesJointes : null,
        lignes: {
          create: lignes.map((l) => ({
            ligneCommandeId: l.ligneCommandeId ?? null,
            article: l.article,
            description: l.description ?? '',
            type: l.type ?? 'QP',
            unite: l.unite ?? 'U',
            prixUnitaire: Number(l.prixUnitaire ?? 0),
            quantite: Number(l.quantite ?? 0),
            estSupplement: Boolean(l.estSupplement ?? false)
          }))
        }
      },
      include: { 
        lignes: true,
        chantier: { select: { chantierId: true, nomChantier: true } },
        soustraitant: { select: { id: true, nom: true } }
      }
    })

    // 🔔 NOTIFICATION : Métré soumis (si statut = SOUMIS)
    if (metre.statut === 'SOUMIS') {
      await notifier({
        code: 'METRE_SOUMIS',
        rolesDestinataires: ['ADMIN', 'MANAGER'],
        metadata: {
          chantierId: metre.chantierId,
          chantierNom: metre.chantier.nomChantier,
          soustraitantId: metre.soustraitantId,
          soustraitantNom: metre.soustraitant.nom,
          metreId: metre.id,
        },
      })
    }

    return NextResponse.json(metre, { status: 201 })
  } catch {
    console.error('Erreur création métré')
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
