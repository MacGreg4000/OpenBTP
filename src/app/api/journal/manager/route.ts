import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET - Récupérer le journal pour les managers
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est manager ou admin
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const ouvrierId = searchParams.get('ouvrierId')
    const mois = searchParams.get('mois') // Format YYYY-MM

    console.log('🔍 Filtres reçus:', { ouvrierId, mois })

    const whereClause: any = {}

    if (ouvrierId) {
      whereClause.ouvrierId = ouvrierId
    }

    if (mois) {
      const startDate = new Date(mois + '-01')
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
      whereClause.date = {
        gte: startDate,
        lte: endDate
      }
      console.log('📅 Filtre mois appliqué:', { startDate, endDate })
    }

    console.log('🔍 Where clause final:', whereClause)

    const journalEntries = await prisma.journalOuvrier.findMany({
      where: whereClause,
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        },
        ouvrier: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { heureDebut: 'asc' }
      ]
    })

    // Grouper par ouvrier et par date pour faciliter l'affichage
    const groupedEntries = journalEntries.reduce((acc: any, entry) => {
      const key = `${entry.ouvrierId}-${entry.date.toISOString().split('T')[0]}`
      if (!acc[key]) {
        acc[key] = {
          ouvrier: entry.ouvrier,
          date: entry.date,
          estValide: entry.estValide,
          entries: []
        }
      }
      acc[key].entries.push(entry)
      return acc
    }, {})

    return NextResponse.json(Object.values(groupedEntries))
  } catch (error) {
    console.error('Erreur lors de la récupération du journal manager:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du journal' },
      { status: 500 }
    )
  }
}
