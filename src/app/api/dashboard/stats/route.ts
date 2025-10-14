import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// Type pour un chantier dans les statistiques
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ChantierStats {
  chantierId: string;
  budget: number | null;
  statut: string;
  createdAt: Date | null;
}

// GET /api/dashboard/stats - Récupère les statistiques pour le dashboard
export async function GET() {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les données des chantiers avec leurs relations
    const chantiers = await prisma.chantier.findMany({
      include: {
        client: {
          select: {
            nom: true,
            adresse: true
          }
        },
        commandes: {
          select: {
            total: true,
            statut: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculer les KPIs
    const totalChantiers = chantiers.length
    const chantiersEnCours = chantiers.filter(c => c.statut === 'EN_COURS').length
    
    // Calculer le chiffre d'affaires total
    const chiffreAffaires = chantiers.reduce((sum, chantier) => {
      const montantCommandes = chantier.commandes
        .filter(commande => commande.statut !== 'BROUILLON')
        .reduce((total, commande) => total + (commande.total || 0), 0)
      return sum + (montantCommandes > 0 ? montantCommandes : (chantier.budget || 0))
    }, 0)

    // Répartition pour le graphique
    const chantiersByCategory = {
      enPreparation: chantiers.filter(c => c.statut === 'EN_PREPARATION').length,
      enCours: chantiersEnCours,
      termines: chantiers.filter(c => c.statut === 'TERMINE').length
    }

    // Mapper les données pour l'affichage
    const chantiersMap = chantiers.map((chantier) => {
      // Conversion des états pour l'affichage
      let etat = 'En préparation'
      if (chantier.statut === 'EN_COURS') etat = 'En cours'
      else if (chantier.statut === 'TERMINE') etat = 'Terminé'
      else if (chantier.statut === 'A_VENIR') etat = 'À venir'

      return {
        id: chantier.id,
        nom: chantier.nomChantier,
        client: chantier.client?.nom || 'Client non spécifié',
        etat,
        adresse: chantier.client?.adresse,
        adresseChantier: chantier.adresseChantier
      }
    })

    const kpis = {
      totalChantiers,
      chantiersEnCours,
      chiffreAffaires,
      tachesEnAttente: 0 // À implémenter plus tard
    }

    return NextResponse.json({
      kpis,
      chantiersByCategory,
      chantiersMap
    })

  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}