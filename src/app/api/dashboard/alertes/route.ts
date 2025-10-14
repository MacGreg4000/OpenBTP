import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/alertes - Récupère les alertes et notifications pour le dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const alertes: Array<{
      id: string;
      type: string;
      message: string;
      date: string;
      severity: string;
    }> = [];
    const today = new Date()

    // 1. Documents des sous-traitants qui expirent bientôt
    const dateExpiration30j = new Date()
    dateExpiration30j.setDate(dateExpiration30j.getDate() + 30)
    
    const documentsExpiration = await prisma.documentouvrier.findMany({
      where: {
        dateExpiration: {
          lte: dateExpiration30j,
          gte: today
        }
      },
      include: {
        ouvrier: {
          include: {
            soustraitant: true
          }
        }
      },
      orderBy: {
        dateExpiration: 'asc'
      }
    })

    // Ajouter les alertes pour les documents qui expirent
    documentsExpiration.forEach(doc => {
      if (doc.dateExpiration) {
        const joursRestants = Math.ceil((doc.dateExpiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        let severity = 'low'
        
        if (joursRestants <= 7) {
          severity = 'high'
        } else if (joursRestants <= 15) {
          severity = 'medium'
        }
        
        alertes.push({
          id: `doc-${doc.id}`,
          type: 'document',
          message: `${doc.nom} de ${doc.ouvrier.prenom} ${doc.ouvrier.nom} (${doc.ouvrier.soustraitant?.nom || 'Sous-traitant inconnu'}) expire dans ${joursRestants} jours`,
          date: doc.dateExpiration.toLocaleDateString('fr-FR'),
          severity
        })
      }
    })

    // 2. Machines en prêt avec retard
    const pretsEnRetard = await prisma.pret.findMany({
      where: {
        statut: 'EN_COURS',
        dateRetourPrevue: {
          lt: today
        }
      },
      include: {
        machine: true
      },
      orderBy: {
        dateRetourPrevue: 'asc'
      }
    })

    // Ajouter les alertes pour les prêts en retard
    pretsEnRetard.forEach(pret => {
      const joursRetard = Math.ceil((today.getTime() - pret.dateRetourPrevue.getTime()) / (1000 * 60 * 60 * 24))
      let severity = 'low'
      
      if (joursRetard > 7) {
        severity = 'high'
      } else if (joursRetard > 3) {
        severity = 'medium'
      }
      
      alertes.push({
        id: `pret-${pret.id}`,
        type: 'pret',
        message: `Retard de ${joursRetard} jours pour le retour de ${pret.machine.nom} emprunté par ${pret.emprunteur}`,
        date: pret.dateRetourPrevue.toLocaleDateString('fr-FR'),
        severity
      })
    })

    // 3. Tâches administratives non complétées
    const tachesAdmin = await prisma.admintask.findMany({
      where: {
        completed: false
      },
      include: {
        chantier: true
      },
      take: 5
    })

    // Ajouter les alertes pour les tâches administratives
    tachesAdmin.forEach(tache => {
      alertes.push({
        id: `tache-${tache.id}`,
        type: 'tache',
        message: `Tâche administrative "${tache.title || tache.taskType}" en attente pour le chantier ${tache.chantier.nomChantier}`,
        date: new Date().toLocaleDateString('fr-FR'),
        severity: 'low'
      })
    })

    // 4. Machines nécessitant une maintenance (statut EN_PANNE ou MANQUE_CONSOMMABLE)
    const machinesProbleme = await prisma.machine.findMany({
      where: {
        OR: [
          { statut: 'EN_PANNE' },
          { statut: 'MANQUE_CONSOMMABLE' }
        ]
      },
      take: 5
    })

    // Ajouter les alertes pour les machines à problème
    machinesProbleme.forEach(machine => {
      const severity = machine.statut === 'EN_PANNE' ? 'high' : 'medium'
      const message = machine.statut === 'EN_PANNE' 
        ? `La machine ${machine.nom} est en panne et nécessite une réparation`
        : `La machine ${machine.nom} manque de consommables`
      
      alertes.push({
        id: `machine-${machine.id}`,
        type: 'machine',
        message,
        date: new Date().toLocaleDateString('fr-FR'),
        severity
      })
    })

    // Trier les alertes par sévérité (high, medium, low)
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
    const sortedAlertes = alertes.sort((a, b) => {
      return severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]
    })

    return NextResponse.json(sortedAlertes.slice(0, 10)) // Limiter à 10 alertes
  } catch (error) {
    console.error('Erreur:', error)
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des alertes' },
      { status: 500 }
    )
  }
}