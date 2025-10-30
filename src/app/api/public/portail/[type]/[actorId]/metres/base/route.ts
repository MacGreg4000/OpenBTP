import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const { type, actorId } = await props.params
  if (type !== 'soustraitant') return NextResponse.json({ error: 'Type non supporté' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const chantierId = searchParams.get('chantierId')
  if (!chantierId) return NextResponse.json({ error: 'chantierId requis' }, { status: 400 })

  try {
    const commande = await prisma.commandeSousTraitant.findFirst({
      where: { soustraitantId: actorId, chantierId },
      select: {
        id: true,
        lignes: {
          select: { id: true, article: true, description: true, type: true, unite: true, prixUnitaire: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!commande) return NextResponse.json({ data: [], commandeId: null })

    const base = commande.lignes.map(l => ({
      ligneCommandeId: l.id,
      article: l.article,
      description: l.description,
      type: l.type,
      unite: l.unite,
      prixUnitaire: l.prixUnitaire,
      quantite: 0,
      estSupplement: false
    }))

    return NextResponse.json({ data: base, commandeId: commande.id })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
