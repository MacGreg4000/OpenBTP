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

    // Calculer les 12 derniers mois (basé sur la période "mois" des états d'avancement)
    const MOIS_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    const derniersMois = []
    const dateActuelle = new Date()
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(dateActuelle.getFullYear(), dateActuelle.getMonth() - i, 1)
      
      const moisCourt = date.toLocaleString('fr-FR', { month: 'short' })
      const annee = date.getFullYear()
      const moisPeriode = `${MOIS_NAMES[date.getMonth()]} ${annee}`
      
      derniersMois.push({
        label: `${moisCourt} ${annee}`,
        moisPeriode,
        debut: new Date(date.getFullYear(), date.getMonth(), 1),
        fin: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
      })
    }

    // Récupérer les données de CA par mois basé sur le champ période (mois) des états d'avancement
    const donneesCA = await Promise.all(
      derniersMois.map(async (mois) => {
        try {
          const etatsAvancement = await prisma.etatAvancement.findMany({
            where: {
              mois: mois.moisPeriode
            },
            include: {
              lignes: true,
              avenants: true
            }
          })
          
          const montantTotal = etatsAvancement.reduce((total, etat) => {
            const montantLignes = etat.lignes.reduce((sum, ligne) => {
              const valeur = Number((ligne as { montantActuel?: number | null }).montantActuel ?? 0)
              return sum + (isNaN(valeur) ? 0 : valeur)
            }, 0)
            const montantAvenants = etat.avenants.reduce((sum, avenant) => {
              const valeur = Number((avenant as { montantActuel?: number | null }).montantActuel ?? 0)
              return sum + (isNaN(valeur) ? 0 : valeur)
            }, 0)
            return total + montantLignes + montantAvenants
          }, 0)
          
          return isNaN(montantTotal) ? 0 : montantTotal
        } catch (error) {
          console.error(`Erreur lors de la récupération des données pour ${mois.label}:`, error)
          return 0
        }
      })
    )

    // Récupérer les données de dépenses par mois (les dépenses restent filtrées par date)
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
          
          const montant = Number(depensesMois._sum.montant ?? 0)
          return isNaN(montant) ? 0 : montant
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