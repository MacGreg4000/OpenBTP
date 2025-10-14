import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const bonRegieId = parseInt(id)
    if (isNaN(bonRegieId)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    // Récupérer le bon de régie avec l'ID spécifié
    const bonRegie = await prisma.$queryRaw`
      SELECT * FROM bonRegie WHERE id = ${bonRegieId}
    `

    // Vérifier si le bon de régie existe
    if (!Array.isArray(bonRegie) || bonRegie.length === 0) {
      return NextResponse.json(
        { error: 'Bon de régie non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(bonRegie[0])
  } catch (error) {
    console.error('Erreur lors de la récupération du bon de régie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du bon de régie' },
      { status: 500 }
    )
  }
} 