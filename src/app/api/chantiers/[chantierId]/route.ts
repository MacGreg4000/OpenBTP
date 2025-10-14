import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePPSS } from '@/lib/ppss-generator'

// GET /api/chantiers/[chantierId] - Récupère un chantier spécifique
export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const chantier = await prisma.chantier.findUnique({
      where: {
        chantierId: chantierId,
      }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    return NextResponse.json(chantier)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du chantier' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId] - Met à jour un chantier
export async function PUT(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log("Données reçues pour mise à jour:", body);

    // Gestion de la compatibilité avec les anciens et nouveaux noms de champs
    // Pour le statut, on accepte à la fois etatChantier (ancien) et statut (nouveau)
    let statut = body.statut;
    if (!statut && body.etatChantier) {
      // Conversion des états pour correspondre au schéma prisma (ancienne méthode)
      if (body.etatChantier === 'En cours') statut = 'EN_COURS';
      else if (body.etatChantier === 'Terminé') statut = 'TERMINE';
      else if (body.etatChantier === 'À venir') statut = 'A_VENIR';
      else statut = 'EN_PREPARATION';
    } else if (statut) {
      // Si c'est déjà au format d'affichage, convertir au format DB
      if (statut === 'En cours') statut = 'EN_COURS';
      else if (statut === 'Terminé') statut = 'TERMINE';
      else if (statut === 'À venir' || statut === 'A_VENIR') statut = 'A_VENIR';
      else statut = 'EN_PREPARATION';
    }

    // Pour la date, on accepte dateCommencement (ancien) ou dateDebut (nouveau)
    const dateDebut = body.dateDebut ? new Date(body.dateDebut) : 
                      body.dateCommencement ? new Date(body.dateCommencement) : null;

    // Mise à jour du chantier avec gestion des différents formats de champs
    const chantier = await prisma.chantier.update({
      where: { chantierId: chantierId },
      data: {
        nomChantier: body.nomChantier,
        numeroIdentification: body.numeroIdentification || null,
        dateDebut: dateDebut,
        statut: statut,
        adresseChantier: body.adresseChantier,
        villeChantier: body.villeChantier,
        dureeEnJours: body.dureeEnJours ? parseInt(body.dureeEnJours) : null,
        clientId: body.clientId || null,
        contactId: body.contactId || null,
        budget: body.budget ? parseFloat(body.budget) : null,
        typeDuree: body.typeDuree || 'CALENDRIER'
      }
    })

    console.log("Chantier mis à jour:", chantier);

    // Générer automatiquement le PPSS mis à jour
    try {
      console.log('Génération automatique du PPSS pour le chantier mis à jour:', chantierId);
      console.log('ID utilisateur pour la génération PPSS:', session.user.id);
      console.log('Données de session complètes:', JSON.stringify(session.user, null, 2));
      
      if (!session.user.id) {
        throw new Error('ID utilisateur non trouvé dans la session');
      }
      
      const ppssUrl = await generatePPSS(chantierId, session.user.id);
      console.log('PPSS mis à jour avec succès, URL:', ppssUrl);
    } catch (ppssError: unknown) {
      // Log l'erreur complète mais ne pas bloquer la mise à jour du chantier
      console.error('Erreur lors de la génération automatique du PPSS:', ppssError);
      console.error('Stack trace:', (ppssError as Error).stack);
      console.error('Message d\'erreur:', (ppssError as Error).message);
      
      // On peut retourner l'erreur dans la réponse pour informer l'utilisateur
      return NextResponse.json({
        ...chantier,
        ppssError: `Chantier mis à jour mais erreur PPSS: ${(ppssError as Error).message}`
      });
    }

    return NextResponse.json(chantier)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du chantier:', error)
    return NextResponse.json(
      { error: `Erreur lors de la mise à jour du chantier: ${error}` },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId] - Supprime un chantier
export async function DELETE(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Vous devez être connecté pour supprimer un chantier' },
        { status: 401 }
      )
    }

    // Vérifier si le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierId }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le chantier
    await prisma.chantier.delete({
      where: { chantierId: chantierId }
    })

    return NextResponse.json(
      { message: 'Chantier supprimé avec succès' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur lors de la suppression du chantier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du chantier' },
      { status: 500 }
    )
  }
} 