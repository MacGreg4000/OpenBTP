import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePPSS } from '@/lib/ppss-generator'
import { notifier } from '@/lib/services/notificationService'

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
      },
      include: {
        client: {
          select: {
            id: true,
            nom: true,
            email: true,
            adresse: true
          }
        },
        contact: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true,
            telephone: true
          }
        }
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
    //
    // Accepte le libellé d'affichage (« En cours ») ET la valeur de base
    // (EN_COURS). L'ancienne conversion ne reconnaissait que les libellés : une
    // valeur de base comme EN_COURS ou TERMINE tombait dans le « sinon » et était
    // réécrite silencieusement en EN_PREPARATION — un chantier terminé pouvait
    // ainsi redevenir « en préparation » par une simple sauvegarde de sa fiche.
    // Une valeur inconnue ne modifie plus le statut du tout (undefined).
    const STATUTS: Record<string, string> = {
      EN_PREPARATION: 'EN_PREPARATION', 'En préparation': 'EN_PREPARATION',
      A_VENIR: 'A_VENIR', 'À venir': 'A_VENIR', 'A venir': 'A_VENIR',
      EN_COURS: 'EN_COURS', 'En cours': 'EN_COURS',
      TERMINE: 'TERMINE', 'Terminé': 'TERMINE',
    }
    const statutBrut = body.statut || body.etatChantier
    const statut = statutBrut ? STATUTS[String(statutBrut).trim()] : undefined

    // Pour la date, on accepte dateCommencement (ancien) ou dateDebut (nouveau)
    const dateDebut = body.dateDebut ? new Date(body.dateDebut) : 
                      body.dateCommencement ? new Date(body.dateCommencement) : null;

    // Récupérer l'ancien statut pour détecter les changements
    const ancienChantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierId },
      select: { statut: true, nomChantier: true },
    })
    const ancienStatut = ancienChantier?.statut

    // Mise à jour du chantier – seuls les champs EXPLICITEMENT fournis dans le body sont modifiés.
    // Cela évite d'écraser des champs (ex: clientId) quand on ne met à jour que le statut.
    const data: Record<string, unknown> = {}

    if (body.nomChantier !== undefined)              data.nomChantier = body.nomChantier
    if (body.numeroIdentification !== undefined)     data.numeroIdentification = body.numeroIdentification || null
    if (dateDebut !== undefined && dateDebut !== null) data.dateDebut = dateDebut
    else if (body.dateDebut === null || body.dateCommencement === null) data.dateDebut = null
    if (statut !== undefined && statut !== null)      data.statut = statut
    if (body.adresseChantier !== undefined)           data.adresseChantier = body.adresseChantier
    if (body.villeChantier !== undefined)             data.villeChantier = body.villeChantier
    if (body.dureeEnJours !== undefined)              data.dureeEnJours = body.dureeEnJours ? parseInt(body.dureeEnJours) : null
    if (body.clientId !== undefined)                  data.clientId = body.clientId || null
    if (body.contactId !== undefined)                 data.contactId = body.contactId || null
    if (body.budget !== undefined)                    data.budget = body.budget ? parseFloat(body.budget) : null
    if (body.typeDuree !== undefined)                 data.typeDuree = body.typeDuree || 'CALENDRIER'
    if (body.maitreOuvrageNom !== undefined)          data.maitreOuvrageNom = body.maitreOuvrageNom || null
    if (body.maitreOuvrageAdresse !== undefined)      data.maitreOuvrageAdresse = body.maitreOuvrageAdresse || null
    if (body.maitreOuvrageLocalite !== undefined)     data.maitreOuvrageLocalite = body.maitreOuvrageLocalite || null
    if (body.bureauArchitectureNom !== undefined)     data.bureauArchitectureNom = body.bureauArchitectureNom || null
    if (body.bureauArchitectureAdresse !== undefined) data.bureauArchitectureAdresse = body.bureauArchitectureAdresse || null
    if (body.bureauArchitectureLocalite !== undefined) data.bureauArchitectureLocalite = body.bureauArchitectureLocalite || null

    const chantier = await prisma.chantier.update({
      where: { chantierId: chantierId },
      data
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

    // 🔔 NOTIFICATIONS : Détecter les changements de statut
    const userName = session.user.name || session.user.email || 'Un utilisateur'
    
    // Notification de modification générale
    await notifier({
      code: 'CHANTIER_MODIFIE',
      rolesDestinataires: ['ADMIN', 'MANAGER'],
      metadata: {
        chantierId: chantier.chantierId,
        chantierNom: chantier.nomChantier,
        userName,
      },
    })

    // Notification spécifique si le chantier démarre
    if (ancienStatut !== 'EN_COURS' && statut === 'EN_COURS') {
      await notifier({
        code: 'CHANTIER_DEMARRE',
        rolesDestinataires: ['ADMIN', 'MANAGER'],
        metadata: {
          chantierId: chantier.chantierId,
          chantierNom: chantier.nomChantier,
          date: dateDebut ? dateDebut.toISOString() : new Date().toISOString(),
        },
      })
    }

    // Notification spécifique si le chantier est terminé
    if (ancienStatut !== 'TERMINE' && statut === 'TERMINE') {
      await notifier({
        code: 'CHANTIER_TERMINE',
        rolesDestinataires: ['ADMIN', 'MANAGER'],
        metadata: {
          chantierId: chantier.chantierId,
          chantierNom: chantier.nomChantier,
        },
      })
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