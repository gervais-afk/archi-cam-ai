/**
 * CACHE MÉMOIRE DES EMBEDDINGS RAG — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Élimine les appels redondants et les coûts inutiles d'API d'embedding en
 * conservant un cache hashé SHA-256 des vecteurs de textes déjà générés.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "crypto";

const memoryEmbeddingStore = new Map<string, number[]>();

export class EmbeddingCache {
  public async getOrGenerateEmbedding(
    text: string,
    generatorFn: (txt: string) => Promise<number[]>
  ): Promise<number[]> {
    const textHash = createHash("sha256").update(text.trim()).digest("hex");

    if (memoryEmbeddingStore.has(textHash)) {
      return memoryEmbeddingStore.get(textHash)!;
    }

    const vector = await generatorFn(text);

    if (memoryEmbeddingStore.size > 1000) {
      const firstKey = memoryEmbeddingStore.keys().next().value;
      if (firstKey) memoryEmbeddingStore.delete(firstKey);
    }

    memoryEmbeddingStore.set(textHash, vector);
    return vector;
  }
}
