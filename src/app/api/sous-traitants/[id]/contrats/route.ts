// Historique complet des contrats d'un sous-traitant.
//
// Route séparée de GET /api/sous-traitants (qui ne renvoie qu'un seul contrat
// « à afficher », résolu côté serveur) : ici, on veut TOUT montrer — chaque
// génération, signée ou non, pour qu'un statut « en attente » qui masquait
// jusqu'ici un contrat réellement signé (cf. Dimensão Gabarito, Soares De
// Jesus Ilder) se voie enfin, au lieu de rester invisible jusqu'à ce que
// quelqu'un s'en étonne.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { statutEcheance } from '@/lib/contrats/echeance'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await context.params

    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id },
      select: { id: true, nom: true },
    })
    if (!soustraitant) {
      return NextResponse.json({ error: 'Sous-traitant non trouvé' }, { status: 404 })
    }

    const contrats = await prisma.contrat.findMany({
      where: { soustraitantId: id },
      select: {
        id: true,
        url: true,
        estSigne: true,
        dateGeneration: true,
        dateSignature: true,
        dateFin: true,
      },
      orderBy: { dateGeneration: 'desc' },
    })

    return NextResponse.json({
      soustraitant,
      contrats: contrats.map((c) => ({ ...c, statutEcheance: statutEcheance(c.dateFin) })),
    })
  } catch (error) {
    console.error('Erreur lors de la récupération de l’historique des contrats:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l’historique des contrats' },
      { status: 500 }
    )
  }
}
