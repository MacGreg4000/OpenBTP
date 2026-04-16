import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { sourceId } = body

  if (!sourceId) {
    return NextResponse.json({ error: 'sourceId requis' }, { status: 400 })
  }

  if (sourceId === id) {
    return NextResponse.json({ error: 'Le sous-traitant source et cible doivent être différents' }, { status: 400 })
  }

  const result = await prisma.$transaction(async (tx) => {
    // Récupérer les lignes du sous-traitant source
    const sourceLignes = await tx.ligneTarifSousTraitant.findMany({
      where: { soustraitantId: sourceId },
      orderBy: { ordre: 'asc' },
    })

    // Récupérer les conditions du sous-traitant source
    const sourceST = await tx.soustraitant.findUnique({
      where: { id: sourceId },
      select: { conditionsGenerales: true, conditionsParticulieres: true },
    })

    // Supprimer toutes les lignes existantes du sous-traitant cible
    await tx.ligneTarifSousTraitant.deleteMany({
      where: { soustraitantId: id },
    })

    // Créer les nouvelles lignes en copiant depuis la source
    const newLignes = await Promise.all(
      sourceLignes.map((ligne, index) =>
        tx.ligneTarifSousTraitant.create({
          data: {
            soustraitantId: id,
            ordre: index + 1,
            type: ligne.type,
            article: ligne.article,
            descriptif: ligne.descriptif,
            unite: ligne.unite,
            prixUnitaire: ligne.prixUnitaire,
            remarques: ligne.remarques,
          },
        })
      )
    )

    // Mettre à jour les conditions du sous-traitant cible
    await tx.soustraitant.update({
      where: { id },
      data: {
        conditionsGenerales: sourceST?.conditionsGenerales ?? null,
        conditionsParticulieres: sourceST?.conditionsParticulieres ?? null,
      },
    })

    return {
      lignes: newLignes,
      conditionsGenerales: sourceST?.conditionsGenerales ?? null,
      conditionsParticulieres: sourceST?.conditionsParticulieres ?? null,
    }
  })

  return NextResponse.json(result)
}
