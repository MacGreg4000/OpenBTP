// API pour indexer les données RAG
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ragService } from '@/lib/rag/rag-service';
import { vectorStore } from '@/lib/rag/vector-store';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    console.log('📚 Action d\'indexation RAG:', { action, userId: session.user.id });

    switch (action) {
      case 'index-all':
        await ragService.indexAllData();
        return NextResponse.json({ 
          message: 'Indexation complète terminée avec succès',
          action: 'index-all'
        });

      case 'clear':
        await vectorStore.clearStore();
        return NextResponse.json({ 
          message: 'Vector store vidé avec succès',
          action: 'clear'
        });

      case 'stats':
        const stats = await vectorStore.getStats();
        return NextResponse.json({ 
          stats,
          action: 'stats'
        });

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Erreur API RAG index:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'indexation' },
      { status: 500 }
    );
  }
}



