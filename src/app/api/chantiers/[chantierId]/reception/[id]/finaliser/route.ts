import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Fonction pour convertir les BigInt en nombre lors de la sérialisation JSON
function formatBigIntValues(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (typeof data === 'bigint') {
    return Number(data);
  }
  
  if (Array.isArray(data)) {
    return (data as unknown[]).map(formatBigIntValues);
  }
  
  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in data as Record<string, unknown>) {
      result[key] = formatBigIntValues((data as Record<string, unknown>)[key]);
    }
    return result;
  }
  
  return data;
}

// POST /api/chantiers/[chantierId]/reception/[id]/finaliser
// Finaliser une réception
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chantierId: string; id: string }> }
) {
  try {
    // Attendre la Promise params
    const resolvedParams = await params;
    const chantierId = resolvedParams.chantierId;
    const receptionId = resolvedParams.id;
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Vérifier si la réception existe et appartient au chantier
    const reception = await prisma.$queryRaw<Array<{ id: number; estFinalise: number }>>`
      SELECT id, estFinalise FROM reception_chantier
      WHERE id = ${receptionId} AND chantierId = ${chantierId}
    `;

    if (!reception || reception.length === 0) {
      return NextResponse.json(
        { error: 'Réception non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si la réception n'est pas déjà finalisée
    if (reception[0].estFinalise === 1) {
      return NextResponse.json(
        { error: 'Cette réception est déjà finalisée' },
        { status: 400 }
      );
    }

    // Vérifier si toutes les remarques sont résolues et validées
    const remarquesNonResolues = await prisma.$queryRaw<Array<{ nbRemarques: number }>>`
      SELECT COUNT(*) as nbRemarques
      FROM remarque_reception
      WHERE receptionId = ${receptionId}
      AND (estResolue = 0 OR (estResolue = 1 AND estValidee = 0 AND estRejetee = 0))
    `;

    if (remarquesNonResolues[0].nbRemarques > 0) {
      return NextResponse.json(
        { error: 'Toutes les remarques doivent être résolues et validées avant de finaliser la réception' },
        { status: 400 }
      );
    }

    // Mettre à jour la réception comme finalisée
    await prisma.$executeRaw`
      UPDATE reception_chantier
      SET estFinalise = 1, updatedAt = NOW()
      WHERE id = ${receptionId}
    `;

    // Récupérer la réception mise à jour
    const receptionMAJ = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM reception_chantier
      WHERE id = ${receptionId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Réception finalisée avec succès',
      reception: formatBigIntValues(receptionMAJ[0])
    });
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la finalisation de la réception' },
      { status: 500 }
    );
  }
} 