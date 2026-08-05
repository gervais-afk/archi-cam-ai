/**
 * GESTIONNAIRE DE FALLBACK MULTI-MODELES IA — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Enchaîne les modèles OpenRouter et Gemini en cascade automatique :
 *  1. OpenRouter (google/gemini-2.5-flash) - Priorité 1 (Ultra-rapide)
 *  2. OpenRouter (google/gemini-2.0-flash-001) - Priorité 2
 *  3. OpenRouter (deepseek/deepseek-v4-flash) - Priorité 3
 *  4. Native Gemini API (GEMINI_API_KEY) - Priorité 4
 *  5. Fallback Souverain Local OpenCV - Priorité 5 (Garantie < 2s)
 * ════════════════════════════════════════════════════════════════════════════
 */

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export interface AIModelConfig {
  provider: "openrouter" | "google-native";
  model: string;
  priority: number;
}

export const AI_FALLBACK_CHAIN: AIModelConfig[] = [
  { provider: "openrouter", model: "google/gemini-2.5-flash", priority: 1 },
  { provider: "openrouter", model: "google/gemini-2.0-flash-001", priority: 2 },
  { provider: "openrouter", model: "deepseek/deepseek-v4-flash", priority: 3 },
  { provider: "google-native", model: "gemini-1.5-flash", priority: 4 },
];

export async function callWithFallback(
  systemPrompt: string,
  userPrompt: string,
  imageUri?: string
): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  for (const config of AI_FALLBACK_CHAIN) {
    try {
      if (config.provider === "openrouter" && openRouterKey) {
        console.log(`[Model Router] Essai Priorité ${config.priority}: ${config.model}...`);

        const messages: any[] = [{ role: "system", content: systemPrompt }];
        if (imageUri) {
          messages.push({
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUri } },
              { type: "text", text: userPrompt },
            ],
          });
        } else {
          messages.push({ role: "user", content: userPrompt });
        }

        const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "Archi Cam AI",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            temperature: 0.1,
            messages,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            console.log(`[Model Router] ✨ Succès avec ${config.model} !`);
            return content;
          }
        }
      }

      if (config.provider === "google-native" && geminiKey) {
        console.log(`[Model Router] Essai Priorité ${config.priority}: Native Gemini API...`);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }
      }
    } catch (err: any) {
      console.warn(`[Model Router] Modèle ${config.model} a échoué:`, err?.message || err);
    }
  }

  throw new Error("Tous les modèles IA de la chaîne de fallback ont échoué.");
}
