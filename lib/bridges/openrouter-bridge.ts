/**
 * UNIFIED OPENROUTER BRIDGE — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Bridge unique utilisant l'API OpenRouter (https://openrouter.ai/api/v1)
 *
 * 1. extractPlanMetadata(imageBase64) : Extraction VLM ultra-rapide (< 1.5s)
 *    de la structure JSON des pièces (google/gemini-2.5-flash)
 *
 * 2. generateArchitecturalRender(imageBase64Mask, prompt) : Rendu d'image HD
 *    photoréaliste à partir du masque OpenCV nettoyé (sans lignes de cahier)
 *
 * OPTIMISATION PAYLOAD (RISQUE 3) : Les images Base64 sont redimensionnées
 * via smartResizeBase64() (Lanczos3 + sharpen, max 1024px) avant envoi
 * pour éviter les erreurs "fetch failed" sur les payloads lourds.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { smartResizeBase64 } from "@/lib/image/smart-resize";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

function getOpenRouterHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  return {
    "Authorization": `Bearer ${apiKey}`,
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "Archi Cam AI",
    "Content-Type": "application/json",
  };
}

export interface PlanRoom {
  name: string;
  surface_m2: number;
  type: string;
}

export interface PlanMetadataResult {
  rooms: PlanRoom[];
  totalSurface: number;
  roomCount: number;
  rawText?: string;
}

/**
 * Robust JSON parser for AI outputs
 */
function parseStrictJson<T>(rawText: string): T | null {
  try {
    let cleaned = rawText.trim();
    const mdMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
    if (mdMatch) cleaned = mdMatch[1].trim();

    const startIdx = cleaned.search(/[{\[]/);
    if (startIdx >= 0) cleaned = cleaned.substring(startIdx);

    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/**
 * Wrapper local : délègue à smartResizeBase64 (Lanczos3 + sharpen).
 * Conservé pour rétro-compatibilité avec les appels existants dans ce fichier.
 */
async function resizeBase64ImageForCloud(base64: string): Promise<string> {
  return smartResizeBase64(base64, { maxDimension: 1024, preserveText: true, quality: 85 });
}

/**
 * ÉTAPE 1.A : Extraction des métadonnées du plan (< 1.5s)
 * Modèle : google/gemini-2.5-flash via OpenRouter
 * NOTE : L'image est redimensionnée à 1024×1024 JPEG q=80 avant envoi
 * pour éviter les erreurs "fetch failed" sur les payloads Base64 lourds.
 */
export async function extractPlanMetadata(imageBase64: string): Promise<PlanMetadataResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    console.warn("[OpenRouter Bridge] OPENROUTER_API_KEY absente. Métadonnées par défaut.");
    return { rooms: [], totalSurface: 0, roomCount: 0 };
  }

  // ── OPTIMISATION PAYLOAD : resize 1024×1024 JPEG q=80 avant envoi ──────────
  const imageUri = await resizeBase64ImageForCloud(
    imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`
  );

  const prompt = `Analyse ce plan d'architecte et extrais les pièces sous forme de tableau JSON strict.
Structure attendue :
{
  "rooms": [
    { "name": "Salon", "surface_m2": 24.5, "type": "living" },
    { "name": "Chambre 1", "surface_m2": 14.0, "type": "bedroom" }
  ],
  "totalSurface": 98.5,
  "roomCount": 5
}`;

  try {
    const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: "POST",
      headers: getOpenRouterHeaders(),
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Tu es un ingénieur métreur BTP au Cameroun. Réponds TOUJOURS avec un objet JSON strict.",
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUri, detail: "low" } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[OpenRouter Bridge] VLM HTTP ${res.status}: ${errText.slice(0, 150)}`);
      return { rooms: [], totalSurface: 0, roomCount: 0 };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = parseStrictJson<PlanMetadataResult>(content);

    if (parsed && Array.isArray(parsed.rooms)) {
      const totalSurface = parsed.totalSurface || parsed.rooms.reduce((sum, r) => sum + (r.surface_m2 || 0), 0);
      return {
        rooms: parsed.rooms,
        totalSurface: Math.round(totalSurface * 10) / 10,
        roomCount: parsed.rooms.length,
        rawText: content,
      };
    }
  } catch (err: any) {
    console.warn("[OpenRouter Bridge] Erreur extractPlanMetadata:", err?.message || err);
  }

  return { rooms: [], totalSurface: 0, roomCount: 0 };
}

/**
 * ÉTAPE 1.B : Génération de l'image architecturale HD à partir du masque OpenCV
 * Le masque transmis DOIT être le masque nettoyé (sans texte OCR, sans lignes de cahier).
 * L'image est redimensionnée à 1024×1024 JPEG q=80 avant envoi pour éviter les
 * erreurs "fetch failed" sur les payloads Base64 lourds.
 * Modèles : google/gemini-2.5-flash-image -> gemini-3.1-flash-image -> gemini-3-pro-image
 */
export async function generateArchitecturalRender(
  imageBase64Mask: string,
  prompt: string
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    console.warn("[OpenRouter Bridge] OPENROUTER_API_KEY absente pour le rendu d'image.");
    return null;
  }

  // ── OPTIMISATION PAYLOAD : resize 1024×1024 JPEG q=80 avant envoi ──────────
  const imageUri = await resizeBase64ImageForCloud(
    imageBase64Mask.startsWith("data:") ? imageBase64Mask : `data:image/png;base64,${imageBase64Mask}`
  );

  const candidateModels = [
    "google/gemini-2.5-flash-image",
    "google/gemini-3.1-flash-image",
    "google/gemini-3-pro-image",
  ];

  for (const model of candidateModels) {
    console.log(`[OpenRouter Bridge] 🎨 Essai de rendu avec '${model}'...`);

    // 1. Essai via /chat/completions (format multimodal standard OpenRouter)
    try {
      const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: "POST",
        headers: getOpenRouterHeaders(),
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: imageUri } },
                { type: "text", text: prompt },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const output = data.choices?.[0]?.message?.content || "";
        const imgUrlMatch = output.match(/https?:\/\/[^\s\)"']+\.(?:png|jpg|jpeg|webp)|data:image\/[a-zA-Z]+;base64,[^\s\)"']+/i);
        if (imgUrlMatch) {
          console.log(`[OpenRouter Bridge] ✨ Image générée avec succès via ${model} !`);
          return imgUrlMatch[0];
        }
        if (output.startsWith("http://") || output.startsWith("https://") || output.startsWith("data:image/")) {
          return output;
        }
      }
    } catch (e: any) {
      console.warn(`[OpenRouter Bridge] Notice chat/completions (${model}):`, e?.message || e);
    }

    // 2. Essai via /images/generations (format OpenAI Image Standard)
    try {
      const res = await fetch(`${OPENROUTER_API_URL}/images/generations`, {
        method: "POST",
        headers: getOpenRouterHeaders(),
        body: JSON.stringify({
          model,
          prompt,
          image: imageUri,
          n: 1,
          size: "1024x1024",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.data?.[0]?.url || (data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);
        if (imageUrl) {
          console.log(`[OpenRouter Bridge] ✨ Image générée via /images/generations (${model}) !`);
          return imageUrl;
        }
      }
    } catch (e: any) {
      console.warn(`[OpenRouter Bridge] Notice images/generations (${model}):`, e?.message || e);
    }
  }

  console.warn("[OpenRouter Bridge] Tous les modèles d'image OpenRouter ont échoué.");
  return null;
}
