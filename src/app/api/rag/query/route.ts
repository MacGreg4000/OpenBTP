// API pour les requêtes RAG
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ragService } from '@/lib/rag/rag-service';
import { RAGQuery } from '@/types/rag';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { question, context } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question requise' }, { status: 400 });
    }

    const ragQuery: RAGQuery = {
      question: question.trim(),
      userId: session.user.id,
      context
    };

    console.log('🤖 Requête RAG reçue:', {
      userId: session.user.id,
      question: ragQuery.question,
      context
    });

    const response = await ragService.answerQuestion(ragQuery);

    console.log('✅ Réponse RAG générée:', {
      answerLength: response.answer.length,
      sourcesCount: response.sources.length,
      confidence: response.confidence,
      processingTime: response.processingTime
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Erreur API RAG query:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la question' },
      { status: 500 }
    );
  }
}



