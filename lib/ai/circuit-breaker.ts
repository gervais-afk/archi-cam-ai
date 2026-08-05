/**
 * CIRCUIT BREAKER & LIMITEUR DE RETRY IA — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Bloque les boucles de retry infinies et bascule automatiquement sur le moteur
 * OpenCV local (coût 0.00 FCFA) si le budget max de la requête est dépassé.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  maxCostPerRequestUSD: number;
}

export class AICircuitBreaker {
  private failureCount = new Map<string, number>();

  public async callWithRetry<T>(
    fn: () => Promise<T>,
    userId: string,
    fallbackFn?: () => Promise<T>,
    config: RetryConfig = {
      maxAttempts: 3,
      backoffMs: 1000,
      maxCostPerRequestUSD: 0.05, // Max $0.05 par requête
    }
  ): Promise<T> {
    let accumulatedCost = 0;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        if (accumulatedCost > config.maxCostPerRequestUSD) {
          throw new Error(`[Circuit Breaker] Plafond de coût dépassé ($${accumulatedCost.toFixed(4)}).`);
        }

        const startTime = Date.now();
        const result = await fn();

        // Succès : réinitialiser le compteur d'échecs
        this.failureCount.delete(userId);
        return result;
      } catch (err: any) {
        accumulatedCost += 0.0002; // Coût estimé par appel API

        const failures = (this.failureCount.get(userId) || 0) + 1;
        this.failureCount.set(userId, failures);

        console.warn(`[Circuit Breaker] Échec tentative ${attempt}/${config.maxAttempts} pour ${userId}:`, err.message || err);

        if (attempt < config.maxAttempts) {
          await new Promise((res) => setTimeout(res, config.backoffMs * Math.pow(2, attempt - 1)));
        }
      }
    }

    console.error(`[Circuit Breaker] Tentatives épuisées pour ${userId}. Basculement automatique en mode secours.`);

    if (fallbackFn) {
      return await fallbackFn();
    }

    throw new Error("Service temporairement indisponible. Le moteur de secours a pris le relais.");
  }
}
