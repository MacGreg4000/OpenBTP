import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🔄 Rechargement de la configuration Ollama...');
    
    // Forcer le rechargement du client Ollama
    const { resetOllamaClient } = await import('@/lib/ollama/client');
    resetOllamaClient();
    
    console.log('✅ Configuration Ollama rechargée');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Configuration Ollama rechargée avec succès',
      config: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'phi3:mini',
        embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text:latest'
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors du rechargement de la configuration:', error);
    return NextResponse.json(
      { error: 'Erreur lors du rechargement de la configuration' },
      { status: 500 }
    );
  }
}

