/**
 * MONITEUR DE SOLDE OPENROUTER & BASELINE SECU — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie le solde restant du compte OpenRouter et active automatiquement le mode
 * local forcé si le solde descend sous la barre critique de 1.00 USD.
 * ════════════════════════════════════════════════════════════════════════════
 */

export class OpenRouterBalanceMonitor {
  private static isForceLocalModeActive = false;

  public async checkBalance(): Promise<{ balanceUSD: number; forceLocalActive: boolean }> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      OpenRouterBalanceMonitor.isForceLocalModeActive = true;
      return { balanceUSD: 0, forceLocalActive: true };
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        throw new Error(`OpenRouter API Auth response code ${res.status}`);
      }

      const data = await res.json();
      const limit = data?.data?.limit ?? 0;
      const usage = data?.data?.usage ?? 0;
      const remainingBalanceUSD = Math.max(0, limit - usage);

      if (remainingBalanceUSD < 5.0 && remainingBalanceUSD > 1.0) {
        console.warn(`⚠️ [OpenRouter Warning] Solde prépayé faible : $${remainingBalanceUSD.toFixed(2)} USD restants.`);
      }

      if (remainingBalanceUSD <= 1.0) {
        OpenRouterBalanceMonitor.isForceLocalModeActive = true;
        console.error(`🔴 [OpenRouter Critical] Solde <= 1.00$ USD ($${remainingBalanceUSD.toFixed(2)}). Basculement forcé vers OpenCV Local Engine.`);
      } else {
        OpenRouterBalanceMonitor.isForceLocalModeActive = false;
      }

      return {
        balanceUSD: remainingBalanceUSD,
        forceLocalActive: OpenRouterBalanceMonitor.isForceLocalModeActive,
      };
    } catch (err: any) {
      console.warn("[OpenRouter Balance Monitor] Notice on key balance check:", err.message || err);
      return {
        balanceUSD: 10.0, // Baseline fallback
        forceLocalActive: OpenRouterBalanceMonitor.isForceLocalModeActive,
      };
    }
  }

  public static isLocalFallbackForced(): boolean {
    return OpenRouterBalanceMonitor.isForceLocalModeActive;
  }
}
