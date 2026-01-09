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

    // Récupérer le CUID du chantier à partir de son ID lisible
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId: chantierId },
      select: { id: true }
    });

    if (!chantierData) {
      return NextResponse.json({ error: 'Chantier non trouvé pour cet ID lisible' }, { status: 404 });
    }
    const chantierIdInterne = chantierData.id;

    // Récupérer tous les états d'avancement du sous-traitant pour ce chantier
    const etats = await prisma.soustraitant_etat_avancement.findMany({
      where: {
        soustraitantId: soustraitantId,
        etat_avancement: {
          chantierId: chantierIdInterne
        }
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

    // Vérifier que le chantier existe et récupérer son CUID
    const chantier = await prisma.chantier.findUnique({
      where: {
        chantierId: chantierId
      },
      select: {
        id: true
      }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    const chantierIdInterne = chantier.id

    // Récupérer ou créer un état d'avancement client (nécessaire pour la contrainte DB)
    let etatAvancement = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantierIdInterne
      }
    })

    // Si aucun état client n'existe, en créer un automatiquement
    if (!etatAvancement) {
      console.log('Aucun état d\'avancement client trouvé, création automatique d\'un état par défaut')
      
      // Récupérer la commande du chantier pour initialiser l'état
      const commande = await prisma.commande.findFirst({
        where: { chantierId: chantierIdInterne },
        include: { lignes: true }
      })

      etatAvancement = await prisma.etatAvancement.create({
        data: {
          chantierId: chantierIdInterne,
          numero: 1,
          date: new Date(),
          commentaires: 'État créé automatiquement pour permettre les états sous-traitants',
          estFinalise: false,
          commandeId: commande?.id,
          totalHT: 0,
          totalTTC: 0,
          // Créer des lignes vides si une commande existe
          lignes: commande?.lignes ? {
            create: commande.lignes.map(ligne => ({
              ligneCommandeId: ligne.id,
              quantitePrecedente: 0,
              quantiteActuelle: 0,
              quantiteTotale: 0,
              montantPrecedent: 0,
              montantActuel: 0,
              montantTotal: 0,
              article: ligne.article,
              description: ligne.description,
              prixUnitaire: ligne.prixUnitaire,
              quantite: ligne.quantite,
              type: ligne.type,
              unite: ligne.unite
            }))
          } : undefined
        }
      })
      console.log('État d\'avancement client créé automatiquement:', etatAvancement.id)
    }

    // Trouver le dernier numéro d'état d'avancement pour ce sous-traitant
    const lastEtat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        soustraitantId,
        etat_avancement: {
          chantierId: chantierIdInterne
        }
      },
      orderBy: {
        numero: 'desc'
      }
    })

    const nextNumero = lastEtat ? lastEtat.numero + 1 : 1

    // Récupérer les lignes de commande du sous-traitant
    const commandeSousTraitant = await prisma.commandeSousTraitant.findFirst({
      where: {
        chantierId: chantierIdInterne,
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