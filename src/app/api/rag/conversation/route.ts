// API pour gérer les conversations RAG
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { RAGConversationService } from '@/lib/rag/conversation-service';

// GET - Charger la conversation de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const conversation = await RAGConversationService.loadUserConversation(session.user.id);
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Erreur lors du chargement de la conversation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Sauvegarder un message dans la conversation
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message || !message.type || !message.content) {
      return NextResponse.json({ error: 'Message invalide' }, { status: 400 });
    }

    await RAGConversationService.addMessage(session.user.id, message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE - Effacer la conversation de l'utilisateur
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await RAGConversationService.clearUserConversation(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de l\'effacement de la conversation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}



