import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client'; // Utilisation de l'instance partagée

// const prisma = new PrismaClient(); // Suppression de la nouvelle instance

// METTRE À JOUR UN CONTACT
export async function PUT(request: Request, props: { params: Promise<{ contactId: string }> }) {
  const routeParams = await props.params; // Attendre les paramètres
  const contactId = routeParams.contactId;
  if (!contactId) {
    return NextResponse.json({ error: 'Contact ID manquant' }, { status: 400 });
  }

  try {
    const body = await request.json();
    // Valider/Sanitizer les données ici si nécessaire
    const { prenom, nom, email, telephone, fonction, notes } = body;

    const contactMaj = await prisma.contact.update({
      where: { id: contactId },
      data: {
        prenom,
        nom,
        email,
        telephone,
        fonction,
        notes,
        updatedAt: new Date(), // Mettre à jour la date de modification
      },
    });
    return NextResponse.json(contactMaj);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du contact ${contactId}:`, error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du contact" }, { status: 500 });
  }
}

// SUPPRIMER UN CONTACT
export async function DELETE(request: Request, props: { params: Promise<{ contactId: string }> }) {
  const routeParams = await props.params; // Attendre les paramètres
  const contactId = routeParams.contactId;
  if (!contactId) {
    return NextResponse.json({ error: 'Contact ID manquant' }, { status: 400 });
  }

  try {
    await prisma.contact.delete({
      where: { id: contactId },
    });
    return NextResponse.json({ message: 'Contact supprimé avec succès' }, { status: 200 }); // ou 204 No Content
  } catch (error) {
    console.error(`Erreur lors de la suppression du contact ${contactId}:`, error);
    return NextResponse.json({ error: "Erreur lors de la suppression du contact" }, { status: 500 });
  }
} 