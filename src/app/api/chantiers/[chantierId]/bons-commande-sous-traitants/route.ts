import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { soustraitantId, lignes }: { soustraitantId: string; lignes: Array<{ ligneCommandeId: number; prixUnitaire: number }> } = await request.json()

    if (!soustraitantId || !lignes || !Array.isArray(lignes)) {
      return NextResponse.json(
        { error: 'Données invalides' },
        { status: 400 }
      )
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le sous-traitant existe
    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id: soustraitantId }
    })

    if (!soustraitant) {
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que toutes les lignes de commande existent
    const lignesCommandeIds = (lignes as Array<{ ligneCommandeId: number }>).map((l) => l.ligneCommandeId)
    const lignesCommande = await prisma.ligneCommande.findMany({
      where: {
        id: { in: lignesCommandeIds },
        commande: { chantierId: params.chantierId }
      }
    })

    if (lignesCommande.length !== lignesCommandeIds.length) {
      return NextResponse.json(
        { error: 'Une ou plusieurs lignes de commande n\'existent pas' },
        { status: 400 }
      )
    }

    // Créer le bon de commande sous-traitant et ses lignes
    const id = `bc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    
    // Insérer le bon de commande
    await prisma.$executeRaw`
      INSERT INTO bon_commande_sous_traitant (
        id, chantierId, soustraitantId, date, statut, createdAt, updatedAt, createdBy
      ) VALUES (
        ${id}, ${params.chantierId}, ${soustraitantId}, ${now}, 'EN_ATTENTE', ${now}, ${now}, ${session.user.email || ''}
      )
    `;
    
    // Insérer les lignes du bon de commande
    for (const ligne of lignes) {
      const ligneId = `lbc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await prisma.$executeRaw`
        INSERT INTO ligne_bon_commande_sous_traitant (
          id, bonCommandeSousTraitantId, ligneCommandeId, prixUnitaire, createdAt, updatedAt
        ) VALUES (
          ${ligneId}, ${id}, ${ligne.ligneCommandeId}, ${ligne.prixUnitaire}, ${now}, ${now}
        )
      `;
    }
    
    // Récupérer le bon de commande créé avec ses lignes
    const bonCommande = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM bon_commande_sous_traitant
      WHERE id = ${id}
    `;
    
    const lignesBonCommande = await prisma.$queryRaw<Array<{
      id: string;
      bonCommandeSousTraitantId: string;
      ligneCommandeId: number;
      prixUnitaire: number;
      createdAt: Date;
      updatedAt: Date;
      article: string;
      description: string;
      type: string;
      unite: string;
      quantite: number;
    }>>`
      SELECT l.*, lc.article, lc.description, lc.type, lc.unite, lc.quantite
      FROM ligne_bon_commande_sous_traitant l
      JOIN lignecommande lc ON l.ligneCommandeId = lc.id
      WHERE l.bonCommandeSousTraitantId = ${id}
    `;
    
    const soustraitantInfo = await prisma.soustraitant.findUnique({
      where: { id: soustraitantId }
    });
    
    const result = {
      ...bonCommande[0],
      lignes: lignesBonCommande || [],
      soustraitant: soustraitantInfo
    };

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du bon de commande' },
      { status: 500 }
    )
  }
} 