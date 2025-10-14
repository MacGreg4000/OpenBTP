// API de test pour les requêtes RAG
import { NextResponse } from 'next/server';
import { ragService } from '@/lib/rag/rag-service';

export async function POST(request: Request) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json({ error: 'Question requise' }, { status: 400 });
    }

    console.log('🤖 Test de requête RAG:', question);
    
    const query = {
      question: question,
      userId: "test-user"
    };
    
    const response = await ragService.answerQuestion(query);
    
    console.log('📝 Réponse RAG générée:', {
      answerLength: response.answer.length,
      confidence: response.confidence,
      sourcesCount: response.sources.length
    });

    return NextResponse.json({
      question: question,
      answer: response.answer,
      confidence: response.confidence,
      sourcesCount: response.sources.length,
      processingTime: response.processingTime
    });

  } catch (error) {
    console.error('❌ Erreur lors du test RAG:', error);
    return NextResponse.json(
      { error: 'Erreur lors du test RAG', details: error.message },
      { status: 500 }
    );
  }
}
