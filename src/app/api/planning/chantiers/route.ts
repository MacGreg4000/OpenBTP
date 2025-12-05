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
      // Retourner aussi chantierId et nomChantier pour compatibilité avec TaskModal
      return {
        id: chantier.chantierId,
        chantierId: chantier.chantierId, // Pour compatibilité avec TaskModal
        title: chantier.nomChantier,
        nomChantier: chantier.nomChantier, // Pour compatibilité avec TaskModal
        client: chantier.client?.nom || 'Client non spécifié',
        etat: etatLibelle,
        start,
        end,
        type: 'CHANTIER' // Identifier comme chantier
      }
    })

    // Récupérer les tickets SAV encore à faire (exclure clos, annulés et résolus)
    const ticketsSAV = await prisma.ticketSAV.findMany({
      where: {
        statut: {
          notIn: ['CLOS', 'ANNULE', 'RESOLU'] // Exclure les tickets clos, annulés et résolus
        }
      },
      select: {
        id: true,
        numTicket: true,
        titre: true,
        nomLibre: true,
        statut: true,
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        }
      },
      orderBy: {
        numTicket: 'asc'
      }
    })

    // Transformer les tickets SAV au même format
    const savFormates = ticketsSAV.map(ticket => {
      // Construire le nom d'affichage : numTicket - titre (ou nomLibre si pas de chantier)
      const nomAffiche = ticket.chantier 
        ? `${ticket.numTicket} - ${ticket.titre} (${ticket.chantier.nomChantier})`
        : `${ticket.numTicket} - ${ticket.titre}${ticket.nomLibre ? ` (${ticket.nomLibre})` : ''}`
      
      return {
        id: `SAV-${ticket.id}`, // Préfixe SAV pour identifier
        chantierId: `SAV-${ticket.id}`, // Pour compatibilité avec TaskModal
        title: nomAffiche,
        nomChantier: nomAffiche, // Pour compatibilité avec TaskModal
        client: ticket.chantier?.nomChantier || ticket.nomLibre || 'SAV libre',
        etat: ticket.statut,
        start: null,
        end: null,
        type: 'SAV', // Identifier comme SAV
        savId: ticket.id, // ID original du SAV pour référence
        numTicket: ticket.numTicket // Numéro de ticket pour affichage
      }
    })

    // Combiner chantiers et SAV
    const resultat = [...chantiersFormates, ...savFormates]

    return NextResponse.json(resultat);

  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des chantiers' },
      { status: 500 }
    );
  }
}