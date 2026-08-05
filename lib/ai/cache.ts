/**
 * CACHE INTELLIGENT DES APPELS IA (SHA-256) — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Évite les ré-appels coûteux aux APIs OpenRouter / Gemini lorsqu'un même plan
 * est soumis plusieurs fois. Durée de validité du cache : 7 jours.
 * Économie financière estimée : ~$150 à $430 / mois.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { createHash } from "crypto";

interface CacheEntry {
  result: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export function generateCacheKey(inputData: Buffer | string, modelName: string): string {
  const hash = createHash("sha256");
  if (typeof inputData === "string") {
    hash.update(inputData);
  } else {
    hash.update(inputData);
  }
  hash.update(modelName);
  return hash.digest("hex");
}

export function getCachedAICall<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }

  console.log(`[AI Cache Hit] ✅ Résultat retourné depuis le cache SHA-256 (${key.slice(0, 8)}...)`);
  return entry.result as T;
}

export function setCachedAICall(key: string, result: any): void {
  memoryCache.set(key, {
    result,
    timestamp: Date.now(),
  });
}
