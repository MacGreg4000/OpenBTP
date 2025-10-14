import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schéma de validation pour la création d'un état d'avancement
const createSchema = z.object({
  soustraitantId: z.string()
})

// GET - Récupérer tous les états d'avancement d'un sous-traitant
export async function GET(request: NextRequest, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId } = params
    const { searchParams } = new URL(request.url)
    const soustraitantId = searchParams.get('soustraitantId')

    if (!soustraitantId) {
      return NextResponse.json(
        { error: 'ID du sous-traitant requis' },
        { status: 400 }
      )
    }

    // Récupérer le sous-traitant
    const soustraitant = await prisma.soustraitant.findUnique({
      where: {
        id: soustraitantId,
      },
      select: {
        id: true,
        nom: true
      }
    })

    if (!soustraitant) {
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    // Rechercher d'abord l'ID d'état d'avancement principal lié au chantier
    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantierId
      }
    })

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'Aucun état d\'avancement principal trouvé pour ce chantier' },
        { status: 404 }
      )
    }

    // Récupérer tous les états d'avancement du sous-traitant
    const etats = await prisma.soustraitant_etat_avancement.findMany({
      where: {
        soustraitantId: soustraitantId,
        etatAvancementId: etatAvancement.id
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true
      },
      orderBy: {
        numero: 'asc'
      }
    })

    return NextResponse.json({
      soustraitant,
      etats
    })
  } catch (error) {
    console.error('Erreur lors de la récupération:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des états d\'avancement' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouvel état d'avancement
export async function POST(request: NextRequest, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { chantierId } = params
    const data = await request.json()

    // Validation des données
    const validationResult = createSchema.safeParse(data)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const { soustraitantId } = validationResult.data

    // Vérifier que le sous-traitant existe
    const soustraitant = await prisma.soustraitant.findUnique({
      where: {
        id: soustraitantId
      }
    })

    if (!soustraitant) {
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: {
        chantierId: chantierId
      }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    // Trouver le dernier numéro d'état d'avancement pour ce sous-traitant
    const lastEtat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        soustraitantId
      },
      orderBy: {
        numero: 'desc'
      }
    })

    const nextNumero = lastEtat ? lastEtat.numero + 1 : 1

    // Récupérer les lignes de commande du sous-traitant
    const commandeSousTraitant = await prisma.commandeSousTraitant.findFirst({
      where: {
        chantierId: chantierId,
        soustraitantId
      },
      include: {
        lignes: true
      }
    })

    if (!commandeSousTraitant) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Récupérer l'id du premier état d'avancement (EtatAvancement) pour le lier
    const etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantierId
      }
    })

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'Aucun état d\'avancement principal trouvé pour ce chantier' },
        { status: 404 }
      )
    }

    // Créer un nouvel état d'avancement
    const newEtat = await prisma.soustraitant_etat_avancement.create({
      data: {
        soustraitantId,
        etatAvancementId: etatAvancement.id,
        numero: nextNumero,
        date: new Date(),
        commentaires: '',
        estFinalise: false,
        commandeSousTraitantId: commandeSousTraitant.id,
        updatedAt: new Date(),
        // Créer les lignes à partir de la commande
        ligne_soustraitant_etat_avancement: {
          create: commandeSousTraitant.lignes.map(ligne => ({
            article: ligne.article,
            description: ligne.description,
            type: ligne.type,
            unite: ligne.unite,
            prixUnitaire: ligne.prixUnitaire,
            quantite: ligne.quantite,
            quantitePrecedente: 0,
            quantiteActuelle: 0,
            montantPrecedent: 0,
            montantActuel: 0,
            quantiteTotale: 0,
            montantTotal: 0,
            updatedAt: new Date()
          }))
        }
      }
    })

    return NextResponse.json(newEtat)
  } catch (error) {
    console.error('Erreur lors de la création:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'état d\'avancement' },
      { status: 500 }
    )
  }
} 