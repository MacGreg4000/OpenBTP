// API de test pour vérifier le statut RAG
import { NextResponse } from 'next/server';
import { vectorStore } from '@/lib/rag/vector-store';

export async function GET() {
  try {
    console.log('🔍 Vérification du statut RAG...\n');
    
    const allDocs = await vectorStore.getAllDocuments();
    
    const stats = allDocs.reduce((acc, doc) => {
      const type = doc.metadata.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`📊 Total de documents indexés: ${allDocs.length}`);
    console.log('\n📋 Répartition par type:');
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    if (allDocs.length > 0) {
      console.log('\n📝 Exemples de documents:');
      allDocs.slice(0, 3).forEach((doc, i) => {
        console.log(`   ${i + 1}. ${doc.metadata.entityName} (${doc.metadata.type})`);
        console.log(`      Contenu: ${doc.content.substring(0, 100)}...`);
      });
    }

    return NextResponse.json({
      totalDocuments: allDocs.length,
      stats,
      isIndexed: allDocs.length > 0,
      examples: allDocs.slice(0, 3).map(doc => ({
        entityName: doc.metadata.entityName,
        type: doc.metadata.type,
        contentPreview: doc.content.substring(0, 100) + '...'
      }))
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification du statut RAG:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification du statut RAG', details: error.message },
      { status: 500 }
    );
  }
}
