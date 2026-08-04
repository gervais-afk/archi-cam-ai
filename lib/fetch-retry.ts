/**
 * HELPER FETCH WITH RETRY & EXPONENTIAL BACKOFF — ARCHI CAM AI
 * ────────────────────────────────────────────────────────────
 * Résilience réseau contre les micro-coupures DNS (ENOTFOUND, ECONNRESET, ETIMEDOUT).
 */

export async function fetchWithRetry(
  input: string | URL | Request,
  init?: RequestInit,
  retries: number = 3,
  delayMs: number = 1000,
  label: string = "API Externe"
): Promise<Response> {
  let attempt = 0;

  while (attempt < retries) {
    attempt++;
    try {
      const response = await fetch(input, init);
      
      // Si la réponse HTTP est 502/503/504 (Erreur serveur temporaire), on réessaie
      if (response.status >= 502 && response.status <= 504 && attempt < retries) {
        console.warn(`[Retry System ⚠️] Code HTTP ${response.status} pour ${label}. Tentative ${attempt}/${retries} dans ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
        continue;
      }

      return response;
    } catch (error: any) {
      const isNetworkError =
        error?.code === "ENOTFOUND" ||
        error?.code === "ECONNRESET" ||
        error?.code === "ETIMEDOUT" ||
        error?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error?.cause?.code === "ENOTFOUND" ||
        error?.cause?.code === "ECONNRESET" ||
        error?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error?.name === "AbortError" ||
        error?.type === "aborted" ||
        error?.message?.includes("fetch failed") ||
        error?.message?.includes("network error") ||
        error?.message?.includes("Connect Timeout");

      if (attempt < retries && isNetworkError) {
        console.warn(
          `[Retry System 🔄] Micro-coupure réseau/DNS (${error?.code || error?.message}) pour ${label}. Tentative ${attempt}/${retries} dans ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff (1s, 2s, 4s...)
      } else {
        console.error(`[Retry System ❌] Échec définitif pour ${label} après ${attempt} tentative(s) :`, error?.message || error);
        throw error;
      }
    }
  }

  throw new Error(`[Retry System] Échec de la requête vers ${label} après ${retries} tentatives.`);
}
