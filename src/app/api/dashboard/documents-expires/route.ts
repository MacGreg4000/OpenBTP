import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/dashboard/documents-expires
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Date actuelle
    const now = new Date()
    
    // Date dans 30 jours
    const inOneMonth = new Date()
    inOneMonth.setDate(now.getDate() + 30)

    // Récupérer les documents expirés ou qui vont expirer dans les 30 jours
    const documents = await prisma.documentOuvrier.findMany({
      where: {
        dateExpiration: {
          not: null,
          lte: inOneMonth // Less than or equal to one month from now
        }
      },
      include: {
        Ouvrier: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            sousTraitantId: true
          }
        }
      },
      orderBy: {
        dateExpiration: 'asc'
      }
    })

    // Pour chaque document, récupérer les informations du sous-traitant
    const documentsWithSoustraitant = await Promise.all(
      documents.map(async (doc) => {
        const soustraitant = await prisma.soustraitant.findUnique({
          where: { id: doc.Ouvrier.sousTraitantId },
          select: { id: true, nom: true }
        }) || { id: doc.Ouvrier.sousTraitantId, nom: 'Inconnu' }; // Valeur par défaut si le sous-traitant n'existe pas

        // Déterminer si le document est expiré ou va expirer bientôt
        const isExpired = doc.dateExpiration && new Date(doc.dateExpiration) < now
        const expiresInDays = doc.dateExpiration 
          ? Math.ceil((new Date(doc.dateExpiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null

        return {
          ...doc,
          soustraitant,
          isExpired,
          expiresInDays
        }
      })
    )

    return NextResponse.json(documentsWithSoustraitant)
  } catch (error) {
    console.error('Erreur lors de la récupération des documents expirés:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents expirés' },
      { status: 500 }
    )
  }
} 