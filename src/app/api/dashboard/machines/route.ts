import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/machines - Récupère les données des machines pour le dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer toutes les machines avec leurs prêts
    const machines = await prisma.machine.findMany({
      include: {
        pret: true
      }
    })

    // Récupérer les prêts en cours
    const pretsEnCours = await prisma.pret.findMany({
      where: {
        statut: 'EN_COURS'
      },
      include: {
        machine: true
      },
      orderBy: {
        datePret: 'desc'
      },
      take: 5
    })

    // Date de référence pour calculer le taux d'utilisation (3 derniers mois)
    const troisMoisAvant = new Date()
    troisMoisAvant.setMonth(troisMoisAvant.getMonth() - 3)

    // Transformer les données des machines pour le dashboard
    const machineStats = machines.map(machine => {
      // Calculer le taux d'utilisation basé sur l'historique des prêts
      // Nombre de jours en prêt / nombre de jours totaux sur 3 mois
      let tauxUtilisation = 0
      let joursEnPret = 0
      const joursTotaux = 90 // approximation sur 3 mois
      
      // Calculer les jours de prêt pour chaque prêt de cette machine
      machine.pret.forEach(pret => {
        // Ne considérer que les prêts des 3 derniers mois
        if (pret.datePret >= troisMoisAvant) {
          const dateDebut = new Date(Math.max(pret.datePret.getTime(), troisMoisAvant.getTime()))
          const dateFin = pret.dateRetourEffective || pret.dateRetourPrevue
          const now = new Date()
          
          // Limiter la date de fin à aujourd'hui si le prêt est encore en cours
          const dateFinEffective = pret.statut === 'EN_COURS' 
            ? now 
            : new Date(Math.min(dateFin.getTime(), now.getTime()))
          
          // Calculer la durée du prêt en jours
          const dureePretMs = dateFinEffective.getTime() - dateDebut.getTime()
          const joursDePretsPartiel = dureePretMs / (1000 * 60 * 60 * 24)
          
          joursEnPret += joursDePretsPartiel
        }
      })
      
      // Calculer le taux d'utilisation (limité à 100%)
      tauxUtilisation = Math.min(Math.round((joursEnPret / joursTotaux) * 100), 100)
      
      return {
        id: machine.id,
        nom: machine.nom,
        statut: machine.statut,
        tauxUtilisation
      }
    })

    // Transformer les données des prêts pour le dashboard
    const pretsFormattés = pretsEnCours.map(pret => {
      // Vérifier si le prêt est en retard
      const dateRetourPrevue = new Date(pret.dateRetourPrevue)
      const isLate = dateRetourPrevue < new Date() && !pret.dateRetourEffective
      
      // Formater la date de retour
      const dateRetour = pret.dateRetourPrevue.toLocaleDateString('fr-FR')
      
      return {
        id: pret.id,
        machineName: pret.machine.nom,
        emprunteur: pret.emprunteur,
        dateRetour,
        isLate
      }
    })

    return NextResponse.json({
      machineStats,
      prets: pretsFormattés
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données des machines' },
      { status: 500 }
    )
  }
} 