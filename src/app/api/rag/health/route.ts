// API pour vérifier la santé du système RAG
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getOllamaClient } from '@/lib/ollama/client';
import { vectorStore } from '@/lib/rag/vector-store';
import { RAGConversationService } from '@/lib/rag/conversation-service';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('🏥 Vérification de la santé RAG...');

    // Vérifier Ollama
    const ollamaClient = getOllamaClient();
    const ollamaHealthy = await ollamaClient.checkHealth();
    const availableModels = await ollamaClient.listModels();

    // Vérifier le vector store
    const stats = await vectorStore.getStats();
    
    // Obtenir les stats de conversation
    const conversationStats = await RAGConversationService.getConversationStats();
    
    // Ajouter les stats de conversation aux stats du vector store
    const enhancedStats = {
      ...stats,
      conversationStats
    };

    const health = {
      ollama: {
        healthy: ollamaHealthy,
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://secotech.synology.me:11434',
        models: availableModels,
        config: {
          model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
          embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'
        }
      },
      vectorStore: {
        healthy: true,
        stats: enhancedStats
      },
      overall: ollamaHealthy && true // Vector store est toujours healthy
    };

    console.log('✅ Santé RAG:', {
      ollama: ollamaHealthy ? '✅' : '❌',
      vectorStore: '✅',
      totalDocuments: stats.totalDocuments,
      modelsCount: availableModels.length
    });

    return NextResponse.json(health);

  } catch (error) {
    console.error('❌ Erreur vérification santé RAG:', error);
    return NextResponse.json(
      { 
        ollama: { healthy: false, error: error instanceof Error ? error.message : 'Erreur inconnue' },
        vectorStore: { healthy: false, error: error instanceof Error ? error.message : 'Erreur inconnue' },
        overall: false
      },
      { status: 500 }
    );
  }
}
