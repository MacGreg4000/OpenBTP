import { NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Pour l'instant, nous retournons un tableau vide
    // Cela permettra à l'application de fonctionner sans erreur
    // tout en désactivant temporairement cette fonctionnalité
    return NextResponse.json([])
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des documents' },
      { status: 500 }
    )
  }
} 