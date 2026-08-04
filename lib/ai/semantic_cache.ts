/**
 * Cache Sémantique Vectoriel (Inspiré de RedisVL / Redis LangCache).
 * Intercepte les requêtes utilisateur identiques ou sémantiquement similaires (Distance Cosinus <= 0.05).
 * Restitue la réponse en < 10 ms sans consommer aucun token LLM API.
 */

export interface CacheEntry {
  query: string;
  embedding: number[];
  response: string;
  timestamp: number;
}

export class SemanticCacheEngine {
  private cache: CacheEntry[] = [];
  private similarityThreshold: number;

  constructor(similarityThreshold: number = 0.05) {
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Calcul de la distance cosinus entre deux vecteurs d'embedding
   */
  private cosineDistance(vecA: number[], vecB: number[]): number {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 1.0;
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return 1.0 - similarity; // Distance cosinus
  }

  /**
   * Tente de récupérer une réponse en cache sémantique
   */
  findMatch(queryEmbedding: number[]): { hit: boolean; response?: string; distance?: number } {
    for (const entry of this.cache) {
      const distance = this.cosineDistance(queryEmbedding, entry.embedding);
      if (distance <= this.similarityThreshold) {
        return {
          hit: true,
          response: entry.response,
          distance
        };
      }
    }
    return { hit: false };
  }

  /**
   * Enregistre une nouvelle réponse dans le cache sémantique
   */
  saveEntry(query: string, embedding: number[], response: string) {
    this.cache.push({
      query,
      embedding,
      response,
      timestamp: Date.now()
    });
  }
}
