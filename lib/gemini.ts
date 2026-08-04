/**
 * BRIDGE GEMINI VISION ENGINE — ARCHI CAM AI
 * ──────────────────────────────────────────
 * Génération et analyse multimodale via Gemini 2.5 Flash avec timeout 45s.
 */

import { fetchWithRetry } from "@/lib/fetch-retry";

export const GEMINI_TIMEOUT_MS = 45000; // 45 secondes

export async function generateContentWithGemini(
  inputMime: string,
  rawPlanBase64: string,
  masterPrompt: string,
  geminiApiKey: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const geminiRes = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: inputMime,
                    data: rawPlanBase64,
                  },
                },
                {
                  text: masterPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      },
      3,
      1000,
      "Google Gemini 2.5 Flash API"
    );

    clearTimeout(timeoutId);

    if (geminiRes.ok) {
      const gemData = await geminiRes.json();
      const parts = gemData.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        if (p.inlineData && p.inlineData.data) {
          return p.inlineData.data; // Base64 data
        }
      }
    }
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    if (fetchErr.name === "AbortError") {
      console.warn(`[Bridge Gemini] Timeout ${GEMINI_TIMEOUT_MS / 1000}s dépassé sur Gemini Vision, basculement vers ControlNet...`);
    } else {
      throw fetchErr;
    }
  }
  return null;
}
