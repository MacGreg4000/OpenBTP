import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

/**
 * GET /api/public/photos/chantiers
 * Récupère les chantiers disponibles pour l'upload de photos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uploadedBy = searchParams.get('uploadedBy');
    const uploadedByType = searchParams.get('uploadedByType') as 'OUVRIER_INTERNE' | 'SOUSTRAITANT';

    if (!uploadedBy || !uploadedByType) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    let chantiers = [];

    if (uploadedByType === 'OUVRIER_INTERNE') {
      // Pour les ouvriers internes : tous les chantiers actifs
      chantiers = await prisma.chantier.findMany({
        where: {
          statut: {
            in: ['EN_COURS', 'EN_PREPARATION']
          }
        },
        select: {
          id: true,
          chantierId: true,
          nomChantier: true,
          statut: true,
          dateDebut: true,
          dateFinPrevue: true,
          clientNom: true
        },
        orderBy: {
          nomChantier: 'asc'
        }
      });
    } else if (uploadedByType === 'SOUSTRAITANT') {
      // Pour les sous-traitants : seulement les chantiers où ils sont assignés
      chantiers = await prisma.chantier.findMany({
        where: {
          statut: {
            in: ['EN_COURS', 'EN_PREPARATION']
          },
          commandeSousTraitant: {
            some: {
              soustraitantId: uploadedBy
            }
          }
        },
        select: {
          id: true,
          chantierId: true,
          nomChantier: true,
          statut: true,
          dateDebut: true,
          dateFinPrevue: true,
          clientNom: true
        },
        orderBy: {
          nomChantier: 'asc'
        }
      });
    }

    // Formater les données pour l'affichage
    const chantiersFormates = chantiers.map(chantier => ({
      id: chantier.chantierId,
      nomChantier: chantier.nomChantier,
      statut: chantier.statut,
      statutLibelle: getStatutLibelle(chantier.statut),
      dateDebut: chantier.dateDebut,
      dateFinPrevue: chantier.dateFinPrevue,
      clientNom: chantier.clientNom
    }));

    return NextResponse.json({
      success: true,
      chantiers: chantiersFormates
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    );
  }
}

/**
 * Convertit le statut technique en libellé utilisateur
 */
function getStatutLibelle(statut: string): string {
  switch (statut) {
    case 'EN_COURS':
      return 'En cours';
    case 'EN_PREPARATION':
      return 'En préparation';
    case 'A_VENIR':
      return 'À venir';
    case 'TERMINE':
      return 'Terminé';
    default:
      return statut;
  }
}


