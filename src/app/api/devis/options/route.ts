import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/devis/options - Récupère les options pour les filtres (tous les devis sans pagination)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const devis = await prisma.devis.findMany({
      select: {
        id: true,
        numeroDevis: true,
        montantTTC: true,
        statut: true,
        client: {
          select: {
            id: true,
            nom: true,
            email: true
          }
        }
      },
      orderBy: {
        dateCreation: 'desc'
      }
    })

    return NextResponse.json(devis)
  } catch (error) {
    console.error('Erreur lors de la récupération des options de devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des options de devis' },
      { status: 500 }
    )
  }
}

