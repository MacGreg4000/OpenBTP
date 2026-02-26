import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { checkJournalEntryAuth } from '@/lib/journalAuth'

// GET - Récupérer une entrée spécifique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const entree = await prisma.journalOuvrier.findUnique({
      where: { id },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        },
        ouvrier: {
          select: {
            nom: true,
            prenom: true
          }
        }
      }
    })

    if (!entree) {
      return NextResponse.json({ error: 'Entrée non trouvée' }, { status: 404 })
    }

    const auth = await checkJournalEntryAuth(request, entree.ouvrierId)
    if (auth.allowed === false) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: auth.status })
    }

    return NextResponse.json(entree)
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'entrée:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'entrée' },
      { status: 500 }
    )
  }
}

// PUT - Modifier une entrée
export async function PUT(
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
    if (auth.allowed === false) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: auth.status })
    }

    if (auth.isOwner) {
      const maintenant = new Date()
      if (maintenant > entree.modifiableJusquA) {
        return NextResponse.json({ 
          error: 'Cette entrée n\'est plus modifiable (délai de 48h dépassé)' 
        }, { status: 400 })
      }
    }

    const body = await request.json()
    const { 
      date, 
      heureDebut, 
      heureFin, 
      chantierId, 
      lieuLibre, 
      description, 
      photos 
    } = body

    // Validation des données
    if (!date || !heureDebut || !heureFin || !description) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (!chantierId && !lieuLibre) {
      return NextResponse.json({ error: 'Chantier ou lieu libre requis' }, { status: 400 })
    }

    const entreeModifiee = await prisma.journalOuvrier.update({
      where: { id },
      data: {
        date: new Date(date),
        heureDebut,
        heureFin,
        chantierId: chantierId || null,
        lieuLibre: lieuLibre || null,
        description,
        photos: photos ? JSON.stringify(photos) : null,
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

    return NextResponse.json(entreeModifiee)
  } catch (error) {
    console.error('Erreur lors de la modification de l\'entrée:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la modification de l\'entrée' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une entrée
export async function DELETE(
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
    if (auth.allowed === false) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: auth.status })
    }

    if (auth.isOwner) {
      const maintenant = new Date()
      if (maintenant > entree.modifiableJusquA) {
        return NextResponse.json({ 
          error: 'Cette entrée n\'est plus supprimable (délai de 48h dépassé)' 
        }, { status: 400 })
      }
    }

    await prisma.journalOuvrier.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'entrée:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'entrée' },
      { status: 500 }
    )
  }
}
