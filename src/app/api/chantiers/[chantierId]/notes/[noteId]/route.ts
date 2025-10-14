import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string; noteId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    const noteIdStr = params.noteId;
    const noteId = parseInt(noteIdStr, 10)
    
    console.log(`Récupération de la note ${noteId} pour le chantier ${chantierId}`)
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si la note existe
    const note = await prisma.note.findUnique({
      where: {
        id: noteId,
        chantierId: chantierId
      },
      include: {
        User: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!note) {
      console.log(`Erreur: Note ${noteId} non trouvée pour le chantier ${chantierId}`)
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      )
    }

    // Transformer les données pour correspondre à l'interface attendue par le frontend
    const formattedNote = {
      ...note,
      user: note.User
    }

    console.log(`Note ${noteId} récupérée pour le chantier ${chantierId}`)
    return NextResponse.json(formattedNote)
  } catch (error: unknown) {
    console.error('Erreur lors de la récupération de la note:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération de la note',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ chantierId: string; noteId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    const noteIdStr = params.noteId;
    const noteId = parseInt(noteIdStr, 10)
    
    console.log(`Modification de la note ${noteId} pour le chantier ${chantierId}`)
    
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    console.log('Session utilisateur:', {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role
    })

    const { contenu } = await request.json()
    console.log('Nouveau contenu de la note:', contenu)
    
    if (isNaN(noteId)) {
      console.log(`Erreur: ID de note invalide: ${noteIdStr}`)
      return NextResponse.json(
        { error: 'ID de note invalide' },
        { status: 400 }
      )
    }

    // Vérifier si la note existe
    const existingNote = await prisma.note.findUnique({
      where: {
        id: noteId,
        chantierId: chantierId
      }
    })

    if (!existingNote) {
      console.log(`Erreur: Note ${noteId} non trouvée pour le chantier ${chantierId}`)
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si l'utilisateur est l'auteur ou un admin
    const isAdmin = session.user.role === 'ADMIN'
    const isAuthor = existingNote.createdBy === session.user.id

    if (!isAdmin && !isAuthor) {
      console.log(`Erreur: L'utilisateur ${session.user.id} n'est pas autorisé à modifier la note ${noteId}`)
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à modifier cette note' },
        { status: 403 }
      )
    }

    const note = await prisma.note.update({
      where: {
        id: noteId
      },
      data: {
        contenu,
        updatedAt: new Date()
      },
      include: {
        User: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Transformer les données pour correspondre à l'interface attendue par le frontend
    const formattedNote = {
      ...note,
      user: note.User
    }

    console.log('Note modifiée avec succès:', formattedNote)
    return NextResponse.json(formattedNote)
  } catch (error: unknown) {
    console.error('Erreur lors de la modification de la note:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la modification de la note',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ chantierId: string; noteId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    const noteIdStr = params.noteId;
    const noteId = parseInt(noteIdStr, 10)
    
    console.log(`Suppression de la note ${noteId} pour le chantier ${chantierId}`)
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Erreur: Utilisateur non authentifié')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si la note existe
    const note = await prisma.note.findUnique({
      where: {
        id: noteId,
        chantierId: chantierId
      }
    })

    if (!note) {
      console.log(`Erreur: Note ${noteId} non trouvée pour le chantier ${chantierId}`)
      return NextResponse.json(
        { error: 'Note non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier si l'utilisateur est l'auteur ou un admin
    const isAdmin = session.user.role === 'ADMIN'
    const isAuthor = note.createdBy === session.user.id

    if (!isAdmin && !isAuthor) {
      console.log(`Erreur: L'utilisateur ${session.user.id} n'est pas autorisé à supprimer la note ${noteId}`)
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à supprimer cette note' },
        { status: 403 }
      )
    }

    // Supprimer la note
    await prisma.note.delete({
      where: {
        id: noteId
      }
    })

    console.log(`Note ${noteId} supprimée pour le chantier ${chantierId}`)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erreur lors de la suppression de la note:', error)
    return NextResponse.json(
      { 
        error: 'Erreur lors de la suppression de la note',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  }
} 