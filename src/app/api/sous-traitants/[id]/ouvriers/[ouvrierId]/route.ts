import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string, ouvrierId: string }> }
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

    console.log(`Récupération de l'ouvrier ID: ${params.ouvrierId} du sous-traitant ID: ${params.id}`);

    // Récupérer l'ouvrier sans relations problématiques
    const ouvrier = await prisma.ouvrier.findUnique({
      where: { 
        id: params.ouvrierId 
      }
    });

    if (!ouvrier) {
      console.log(`Ouvrier non trouvé avec ID: ${params.ouvrierId}`);
      return NextResponse.json(
        { error: 'Ouvrier non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer séparément le sous-traitant
    const sousTraitant = await prisma.soustraitant.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        nom: true
      }
    });

    // Récupérer séparément les documents de l'ouvrier
    const documents = await prisma.documentOuvrier.findMany({
      where: { ouvrierId: params.ouvrierId }
    });

    // Transformer la réponse pour maintenir la compatibilité avec le frontend
    const response = {
      ...ouvrier,
      sousTraitant: sousTraitant,
      documents: documents
    };

    console.log(`Ouvrier trouvé: ${ouvrier.prenom} ${ouvrier.nom} avec ${documents.length} documents`);
    return NextResponse.json(response)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'ouvrier' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string, ouvrierId: string }> }
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

    // Validation basique
    if (!body.nom || !body.prenom || !body.dateEntree || !body.poste) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    const ouvrier = await prisma.ouvrier.update({
      where: { 
        id: params.ouvrierId,
        sousTraitantId: params.id
      },
      data: {
        nom: body.nom,
        prenom: body.prenom,
        email: body.email || null,
        telephone: body.telephone || null,
        dateEntree: new Date(body.dateEntree),
        poste: body.poste
      }
    })

    return NextResponse.json(ouvrier)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'ouvrier' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string, ouvrierId: string }> }
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

    await prisma.ouvrier.delete({
      where: { 
        id: params.ouvrierId,
        sousTraitantId: params.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'ouvrier' },
      { status: 500 }
    )
  }
} 