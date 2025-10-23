import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET - Récupérer une entrée spécifique
export async function GET(
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

    // Vérifier les permissions
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && session.user.id !== entree.ouvrierId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
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
        error: 'Cette entrée n\'est plus supprimable (délai de 48h dépassé)' 
      }, { status: 400 })
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
