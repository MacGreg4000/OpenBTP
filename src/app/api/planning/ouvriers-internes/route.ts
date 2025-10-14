import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';

// GET - Récupérer tous les ouvriers internes actifs
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const ouvriers = await prisma.ouvrierInterne.findMany({
      where: {
        actif: true
      },
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' }
      ]
    });

    return NextResponse.json(ouvriers);

  } catch (error) {
    console.error('Erreur lors de la récupération des ouvriers internes:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ouvriers internes' },
      { status: 500 }
    );
  }
}

// POST - Créer un nouvel ouvrier interne
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const data = await request.json();
    const { nom, prenom, email, telephone, poste } = data;

    if (!nom || !prenom) {
      return NextResponse.json(
        { error: 'Le nom et prénom sont requis' },
        { status: 400 }
      );
    }

    const nouvelOuvrier = await prisma.ouvrierInterne.create({
      data: {
        nom,
        prenom,
        email,
        telephone,
        poste,
        actif: true
      }
    });

    return NextResponse.json(nouvelOuvrier, { status: 201 });

  } catch (error) {
    console.error('Erreur lors de la création de l\'ouvrier interne:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'ouvrier interne' },
      { status: 500 }
    );
  }
}


