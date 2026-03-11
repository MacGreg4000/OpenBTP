import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Récupérer les bons de régie, avec limite optionnelle (réservé aux utilisateurs connectés)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const bonsRegie = await prisma.bonRegie.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json(bonsRegie)
  } catch (error) {
    console.error('Erreur lors de la récupération des bons de régie:', error)
    let errorMessage = 'Erreur lors de la récupération des bons de régie';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Ajouter un bon de régie
export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Validation de base des données
    if (!data.client || !data.nomChantier || !data.description || !data.tempsChantier || !data.signature || !data.nomSignataire || !data.dateSignature) {
      return new NextResponse(
        JSON.stringify({ error: 'Données incomplètes' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const dateSignature = new Date(data.dateSignature);

    // Vérifier si la date de signature est valide
    if (isNaN(dateSignature.getTime())) {
      return new NextResponse(
        JSON.stringify({ error: 'Format de dateSignature invalide' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const nouveauBonRegie = await prisma.bonRegie.create({
      data: {
        dates: data.dates || '', // Assurer une valeur par défaut si dates est manquant
        client: data.client,
        nomChantier: data.nomChantier,
        description: data.description,
        tempsChantier: data.tempsChantier,
        nombreTechniciens: data.nombreTechniciens ? parseInt(data.nombreTechniciens, 10) : null, // S'assurer que c'est un Int ou null
        materiaux: data.materiaux && data.materiaux.trim() !== '' ? data.materiaux : null,
        nomSignataire: data.nomSignataire,
        signature: data.signature,
        dateSignature: dateSignature,
        // createdAt et updatedAt sont gérés automatiquement par Prisma
      },
    });
    
    return NextResponse.json(nouveauBonRegie)
  } catch (error) {
    console.error('Erreur lors de la création du bon de régie:', error)
    if (typeof error === 'object' && error && 'code' in error) {
      return new NextResponse(
        JSON.stringify({ error: 'Erreur de base de données. Veuillez vérifier les données soumises.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      )
    }
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de la création du bon de régie' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 