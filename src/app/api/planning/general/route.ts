import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';

// GET - Récupérer tous les chantiers pour le planning général
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer tous les chantiers avec les informations nécessaires
    const chantiers = await prisma.chantier.findMany({
      where: {
        statut: {
          in: ['EN_PREPARATION', 'EN_COURS', 'TERMINE'] // Tous les chantiers
        }
      },
      select: {
        id: true,
        chantierId: true,
        nomChantier: true,
        statut: true,
        dateDebut: true,
        dateFinReelle: true,
        adresseChantier: true,
        budget: true,
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

    // Transformer les données pour correspondre au format attendu par la page
    const transformedChantiers = chantiers.map(chantier => ({
      id: chantier.id,
      title: chantier.nomChantier,
      start: chantier.dateDebut ? chantier.dateDebut.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      end: chantier.dateFinReelle ? chantier.dateFinReelle.toISOString().split('T')[0] : null,
      client: chantier.client?.nom || 'Client non spécifié',
      etat: chantier.statut === 'EN_PREPARATION' ? 'En préparation' : 
            chantier.statut === 'EN_COURS' ? 'En cours' : 
            chantier.statut === 'TERMINE' ? 'Terminé' : chantier.statut,
      adresse: chantier.adresseChantier,
      montant: chantier.budget
    }));

    return NextResponse.json(transformedChantiers);

  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers pour le planning général:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    );
  }
}
