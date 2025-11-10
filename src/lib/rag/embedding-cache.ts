// Cache simple en mémoire pour les embeddings fréquents
// Permet d'éviter de régénérer les embeddings pour les mêmes questions

interface CacheEntry {
  embedding: number[];
  timestamp: number;
  hits: number;
}

export class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100; // Limiter à 100 entrées
  private ttl: number = 3600000; // 1 heure en ms

  // Générer une clé de cache normalisée
  private getCacheKey(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // Obtenir un embedding du cache
  get(text: string): number[] | null {
    const key = this.getCacheKey(text);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Vérifier si l'entrée est expirée
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Incrémenter le compteur de hits
    entry.hits++;
    console.log(`✅ Cache hit pour: "${text.substring(0, 50)}..." (${entry.hits} hits)`);
    
    return entry.embedding;
  }

  // Mettre en cache un embedding
  set(text: string, embedding: number[]): void {
    const key = this.getCacheKey(text);

    // Si le cache est plein, supprimer l'entrée la moins utilisée
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
      hits: 0
    });

    console.log(`💾 Embedding mis en cache: "${text.substring(0, 50)}..." (cache size: ${this.cache.size})`);
  }

  // Supprimer l'entrée la moins utilisée (LFU - Least Frequently Used)
  private evictLeastUsed(): void {
    let minHits = Infinity;
    let leastUsedKey: string | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      console.log(`🗑️ Éviction du cache: entrée avec ${minHits} hits`);
    }
  }

  // Vider le cache
  clear(): void {
    this.cache.clear();
    console.log('🧹 Cache d\'embeddings vidé');
  }

  // Obtenir les statistiques du cache
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ text: string; hits: number; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      text: key.substring(0, 50) + (key.length > 50 ? '...' : ''),
      hits: entry.hits,
      age: Math.round((now - entry.timestamp) / 1000) // en secondes
    }));

    // Calculer le taux de hit (approximatif)
    const totalHits = entries.reduce((sum, e) => sum + e.hits, 0);
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      entries: entries.sort((a, b) => b.hits - a.hits) // Trier par hits
    };
  }

  // Nettoyer les entrées expirées
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} entrées expirées nettoyées du cache`);
    }
  }
}

// Instance singleton
export const embeddingCache = new EmbeddingCache();

// Nettoyer le cache toutes les 10 minutes
if (typeof window === 'undefined') {
  // Seulement côté serveur
  setInterval(() => {
    embeddingCache.cleanup();
  }, 600000); // 10 minutes
}

