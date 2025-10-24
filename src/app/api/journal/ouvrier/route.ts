import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { readPortalSessionFromCookie } from '@/app/public/portail/auth'

// GET - Récupérer le journal d'un ouvrier
export async function GET(request: Request) {
  try {
    // Essayer d'abord l'authentification normale
    const session = await getServerSession(authOptions)
    let isPortalAuth = false
    
    // Si pas de session normale, essayer l'authentification portail
    if (!session) {
      const portalSession = readPortalSessionFromCookie(request.headers.get('cookie'))
      if (portalSession && portalSession.t === 'OUVRIER_INTERNE') {
        isPortalAuth = true
        console.log('🔐 Authentification portail détectée:', portalSession)
      } else {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(request.url)
    const ouvrierId = searchParams.get('ouvrierId')
    const date = searchParams.get('date')
    const mois = searchParams.get('mois') // Format YYYY-MM

    if (!ouvrierId) {
      return NextResponse.json({ error: 'ID ouvrier requis' }, { status: 400 })
    }

    // Vérifier que l'utilisateur est l'ouvrier ou un manager/admin
    if (!isPortalAuth && session && session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && session.user.role !== 'OUVRIER_INTERNE') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const whereClause: any = { ouvrierId }

    if (date) {
      // Journal pour une date spécifique
      whereClause.date = new Date(date)
    } else if (mois) {
      // Journal pour un mois spécifique
      const startDate = new Date(mois + '-01')
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
      whereClause.date = {
        gte: startDate,
        lte: endDate
      }
    }

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
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { heureDebut: 'asc' }
      ]
    })

    return NextResponse.json(journalEntries)
  } catch (error) {
    console.error('Erreur lors de la récupération du journal:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du journal' },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle entrée de journal
export async function POST(request: Request) {
  try {
    // Essayer d'abord l'authentification normale
    const session = await getServerSession(authOptions)
    let isPortalAuth = false
    
    // Si pas de session normale, essayer l'authentification portail
    if (!session) {
      const portalSession = readPortalSessionFromCookie(request.headers.get('cookie'))
      if (portalSession && portalSession.t === 'OUVRIER_INTERNE') {
        isPortalAuth = true
        console.log('🔐 Authentification portail détectée pour POST:', portalSession)
      } else {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
    }

    const body = await request.json()
    console.log('📝 Données reçues pour création journal:', body)
    
    const { 
      ouvrierId, 
      date, 
      heureDebut, 
      heureFin, 
      chantierId, 
      lieuLibre, 
      description, 
      photos 
    } = body

    // Vérifier que l'utilisateur est l'ouvrier ou un manager/admin
    if (!isPortalAuth && session && session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && session.user.role !== 'OUVRIER_INTERNE') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Validation des données
    if (!date || !heureDebut || !heureFin || !description) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (!chantierId && !lieuLibre) {
      return NextResponse.json({ error: 'Chantier ou lieu libre requis' }, { status: 400 })
    }

    // Calculer la date limite de modification (+48h)
    const modifiableJusquA = new Date()
    modifiableJusquA.setHours(modifiableJusquA.getHours() + 48)

    console.log('💾 Création entrée journal avec données:', {
      ouvrierId,
      date: new Date(date),
      heureDebut,
      heureFin,
      chantierId: chantierId || null,
      lieuLibre: lieuLibre || null,
      description,
      modifiableJusquA
    })

    const nouvelleEntree = await prisma.journalOuvrier.create({
      data: {
        ouvrierId,
        date: new Date(date),
        heureDebut,
        heureFin,
        chantierId: chantierId || null,
        lieuLibre: lieuLibre || null,
        description,
        photos: photos ? JSON.stringify(photos) : null,
        modifiableJusquA
      },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        }
      }
    })

    console.log('✅ Entrée journal créée avec succès:', nouvelleEntree.id)
    return NextResponse.json(nouvelleEntree, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de l\'entrée journal:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'entrée' },
      { status: 500 }
    )
  }
}
