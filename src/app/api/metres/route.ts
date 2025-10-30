import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
// Typage minimal sans importer Prisma (évite erreur d'export sur certains environnements)

export async function GET() {
  try {
    const metres = await prisma.metreSoustraitant.findMany({
      where: { statut: { in: ['SOUMIS', 'PARTIELLEMENT_VALIDE'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        statut: true,
        createdAt: true,
        chantier: { select: { chantierId: true, nomChantier: true } },
        soustraitant: { select: { id: true, nom: true } }
      }
    })
    return NextResponse.json({ data: metres })
  } catch (err: unknown) {
    // Si la table n'existe pas encore (ex: NAS non migré), renvoyer une liste vide plutôt qu'un 500
    if (err && typeof err === 'object' && 'code' in (err as { code?: string })) {
      const code = (err as { code?: string }).code
      if (code === 'P2021' || code === 'P2022') {
        return NextResponse.json({ data: [] })
      }
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
