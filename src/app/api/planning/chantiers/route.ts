import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';

// GET - Récupérer les chantiers en cours pour le planning
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer tous les chantiers actifs (non terminés)
    const chantiers = await prisma.chantier.findMany({
      where: {
        statut: {
          not: 'TERMINE' // Exclure seulement les chantiers terminés
        }
      },
      select: {
        chantierId: true,
        nomChantier: true,
        statut: true,
        dateDebut: true,
        dateFinReelle: true,
        client: {
          select: {
            nom: true
          }
        }
      },
      orderBy: {
        nomChantier: 'asc'
      }
    });

    // Transformer les données pour correspondre au format attendu par le dashboard
    const chantiersFormates = chantiers.map(chantier => {
      // Mapping des statuts vers libellés utilisés par le dashboard
      let etatLibelle = chantier.statut
      switch (chantier.statut) {
        case 'EN_PREPARATION':
          etatLibelle = 'En préparation'
          break
        case 'EN_COURS':
          etatLibelle = 'En cours'
          break
        case 'TERMINE':
          etatLibelle = 'Terminé'
          break
        case 'A_VENIR':
          etatLibelle = 'À venir'
          break
        default:
          etatLibelle = chantier.statut
      }

      const start = (chantier.dateDebut ?? new Date()).toISOString()
      const end = chantier.dateFinReelle ? chantier.dateFinReelle.toISOString() : null

      // Forme attendue par Dashboard (/src/app/(dashboard)/page.tsx)
      return {
        id: chantier.chantierId,
        title: chantier.nomChantier,
        client: chantier.client?.nom || 'Client non spécifié',
        etat: etatLibelle,
        start,
        end
      }
    })

    return NextResponse.json(chantiersFormates);

  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    );
  }
}