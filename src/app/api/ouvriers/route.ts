import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET - Récupérer la liste des ouvriers internes
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est manager ou admin
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const ouvriers = await prisma.ouvrierInterne.findMany({
      where: {
        actif: true
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true
      },
      orderBy: [
        { nom: 'asc' },
        { prenom: 'asc' }
      ]
    })

    return NextResponse.json(ouvriers)
  } catch (error) {
    console.error('Erreur lors de la récupération des ouvriers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ouvriers' },
      { status: 500 }
    )
  }
}
