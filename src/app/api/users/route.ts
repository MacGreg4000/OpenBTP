import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/users - Liste des utilisateurs (ADMIN uniquement)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Vérification de l'authentification
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Seuls les admins peuvent voir tous les utilisateurs
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer tous les utilisateurs (sauf les BOTs)
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: 'BOT'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    )
  }
}
