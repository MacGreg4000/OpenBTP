// Client Ollama pour l'API RAG
import { OllamaConfig, OllamaRequest, OllamaResponse, EmbeddingResponse } from '@/types/rag';

interface OllamaModel {
  name: string;
  size?: number;
  digest?: string;
  modified_at?: string;
}

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown> | string;
  };
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
}

export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class ModelToolsUnsupportedError extends Error {
  constructor(model: string) {
    super(`Le modèle ${model} ne supporte pas les outils (tool calling). Utilisez un modèle compatible (ex. gemma4, qwen3).`);
    this.name = 'ModelToolsUnsupportedError';
  }
}

export class OllamaClient {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  get chatModel(): string {
    return process.env.OLLAMA_CHAT_MODEL || this.config.model;
  }

  /**
   * Conversation avec outils (API /api/chat).
   * num_ctx est crucial : le défaut Ollama (4096) tronque silencieusement
   * les résultats d'outils et fait halluciner le modèle.
   */
  async chat(
    messages: OllamaChatMessage[],
    options?: { tools?: OllamaTool[]; timeoutMs?: number; numCtx?: number }
  ): Promise<OllamaChatMessage> {
    const envNumCtx = parseInt(process.env.OLLAMA_CHAT_NUM_CTX || '16384', 10);
    const numCtx = options?.numCtx ?? (Number.isFinite(envNumCtx) ? envNumCtx : 16384);
    const envTimeout = parseInt(process.env.OLLAMA_CHAT_TIMEOUT_MS || '120000', 10);
    const timeoutMs = options?.timeoutMs ?? (Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : 120000);

    const body: Record<string, unknown> = {
      model: this.chatModel,
      messages,
      stream: false,
      options: {
        num_ctx: numCtx,
        temperature: 0.2,
      },
    };
    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
    }

    console.log('💬 Ollama /api/chat:', {
      model: this.chatModel,
      messagesCount: messages.length,
      toolsCount: options?.tools?.length ?? 0,
      numCtx,
    });

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw new Error(`Délai dépassé pour Ollama /api/chat (${timeoutMs} ms). Augmentez OLLAMA_CHAT_TIMEOUT_MS ou utilisez un modèle plus petit.`);
      }
      throw error;
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      if (response.status === 400 && /does not support tools/i.test(errText)) {
        throw new ModelToolsUnsupportedError(this.chatModel);
      }
      throw new Error(`Erreur Ollama /api/chat HTTP ${response.status}: ${errText.slice(0, 500) || response.statusText}`);
    }

    const data = await response.json();
    const message = data?.message as OllamaChatMessage | undefined;
    if (!message || typeof message !== 'object') {
      throw new Error('Réponse Ollama /api/chat invalide : champ message manquant.');
    }
    return message;
  }

  /** Détails d'un modèle (/api/show) — sert à vérifier la capacité "tools". */
  async showModel(name?: string): Promise<{ exists: boolean; capabilities: string[] }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: name || this.chatModel }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) return { exists: false, capabilities: [] };
      const data = await response.json();
      return {
        exists: true,
        capabilities: Array.isArray(data?.capabilities) ? data.capabilities : [],
      };
    } catch {
      return { exists: false, capabilities: [] };
    }
  }

  /**
   * Générer une réponse (API /api/generate).
   * @param options.maxPredict borne la sortie (RAG : préférer une valeur basse sur NAS)
   * @param options.timeoutMs délai fetch (AbortSignal) ; 0 = pas de limite
   */
  async generateResponse(
    prompt: string,
    options?: { context?: number[]; maxPredict?: number; timeoutMs?: number }
  ): Promise<string> {
    try {
      const numPredict =
        typeof options?.maxPredict === 'number' && Number.isFinite(options.maxPredict)
          ? Math.min(8192, Math.max(32, Math.floor(options.maxPredict)))
          : this.config.maxTokens;

      const request: OllamaRequest = {
        model: this.config.model,
        prompt,
        stream: false,
        context: options?.context,
        options: {
          temperature: this.config.temperature,
          num_predict: numPredict,
        },
        think: false,
      };

      const timeoutMs =
        typeof options?.timeoutMs === 'number' && Number.isFinite(options.timeoutMs) && options.timeoutMs > 0
          ? Math.floor(options.timeoutMs)
          : undefined;

      console.log('🤖 Envoi de la requête à Ollama:', {
        model: this.config.model,
        promptLength: prompt.length,
        numPredict,
        timeoutMs: timeoutMs ?? 'illimité',
      });

      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: timeoutMs !== undefined ? AbortSignal.timeout(timeoutMs) : undefined,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Erreur Ollama HTTP ${response.status}: ${errText.slice(0, 500) || response.statusText}`);
      }

      let data: OllamaResponse;
      try {
        data = (await response.json()) as OllamaResponse;
      } catch (e) {
        throw new Error(`Réponse Ollama non JSON (proxy ou coupure réseau ?) : ${e instanceof Error ? e.message : String(e)}`);
      }

      const text =
        typeof data.response === 'string'
          ? data.response
          : data.response != null
            ? String(data.response)
            : '';

      if (!text.trim()) {
        throw new Error(
          `Réponse textuelle Ollama vide (modèle ${this.config.model}, done=${String(data.done)}). Vérifiez la compatibilité du modèle avec /api/generate.`
        );
      }

      console.log('✅ Réponse reçue d\'Ollama:', { responseLength: text.length, done: data.done });

      return text;
    } catch (error) {
      console.error('❌ Erreur lors de la génération avec Ollama:', error);
      if (
        error instanceof Error &&
        (error.name === 'TimeoutError' || error.name === 'AbortError')
      ) {
        throw new Error(
          `Délai dépassé pour Ollama (génération trop longue). Réduisez RAG_NUM_PREDICT ou augmentez RAG_LLM_TIMEOUT_MS.`
        );
      }
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
    
    const maxTokensEnv = process.env.OLLAMA_MAX_TOKENS;
    const maxTokens = maxTokensEnv
      ? Math.max(64, Math.min(8192, parseInt(maxTokensEnv, 10) || 1000))
      : 1000;

    const config: OllamaConfig = {
      baseUrl: envUrl || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'phi3:mini',
      embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text:latest',
      temperature: 0.7,
      maxTokens,
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
