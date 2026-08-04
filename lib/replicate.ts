/**
 * BRIDGE REPLICATE CONTROLNET SDXL — ARCHI CAM AI
 * ────────────────────────────────────────────────
 * Inférence ControlNet SDXL avec timeout 45s et retries résilients.
 */

import { fetchWithRetry } from "@/lib/fetch-retry";

export const REPLICATE_TIMEOUT_MS = 45000; // 45 secondes

export async function generateControlNetWithReplicate(
  controlImageBase64: string,
  masterPrompt: string,
  negativePrompt: string,
  replicateToken: string
): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REPLICATE_TIMEOUT_MS);

  try {
    const repRes = await fetchWithRetry(
      "https://api.replicate.com/v1/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${replicateToken}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          version: "854e8727697a057c525cdb45ab037f64ecca77ed707419e917d59858544f12d5",
          input: {
            image: controlImageBase64 || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80",
            prompt: masterPrompt,
            negative_prompt: negativePrompt,
            controlnet_conditioning_scale: 0.70,
            guidance_scale: 8.5,
            num_inference_steps: 40,
          },
        }),
      },
      3,
      1000,
      "Replicate ControlNet SDXL"
    );

    clearTimeout(timeoutId);

    if (repRes.ok) {
      const repData = await repRes.json();
      const getUrl = repData.urls?.get;

      if (getUrl) {
        for (let i = 0; i < 22; i++) { // Max 44s polling
          await new Promise((r) => setTimeout(r, 2000));
          const pollRes = await fetchWithRetry(
            getUrl,
            { headers: { Authorization: `Token ${replicateToken}` } },
            2,
            500,
            "Replicate Status Poll"
          );

          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === "succeeded" && pollData.output) {
              return Array.isArray(pollData.output) ? pollData.output[0] : pollData.output;
            } else if (pollData.status === "failed") {
              break;
            }
          }
        }
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn(`[Bridge Replicate] Timeout ${REPLICATE_TIMEOUT_MS / 1000}s dépassé sur Replicate ControlNet.`);
    } else {
      console.warn("[Bridge Replicate] Exception Replicate :", err);
    }
  }
  return null;
}
