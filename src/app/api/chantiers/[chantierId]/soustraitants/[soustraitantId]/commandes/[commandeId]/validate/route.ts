import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierIdReadable = params.chantierId;
    const soustraitantId = params.soustraitantId;
    const commandeId = params.commandeId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer l'ID interne du chantier à partir de son ID lisible
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierIdReadable },
      select: { id: true }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier introuvable' }, { status: 404 })
    }

    // Vérifier que la commande existe
    const commande = await prisma.$queryRaw<Array<{ estVerrouillee: number | boolean; tauxTVA: number }>>`
      SELECT * FROM commande_soustraitant
      WHERE id = ${parseInt(commandeId)}
      AND chantierId = ${chantier.id}
      AND soustraitantId = ${soustraitantId}
    `

    if (!commande || commande.length === 0) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si la commande est déjà verrouillée
    if (commande[0].estVerrouillee) {
      return NextResponse.json(
        { error: 'La commande est déjà verrouillée' },
        { status: 400 }
      )
    }

    // Vérifier que la commande a des lignes - utiliser le modèle Prisma directement (MySQL)
    const countLignes = await prisma.ligneCommandeSousTraitant.count({
      where: {
        commandeSousTraitantId: parseInt(commandeId)
      }
    })

    if (countLignes === 0) {
      return NextResponse.json(
        { error: 'La commande ne contient aucune ligne' },
        { status: 400 }
      )
    }

    // Verrouiller la commande
    await prisma.$executeRaw`
      UPDATE commande_soustraitant
      SET 
        estVerrouillee = true,
        statut = 'VALIDEE',
        updatedAt = NOW()
      WHERE id = ${parseInt(commandeId)}
    `

    // Récupérer la commande mise à jour
    const commandeMiseAJour = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        c.*,
        ch.nomChantier,
        s.nom as soustraitantNom,
        s.email as soustraitantEmail
      FROM commande_soustraitant c
      JOIN chantier ch ON c.chantierId = ch.id
      JOIN soustraitant s ON c.soustraitantId = s.id
      WHERE c.id = ${parseInt(commandeId)}
    `

    if (!commandeMiseAJour || commandeMiseAJour.length === 0) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la commande mise à jour' },
        { status: 500 }
      )
    }

    return NextResponse.json(commandeMiseAJour[0])
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la validation de la commande sous-traitant' },
      { status: 500 }
    )
  }
} 