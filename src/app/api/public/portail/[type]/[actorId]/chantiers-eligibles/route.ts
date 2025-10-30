import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: Request, props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const { type, actorId } = await props.params

  try {
    if (type !== 'soustraitant') {
      return NextResponse.json({ error: 'Type non supporté' }, { status: 400 })
    }

    // Lister les chantiers ayant une commande pour ce sous-traitant
    const commandes = await prisma.commandeSousTraitant.findMany({
      where: { soustraitantId: actorId },
      select: {
        id: true,
        Chantier: {
          select: {
            chantierId: true,
            nomChantier: true,
            statut: true,
            dateDebut: true,
            dateFinReelle: true,
            client: { select: { nom: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Dédupliquer par chantierId pour éviter les clés dupliquées côté frontend
    const seen = new Set<string>()
    const chantiers = commandes
      .map(c => c.Chantier)
      .filter(Boolean)
      .reduce((acc, ch) => {
        const id = ch!.chantierId
        // Garder uniquement les chantiers EN_COURS
        if (ch!.statut !== 'EN_COURS') return acc
        if (!seen.has(id)) {
          seen.add(id)
          acc.push({
            chantierId: id,
            nomChantier: ch!.nomChantier,
            statut: ch!.statut,
            client: ch!.client?.nom || 'N/A',
            dateDebut: ch!.dateDebut || null,
            dateFin: ch!.dateFinReelle || null
          })
        }
        return acc
      }, [] as { chantierId: string; nomChantier: string; statut: string; client: string; dateDebut: Date | null; dateFin: Date | null }[])

    return NextResponse.json({ data: chantiers })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
