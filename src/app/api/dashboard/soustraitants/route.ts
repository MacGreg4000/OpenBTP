import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/soustraitants - Récupère les données des sous-traitants pour le dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer tous les sous-traitants avec leurs commandes et états d'avancement
    const soustraitants = await prisma.soustraitant.findMany({
      include: {
        commandes: true,
        soustraitant_etat_avancement: true
      }
    })

    // Transformer les données pour le dashboard
    const soustraitantsFormattés = soustraitants.map(soustraitant => {
      // Calculer le montant total engagé pour ce sous-traitant
      const montantEngage = soustraitant.commandes.reduce(
        (total, commande) => total + (commande.total || 0), 
        0
      )
      
      // Calculer le nombre d'états d'avancement en attente
      const etatsEnAttente = soustraitant.soustraitant_etat_avancement.filter(
        etat => !etat.estFinalise
      ).length
      
      // Calculer un score de performance (simulé pour l'exemple)
      // Dans un cas réel, cela pourrait être basé sur le respect des délais, la qualité, etc.
      // Ici, nous générons une valeur aléatoire entre 60 et 100
      const performance = Math.floor(Math.random() * 40) + 60
      
      return {
        id: soustraitant.id,
        nom: soustraitant.nom,
        montantEngage,
        etatsEnAttente,
        performance
      }
    })

    return NextResponse.json(soustraitantsFormattés)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données des sous-traitants' },
      { status: 500 }
    )
  }
} 