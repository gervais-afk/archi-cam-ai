/**
 * BRIDGE CONTROLNET REPLICATE — ARCHI CAM AI
 * ──────────────────────────────────────────
 * Exécute la prédiction sur `POST /v1/models/lucataco/sdxl-controlnet/predictions`
 * avec support complet des Data URIs (Base64) et sans besoin d'imposer un hash de version.
 */

export const PROMPT_3D_FLOORPLAN_PHOTOREALISTIC = `
Professional 3D floor plan render, top-down aerial view, photorealistic architectural visualization, fully furnished house plan. 
MATERIALS: warm honey oak parquet flooring in living areas and bedrooms, white marble large-format tiles in kitchen and bathrooms, red terracotta cobblestone pavers on the driveway, smooth light concrete on veranda.
FURNITURE: realistic 3D furniture viewed from directly above — beds with white duvets and pillows, mahogany dining table with 6 chairs, grey fabric sofas around a coffee table, round woven rattan rug with red armchairs, red car parked on cobblestone driveway, lush green potted plants on veranda corners.
LIGHTING: soft ambient occlusion shadows under walls and furniture, subtle drop shadows, warm natural daylight, high-end real estate marketing render quality.
STYLE: dark anthracite walls (#1E293B), white dimension labels with room names and square meters in French (chambre, séjour, cuisine, toilette, véranda), architectural title block at bottom.
8k, ultra detailed, professional floor plan render, real estate quality
`.trim();

export const NEGATIVE_PROMPT_3D = `
blurry, low quality, distorted, deformed furniture, perspective view, 3/4 angle, isometric, hand-drawn, sketch, watercolor, white background, empty rooms, unfurnished, text errors, watermark, cropped
`.trim();

export async function callControlNetBridge(params: {
  prompt: string;
  cannyImage: string; // Data URI (data:image/png;base64,...) obligatoire, jamais d'URL localhost
  depthImage?: string;
  negativePrompt?: string;
  apiToken: string;
}): Promise<string> {
  const { prompt, cannyImage, depthImage, negativePrompt, apiToken } = params;

  console.log("[Bridge ControlNet] 📤 Initialisation de la prédiction ControlNet SDXL...");
  console.log(`[Bridge ControlNet] Canny Input (Data URI): ${cannyImage.substring(0, 60)}...`);
  if (depthImage) {
    console.log(`[Bridge ControlNet] Depth Input (Data URI): ${depthImage.substring(0, 60)}...`);
  }

  const inputPayload: Record<string, any> = {
    prompt: prompt || PROMPT_3D_FLOORPLAN_PHOTOREALISTIC,
    image: cannyImage,
    negative_prompt: negativePrompt ?? NEGATIVE_PROMPT_3D,
    num_inference_steps: 40,
    guidance_scale: 8.0,
    controlnet_conditioning_scale: 0.9,
    seed: Math.floor(Math.random() * 1000000),
  };

  // Endpoint Replicate officiel ControlNet Canny
  const endpoint = "https://api.replicate.com/v1/models/jagilley/controlnet-canny/predictions";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: inputPayload,
    }),
  });

  const rawText = await res.text();

  if (!res.ok) {
    if (res.status === 402 || rawText.includes("Insufficient credit")) {
      console.warn("[Bridge ControlNet] 💸 Solde Replicate insuffisant (HTTP 402: Insufficient credit). Veuillez recharger votre compte Replicate sur https://replicate.com/account/billing.");
      throw new Error(`Replicate: Solde insuffisant (HTTP 402) — ${rawText}`);
    }
    console.error(`[Bridge ControlNet] ❌ Erreur création prédiction (${res.status}):`, rawText);
    throw new Error(`Replicate prediction creation failed: ${res.status} — ${rawText}`);
  }

  let prediction: any;
  try {
    prediction = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Replicate: réponse JSON invalide — ${rawText}`);
  }

  if (!prediction?.id) {
    throw new Error(`Replicate: prediction.id manquant — ${rawText}`);
  }

  console.log(`[Bridge ControlNet] ⏳ Prédiction créée avec succès ID: ${prediction.id}. Attente du résultat...`);

  let attempts = 0;
  const maxAttempts = 45; // 45 * 2s = 90s max

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;

    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        "Authorization": `Token ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!pollRes.ok) {
      console.warn(`[Bridge ControlNet] Notice lors du polling status (${pollRes.status}), nouvelle tentative...`);
      continue;
    }

    const pollData = await pollRes.json();
    const status = pollData.status;

    if (status === "succeeded") {
      const output = pollData.output;
      let finalUrl = "";
      if (Array.isArray(output) && output.length > 0) {
        finalUrl = output[0];
      } else if (typeof output === "string") {
        finalUrl = output;
      }

      if (finalUrl) {
        console.log(`[Bridge ControlNet] ✨ Prédiction terminée avec succès ! Output: ${finalUrl}`);
        return finalUrl;
      }
      throw new Error("Replicate: statut 'succeeded' mais aucune URL d'image dans la réponse.");
    }

    if (status === "failed" || status === "canceled") {
      const errorMsg = pollData.error || `Statut ${status}`;
      console.error(`[Bridge ControlNet] ❌ Prédiction échouée (${status}):`, errorMsg);
      throw new Error(`Replicate prediction ${status}: ${errorMsg}`);
    }

    if (attempts % 5 === 0) {
      console.log(`[Bridge ControlNet] ⏳ Statut en cours (${status})... Tentative ${attempts}/${maxAttempts}`);
    }
  }

  throw new Error("Replicate: Délai d'attente (timeout 90s) dépassé pour la génération ControlNet.");
}
