import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ soustraitantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les paramètres de l'URL
    const { soustraitantId } = await context.params

    if (!soustraitantId) {
      return NextResponse.json(
        { error: 'ID du sous-traitant manquant' },
        { status: 400 }
      )
    }

    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id: soustraitantId }
    })

    if (!soustraitant) {
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(soustraitant)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du sous-traitant' },
      { status: 500 }
    )
  }
} 