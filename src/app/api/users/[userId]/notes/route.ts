import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Récupérer les notes d'un utilisateur
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const userId = params.userId;

    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur demande ses propres notes
    // ou qu'il a les droits d'administration
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    
    // Récupérer les notes de l'utilisateur avec Prisma (sécurisé)
    const userNotes = await prisma.userNotes.findUnique({
      where: { userId },
      select: {
        content: true,
        stickyNotes: true,
        todos: true,
        mode: true,
        updatedAt: true
      }
    })
    
    // Si aucun résultat, renvoyer un contenu vide
    if (!userNotes) {
      return NextResponse.json({ 
        content: '', 
        stickyNotes: [], 
        todos: [], 
        mode: 'notes', 
        updatedAt: null 
      })
    }
    
    // Parser les données JSON stockées
    let stickyNotes = []
    let todos = []
    
    try {
      stickyNotes = userNotes.stickyNotes ? JSON.parse(userNotes.stickyNotes) : []
    } catch (e) {
      console.error('Erreur parsing stickyNotes:', e)
      stickyNotes = []
    }
    
    try {
      todos = userNotes.todos ? JSON.parse(userNotes.todos) : []
    } catch (e) {
      console.error('Erreur parsing todos:', e)
      todos = []
    }

    return NextResponse.json({
      content: userNotes.content,
      stickyNotes,
      todos,
      mode: userNotes.mode || 'notes',
      updatedAt: userNotes.updatedAt,
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des notes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notes' },
      { status: 500 }
    )
  }
}

// Mettre à jour les notes d'un utilisateur
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const userId = params.userId;

    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur modifie ses propres notes
    // ou qu'il a les droits d'administration
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer les données depuis la requête
    const { content, stickyNotes, todos, mode } = await request.json()
    
    if (typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Format de contenu invalide' },
        { status: 400 }
      )
    }

    // Convertir en JSON pour le stockage
    const stickyNotesJson = JSON.stringify(stickyNotes || [])
    const todosJson = JSON.stringify(todos || [])
    const notepadMode = mode || 'notes'

    // Utiliser Prisma pour upsert (sécurisé)
    const updatedNotes = await prisma.userNotes.upsert({
      where: { userId },
      update: {
        content,
        stickyNotes: stickyNotesJson,
        todos: todosJson,
        mode: notepadMode,
        updatedAt: new Date()
      },
      create: {
        userId,
        content,
        stickyNotes: stickyNotesJson,
        todos: todosJson,
        mode: notepadMode
      }
    })

    return NextResponse.json({
      content: updatedNotes.content,
      stickyNotes: JSON.parse(updatedNotes.stickyNotes || '[]'),
      todos: JSON.parse(updatedNotes.todos || '[]'),
      mode: updatedNotes.mode,
      updatedAt: updatedNotes.updatedAt,
    })
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des notes' },
      { status: 500 }
    )
  }
} 