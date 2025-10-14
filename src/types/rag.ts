// Types pour le système RAG (Retrieval-Augmented Generation)

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
}

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface EmbeddingResponse {
  embedding: number[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    type: 'chantier' | 'client' | 'commande' | 'etat_avancement' | 'soustraitant' | 'document' | 'note' | 'remarque' | 'materiau' | 'rack' | 'machine' | 'depense' | 'task' | 'choix-client';
    entityId: string;
    entityName: string;
    createdAt?: Date;
    updatedAt?: Date;
    chantierId?: string;
    statut?: string;
    dateVisite?: string;
    nombreChoix?: number;
    source?: string;
  };
  embedding?: number[];
}

export interface RAGQuery {
  question: string;
  userId: string;
  context?: {
    chantierId?: string;
    clientId?: string;
    limit?: number;
  };
}

export interface RAGResponse {
  answer: string;
  sources: DocumentChunk[];
  confidence: number;
  query: string;
  processingTime: number;
}

export interface ChatBotMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  metadata?: {
    ragResponse?: RAGResponse;
    sources?: DocumentChunk[];
  };
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  embeddingModel: string;
  temperature: number;
  maxTokens: number;
}



