import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { checkJournalEntryAuth } from '@/lib/journalAuth'

// POST - Dévalider une journée de journal
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const entree = await prisma.journalOuvrier.findUnique({
      where: { id }
    })

    if (!entree) {
      return NextResponse.json({ error: 'Entrée non trouvée' }, { status: 404 })
    }

    const auth = await checkJournalEntryAuth(request, entree.ouvrierId)
    if (!auth.allowed) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: auth.status })
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
