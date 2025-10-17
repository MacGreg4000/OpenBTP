import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/outillage/machines/find?q=XXX - Trouve une machine par son qrCode ou son ID
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json(
        { error: 'Paramètre de recherche manquant' },
        { status: 400 }
      )
    }

    // Chercher la machine par son ID ou son qrCode
    const machine = await prisma.machine.findFirst({
      where: {
        OR: [
          { id: query },
          { qrCode: query },
          // Si c'est un chemin /outillage/XXX, extraire l'ID
          { id: query.replace('/outillage/', '') }
        ]
      }
    })

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(machine)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recherche de la machine' },
      { status: 500 }
    )
  }
}

