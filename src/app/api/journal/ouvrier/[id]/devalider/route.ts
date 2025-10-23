import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST - Dévalider une journée de journal
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const entree = await prisma.journalOuvrier.findUnique({
      where: { id }
    })

    if (!entree) {
      return NextResponse.json({ error: 'Entrée non trouvée' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est l'ouvrier ou un manager/admin
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && session.user.role !== 'OUVRIER_INTERNE') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Vérifier si l'entrée est encore modifiable (48h)
    const maintenant = new Date()
    if (maintenant > entree.modifiableJusquA) {
      return NextResponse.json({ 
        error: 'Cette entrée n\'est plus modifiable (délai de 48h dépassé)' 
      }, { status: 400 })
    }

    const entreeDevalidee = await prisma.journalOuvrier.update({
      where: { id },
      data: {
        estValide: false,
        updatedAt: new Date()
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

    return NextResponse.json(entreeDevalidee)
  } catch (error) {
    console.error('Erreur lors de la dévalidation de l\'entrée:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la dévalidation de l\'entrée' },
      { status: 500 }
    )
  }
}
