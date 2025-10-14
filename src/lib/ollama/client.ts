// Client Ollama pour l'API RAG
import { OllamaConfig, OllamaRequest, OllamaResponse, EmbeddingResponse } from '@/types/rag';

interface OllamaModel {
  name: string;
  size?: number;
  digest?: string;
  modified_at?: string;
}

export class OllamaClient {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  // Générer une réponse avec le modèle de chat
  async generateResponse(prompt: string, context?: number[]): Promise<string> {
    try {
      const request: OllamaRequest = {
        model: this.config.model,
        prompt,
        stream: false,
        context,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.maxTokens,
        }
      };

      console.log('🤖 Envoi de la requête à Ollama:', { model: this.config.model, promptLength: prompt.length });

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Erreur Ollama: ${response.status} ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      console.log('✅ Réponse reçue d\'Ollama:', { responseLength: data.response.length, done: data.done });

      return data.response;
    } catch (error) {
      console.error('❌ Erreur lors de la génération avec Ollama:', error);
      throw new Error(`Erreur de génération Ollama: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // Générer des embeddings
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log('🔍 Génération d\'embedding pour:', { textLength: text.length, model: this.config.embeddingModel });

      const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.embeddingModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur embedding Ollama: ${response.status} ${response.statusText}`);
      }

      const data: EmbeddingResponse = await response.json();
      console.log('✅ Embedding généré:', { dimension: data.embedding.length });

      return data.embedding;
    } catch (error) {
      console.error('❌ Erreur lors de la génération d\'embedding:', error);
      throw new Error(`Erreur d'embedding Ollama: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  // Vérifier la santé de l'API
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.warn('⚠️ Ollama API non disponible:', response.status);
        return false;
      }

      const data = await response.json();
      const models = data.models || [];
      const hasMainModel = models.some((model: OllamaModel) => model.name === this.config.model);
      const hasEmbeddingModel = models.some((model: OllamaModel) => model.name === this.config.embeddingModel);

      console.log('🏥 Statut Ollama:', {
        available: true,
        mainModel: hasMainModel ? '✅' : '❌',
        embeddingModel: hasEmbeddingModel ? '✅' : '❌',
        modelsCount: models.length
      });

      return hasMainModel && hasEmbeddingModel;
    } catch (error) {
      console.error('❌ Erreur de santé Ollama:', error);
      return false;
    }
  }

  // Lister les modèles disponibles
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) throw new Error(`Erreur: ${response.status}`);
      
      const data = await response.json();
      return (data.models || []).map((model: OllamaModel) => model.name);
    } catch (error) {
      console.error('❌ Erreur lors du listing des modèles:', error);
      return [];
    }
  }
}

// Instance singleton
let ollamaClient: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  // Force le rechargement si l'URL a changé
  if (!ollamaClient) {
    const envUrl = process.env.OLLAMA_BASE_URL;
    console.log('🔍 Variables d\'environnement:');
    console.log('  - OLLAMA_BASE_URL:', envUrl);
    console.log('  - OLLAMA_MODEL:', process.env.OLLAMA_MODEL);
    
    const config: OllamaConfig = {
      baseUrl: envUrl || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'phi3:mini',
      embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text:latest',
      temperature: 0.7,
      maxTokens: 1000,
    };

    console.log('🔧 Configuration Ollama finale:', { 
      baseUrl: config.baseUrl, 
      model: config.model,
      fromEnv: !!envUrl 
    });
    ollamaClient = new OllamaClient(config);
  }
  return ollamaClient;
}

// Fonction pour forcer le rechargement du client
export function resetOllamaClient(): void {
  ollamaClient = null;
  console.log('🔄 Client Ollama réinitialisé');
}
