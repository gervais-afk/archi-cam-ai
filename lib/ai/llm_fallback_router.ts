/**
 * Routeur de Résilience Multi-Modèles & Fallback Offline (AI Gateway).
 * Aligné avec les spécifications Google SaaS 2026.
 * Redirige automatiquement vers l'instance locale (Google Gemma 4 12B QAT via LM Studio)
 * en cas de déconnexion réseau ou d'indisponibilité de l'API Cloud.
 */

export interface LLMRequestOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
}

export class LLMFallbackRouter {
  private cloudEndpoint: string;
  private localEndpoint: string;
  private localModelName: string;

  constructor() {
    this.cloudEndpoint = "https://generativelanguage.googleapis.com/v1beta";
    this.localEndpoint = process.env.LOCAL_LLM_URL || "http://127.0.0.1:1234/v1";
    this.localModelName = process.env.LOCAL_LLM_MODEL || "google/gemma-4-12b-qat";
  }

  /**
   * Exécute la requête avec basculement automatique sur le modèle local en cas d'erreur.
   */
  async generateTextWithFallback(options: LLMRequestOptions): Promise<{ text: string; modeUsed: "cloud" | "offline-edge" }> {
    const apiKey = process.env.GEMINI_API_KEY;

    // 1. Tentative d'appel Cloud Gemini API
    if (apiKey && apiKey !== "mock-api-key") {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 secondes max

        const res = await fetch(
          `${this.cloudEndpoint}/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: options.prompt }] }],
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            return { text: responseText, modeUsed: "cloud" };
          }
        }
      } catch (cloudErr) {
        console.warn("[AI Fallback Router] Échec/Timeout API Cloud. Bascule sur le modèle local Edge LLM...", cloudErr);
      }
    }

    // 2. Basculement sur l'instance locale Edge LLM (Gemma 4 12B QAT @ LM Studio)
    try {
      const localRes = await fetch(`${this.localEndpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.localModelName,
          messages: [
            ...(options.systemInstruction ? [{ role: "system", content: options.systemInstruction }] : []),
            { role: "user", content: options.prompt },
          ],
          temperature: options.temperature || 0.2,
        }),
      });

      if (localRes.ok) {
        const localData = await localRes.json();
        const localText = localData.choices?.[0]?.message?.content;
        if (localText) {
          return { text: localText, modeUsed: "offline-edge" };
        }
      }
    } catch (localErr) {
      console.error("[AI Fallback Router Error] Indisponibilité du serveur local Edge LLM:", localErr);
    }

    return {
      text: "Mode dégradé : Impossible de contacter l'API Cloud ni l'instance locale Gemma 4.",
      modeUsed: "offline-edge",
    };
  }
}
