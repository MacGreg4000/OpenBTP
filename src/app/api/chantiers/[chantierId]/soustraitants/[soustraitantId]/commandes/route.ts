import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // 1. Récupérer l'ID interne du chantier à partir de son ID lisible
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId },
      select: { id: true }
    });

    if (!chantierData) {
      return NextResponse.json({ error: 'Chantier non trouvé pour cet ID lisible' }, { status: 404 });
    }
    const chantierIdInterne = chantierData.id;

    // Utiliser Prisma pour récupérer les commandes sous-traitant (sécurisé)
    const commandes = await prisma.commandeSousTraitant.findMany({
      where: {
        chantierId: chantierIdInterne,
        soustraitantId: params.soustraitantId
      },
      include: {
        Chantier: {
          select: {
            nomChantier: true
          }
        },
        soustraitant: {
          select: {
            nom: true,
            email: true
          }
        }
      },
      orderBy: {
        dateCommande: 'desc'
      }
    })

    // Pour chaque commande, récupérer ses lignes avec Prisma
    const commandesAvecLignes = await Promise.all(commandes.map(async (commande) => {
      const lignes = await prisma.ligneCommandeSousTraitant.findMany({
        where: {
          commandeSousTraitantId: commande.id
        },
        orderBy: {
          ordre: 'asc'
        }
      })

      return {
        ...commande,
        lignes: lignes
      }
    }))

    return NextResponse.json(commandesAvecLignes)
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { lignes, reference, tauxTVA } = body

    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {
      return NextResponse.json(
        { error: 'Les lignes de commande sont requises' },
        { status: 400 }
      )
    }

    // Calculer les totaux
    let sousTotal = 0
    type LigneIn = { article: string; description: string; type?: string; unite: string; prixUnitaire: number; quantite: number }
    const lignesAvecTotal = (lignes as LigneIn[]).map((ligne, index: number) => {
      const total = ligne.prixUnitaire * ligne.quantite
      sousTotal += total
      return {
        ...ligne,
        ordre: index + 1,
        total
      }
    })

    const tva = sousTotal * (tauxTVA || 0) / 100
    const total = sousTotal + tva

    // Récupérer l'ID interne du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId },
      select: { id: true }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 });
    }

    // Créer la commande avec Prisma et récupérer l'ID
    const created = await prisma.commandeSousTraitant.create({
      data: {
        chantierId: chantier.id,
        soustraitantId: params.soustraitantId,
        dateCommande: new Date(),
        reference: reference || null,
        tauxTVA: typeof tauxTVA === 'number' ? tauxTVA : 0,
        sousTotal,
        tva,
        total,
        statut: 'BROUILLON',
        estVerrouillee: false,
      },
      select: { id: true }
    })

    const commandeId = created.id

    // Créer les lignes de commande
    await prisma.ligneCommandeSousTraitant.createMany({
      data: lignesAvecTotal.map((ligne) => ({
        commandeSousTraitantId: commandeId,
        ordre: ligne.ordre,
        article: ligne.article,
        description: ligne.description,
        type: ligne.type || 'QP',
        unite: ligne.unite,
        prixUnitaire: ligne.prixUnitaire,
        quantite: ligne.quantite,
        total: ligne.total,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    })

    // Récupérer la commande complète avec Prisma
    const commandeComplete = await prisma.commandeSousTraitant.findUnique({
      where: { id: commandeId },
      include: {
        Chantier: {
          select: {
            nomChantier: true
          }
        },
        soustraitant: {
          select: {
            nom: true,
            email: true
          }
        },
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        }
      }
    })

    if (!commandeComplete) {
      return NextResponse.json({ error: 'Erreur lors de la récupération de la commande créée' }, { status: 500 });
    }

    return NextResponse.json(commandeComplete)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande sous-traitant' },
      { status: 500 }
    )
  }
} 