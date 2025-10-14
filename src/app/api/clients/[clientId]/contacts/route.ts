import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, props: { params: Promise<{ clientId: string }> }) {
  const routeParams = await props.params; // Attendre les paramètres
  const clientId = routeParams.clientId;

  if (!clientId) {
    return NextResponse.json({ error: 'Client ID manquant' }, { status: 400 });
  }

  try {
    const contacts = await prisma.contact.findMany({
      where: {
        clientId: clientId,
      },
      orderBy: {
        prenom: 'asc',
      },
    });
    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Erreur lors de la récupération des contacts:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération des contacts" }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ clientId: string }> }) {
  const routeParams = await props.params; // Attendre les paramètres
  const clientId = routeParams.clientId;

  if (!clientId) {
    return NextResponse.json({ error: 'Client ID manquant' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { prenom, nom, email, telephone, fonction, notes } = body;

    if (!prenom || !nom) {
      return NextResponse.json({ error: 'Prénom et Nom sont requis' }, { status: 400 });
    }

    const nouveauContact = await prisma.contact.create({
      data: {
        prenom,
        nom,
        email,
        telephone,
        fonction,
        notes,
        clientId: clientId, // Assure la liaison avec le client
      },
    });

    return NextResponse.json(nouveauContact, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du contact:", error);
    // Vérifier si l'erreur est une erreur de validation Prisma ou autre
    if (error instanceof Error && error.message.includes('validation')) {
        return NextResponse.json({ error: `Erreur de validation: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur lors de la création du contact" }, { status: 500 });
  }
} 