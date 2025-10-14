import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; bonCommandeId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    if (!params.chantierId || !params.bonCommandeId) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: {
        chantierId: params.chantierId
      }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }
    // Récupérer le bon de commande sous-traitant
    const bonCommande = await prisma.$queryRaw`
      SELECT * FROM bon_commande_sous_traitant
      WHERE id = ${params.bonCommandeId}
    `

    if (!bonCommande || !Array.isArray(bonCommande) || bonCommande.length === 0) {
      return NextResponse.json({ error: 'Bon de commande non trouvé' }, { status: 404 })
    }

    // Récupérer les lignes du bon de commande
    const lignes = await prisma.$queryRaw`
      SELECT l.*, lc.article, lc.description, lc.type, lc.unite, lc.quantite
      FROM ligne_bon_commande_sous_traitant l
      JOIN lignecommande lc ON l.ligneCommandeId = lc.id
      WHERE l.bonCommandeSousTraitantId = ${params.bonCommandeId}
    `

    // Récupérer le sous-traitant
    const soustraitant = await prisma.soustraitant.findUnique({
      where: {
        id: bonCommande[0].soustraitantId
      }
    })

    const result = {
      ...bonCommande[0],
      lignes: lignes || [],
      soustraitant: soustraitant
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du bon de commande' },
      { status: 500 }
    )
  }
} 