import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/evolution - Récupère l'évolution du CA et des dépenses sur 12 mois
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Calculer les dates pour les 12 derniers mois
    const derniersMois = []
    const dateActuelle = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(dateActuelle)
      date.setMonth(dateActuelle.getMonth() - i)
      
      const mois = date.toLocaleString('fr-FR', { month: 'short' })
      const annee = date.getFullYear()
      
      derniersMois.push({
        label: `${mois} ${annee}`,
        debut: new Date(date.getFullYear(), date.getMonth(), 1),
        fin: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
      })
    }

    // Récupérer les données de CA par mois basé sur les états d'avancement validés
    const donneesCA = await Promise.all(
      derniersMois.map(async (mois) => {
        try {
          // Rechercher les états d'avancement validés dans le mois
          const etatsAvancement = await prisma.etatAvancement.findMany({
            where: {
              date: {
                gte: mois.debut,
                lte: mois.fin
              },
              estFinalise: true
            },
            include: {
              lignes: true
            }
          })
          
          // Calculer le montant total des états d'avancement
          const montantTotal = etatsAvancement.reduce((total, etat) => {
            const montantEtat = etat.lignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0)
            return total + montantEtat
          }, 0)
          
          return montantTotal
        } catch (error) {
          console.error(`Erreur lors de la récupération des données pour ${mois.label}:`, error)
          return 0
        }
      })
    )

    // Récupérer les données de dépenses par mois
    const donneesDépenses = await Promise.all(
      derniersMois.map(async (mois) => {
        try {
          const depensesMois = await prisma.depense.aggregate({
            where: {
              date: {
                gte: mois.debut,
                lte: mois.fin
              }
            },
            _sum: {
              montant: true
            }
          })
          
          return depensesMois._sum.montant || 0
        } catch (error) {
          console.error(`Erreur lors de la récupération des dépenses pour ${mois.label}:`, error)
          return 0
        }
      })
    )

    // Formater les données pour le graphique
    const donnéesGraphique = {
      labels: derniersMois.map(mois => mois.label),
      datasets: [
        {
          label: 'Chiffre d\'affaires',
          data: donneesCA,
          borderColor: '#3B82F6', // blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true
        },
        {
          label: 'Dépenses',
          data: donneesDépenses,
          borderColor: '#EF4444', // red-500
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true
        }
      ]
    }

    return NextResponse.json(donnéesGraphique)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données d\'évolution' },
      { status: 500 }
    )
  }
} 