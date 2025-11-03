import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/notifications/types - Récupérer tous les types de notifications
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const types = await prisma.notificationType.findMany({
      where: { actif: true },
      orderBy: [{ categorie: 'asc' }, { libelle: 'asc' }],
      select: {
        id: true,
        code: true,
        libelle: true,
        description: true,
        categorie: true,
      },
    })

    return NextResponse.json(types)
  } catch (error) {
    console.error('Erreur lors de la récupération des types:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des types de notifications' },
      { status: 500 }
    )
  }
}

