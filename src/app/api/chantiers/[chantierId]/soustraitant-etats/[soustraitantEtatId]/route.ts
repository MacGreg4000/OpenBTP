import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schéma de validation pour les données de mise à jour
const updateSchema = z.object({
  commentaires: z.string().optional(),
  lignes: z.array(
    z.object({
      id: z.number(),
      quantiteActuelle: z.number(),
      montantActuel: z.number(),
      quantiteTotale: z.number(),
      montantTotal: z.number()
    })
  ),
  avenants: z.array(
    z.object({
      id: z.number(),
      quantiteActuelle: z.number(),
      montantActuel: z.number(),
      quantiteTotale: z.number(),
      montantTotal: z.number()
    })
  )
})

// GET - Récupérer un état d'avancement sous-traitant
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ chantierId: string; soustraitantEtatId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { soustraitantEtatId } = params

    const soustraitantEtat = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(soustraitantEtatId)
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true,
        soustraitant: true
      }
    })

    if (!soustraitantEtat) {
      return NextResponse.json(
        { error: 'État d\'avancement sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(soustraitantEtat)
  } catch (error) {
    console.error('Erreur lors de la récupération:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un état d'avancement sous-traitant
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ chantierId: string; soustraitantEtatId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { soustraitantEtatId } = params
    const data = await request.json()

    // Validation des données
    const validationResult = updateSchema.safeParse(data)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { commentaires, lignes, avenants } = validationResult.data

    // Vérifier que l'état d'avancement existe
    const existingEtat = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(soustraitantEtatId)
      }
    })

    if (!existingEtat) {
      return NextResponse.json(
        { error: 'État d\'avancement sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si l'état est finalisé
    if (existingEtat.estFinalise) {
      return NextResponse.json(
        { error: 'Impossible de modifier un état d\'avancement finalisé' },
        { status: 400 }
      )
    }

    // Mise à jour de l'état d'avancement
    await prisma.$transaction(async (tx) => {
      // Mettre à jour les commentaires
      await tx.soustraitant_etat_avancement.update({
        where: {
          id: parseInt(soustraitantEtatId)
        },
        data: {
          commentaires
        }
      })

      // Mettre à jour les lignes
      for (const ligne of lignes) {
        await tx.ligne_soustraitant_etat_avancement.update({
          where: {
            id: ligne.id
          },
          data: {
            quantiteActuelle: ligne.quantiteActuelle,
            montantActuel: ligne.montantActuel,
            quantiteTotale: ligne.quantiteTotale,
            montantTotal: ligne.montantTotal
          }
        })
      }

      // Mettre à jour les avenants
      for (const avenant of avenants) {
        await tx.avenant_soustraitant_etat_avancement.update({
          where: {
            id: avenant.id
          },
          data: {
            quantiteActuelle: avenant.quantiteActuelle,
            montantActuel: avenant.montantActuel,
            quantiteTotale: avenant.quantiteTotale,
            montantTotal: avenant.montantTotal
          }
        })
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'état d\'avancement' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un état d'avancement sous-traitant
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ chantierId: string; soustraitantEtatId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { soustraitantEtatId } = params

    // Vérifier que l'état d'avancement existe
    const existingEtat = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(soustraitantEtatId)
      }
    })

    if (!existingEtat) {
      return NextResponse.json(
        { error: 'État d\'avancement sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si l'état est finalisé
    if (existingEtat.estFinalise) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un état d\'avancement finalisé' },
        { status: 400 }
      )
    }

    // Supprimer l'état d'avancement
    await prisma.soustraitant_etat_avancement.delete({
      where: {
        id: parseInt(soustraitantEtatId)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'état d\'avancement' },
      { status: 500 }
    )
  }
} 