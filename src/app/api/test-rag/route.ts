// API de test pour l'indexation RAG
import { NextResponse } from 'next/server';
import { ragService } from '@/lib/rag/rag-service';

export async function POST(_request: Request) {
  try {
    console.log('🔄 Test de l\'indexation RAG...\n');
    
    await ragService.indexAllData();
    
    console.log('\n✅ Test terminé');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Indexation test terminée' 
    });

  } catch (error) {
    console.error('❌ Erreur lors du test RAG:', error);
    return NextResponse.json(
      { error: 'Erreur lors du test RAG', details: error.message },
      { status: 500 }
    );
  }
}
