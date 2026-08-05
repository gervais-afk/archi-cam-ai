/**
 * BRIDGE OPENAI IMAGE GENERATION — ARCHI CAM AI
 * ─────────────────────────────────────────────
 * Gestion multi-modèles (gpt-image-1, dall-e-3, dall-e-2) sans paramètre response_format
 * avec bascule automatique et gestion de la limite de facturation (Billing Hard Limit).
 */

type SupportedImageModel = "gpt-image-1" | "dall-e-3" | "dall-e-2";

export interface OpenAIImageResult {
  imageBuffer: Buffer;
  modelUsed: string;
  keyUsed: string;
}

const MODEL_PARAMS: Record<SupportedImageModel, {
  supportedSizes: string[];
  defaultSize: string;
  supportsQuality: boolean;
  supportsResponseFormat: boolean;
  supportsStyle: boolean;
}> = {
  "gpt-image-1": {
    supportedSizes: ["1024x1024", "1536x1024", "1024x1536"],
    defaultSize: "1024x1024",
    supportsQuality: true,
    supportsResponseFormat: false,
    supportsStyle: false,
  },
  "dall-e-3": {
    supportedSizes: ["1024x1024", "1792x1024", "1024x1792"],
    defaultSize: "1024x1024",
    supportsQuality: true,
    supportsResponseFormat: false,
    supportsStyle: false,
  },
  "dall-e-2": {
    supportedSizes: ["256x256", "512x512", "1024x1024"],
    defaultSize: "1024x1024",
    supportsQuality: false,
    supportsResponseFormat: false,
    supportsStyle: false,
  },
};

function mapQualityForGptImage(quality: string): string {
  const mapping: Record<string, string> = {
    "standard": "medium",
    "hd": "high",
    "low": "low",
    "medium": "medium",
    "high": "high",
    "auto": "auto",
  };
  return mapping[quality] ?? "auto";
}

async function downloadImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Téléchargement image échoué: HTTP ${res.status} — ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function generateImageWithModel(params: {
  prompt: string;
  model: SupportedImageModel;
  apiKey: string;
  size: string;
  quality: string;
  style: string;
}): Promise<OpenAIImageResult> {
  const { prompt, model, apiKey, size, quality, style } = params;
  const config = MODEL_PARAMS[model];

  const validSize = config.supportedSizes.includes(size)
    ? size
    : config.defaultSize;

  const imageParams: Record<string, any> = {
    model,
    prompt,
    n: 1,
    size: validSize,
  };

  if (config.supportsQuality && quality) {
    imageParams.quality = model === "gpt-image-1"
      ? mapQualityForGptImage(quality)
      : quality;
  }

  if (config.supportsStyle && style) {
    imageParams.style = style;
  }

  console.log(`[Bridge OpenAI] Paramètres pour '${model}':`, {
    ...imageParams,
    prompt: prompt.substring(0, 80) + "...",
  });

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(imageParams),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = (errData as any)?.error?.message || response.statusText;
    throw new Error(`HTTP ${response.status}: ${errMsg}`);
  }

  const data = await response.json();
  const imageData = data.data?.[0];
  if (!imageData) {
    throw new Error(`Réponse vide de l'API OpenAI pour le modèle ${model}`);
  }

  let imageBuffer: Buffer;

  if (imageData.b64_json) {
    console.log(`[Bridge OpenAI] 📦 Réception b64_json (${model})`);
    imageBuffer = Buffer.from(imageData.b64_json, "base64");
  } else if (imageData.url) {
    console.log(`[Bridge OpenAI] 🌐 Téléchargement depuis URL (${model})`);
    imageBuffer = await downloadImageBuffer(imageData.url);
  } else {
    throw new Error(`Ni b64_json ni url dans la réponse de ${model}`);
  }

  return {
    imageBuffer,
    modelUsed: model,
    keyUsed: apiKey,
  };
}

export interface OpenAIKeyConfig {
  key: string;
  label: string;
  failCount: number;
  lastUsed: number;
}

function getOpenAIKeysFromEnv(): OpenAIKeyConfig[] {
  const keys = [
    { key: process.env.OPENAI_API_KEY || "", label: "Principale", failCount: 0, lastUsed: 0 },
    { key: process.env.OPENAI_API_KEY_SECONDARY || "", label: "Secondaire", failCount: 0, lastUsed: 0 },
    { key: process.env.OPENAI_API_KEY_TERTIARY || "", label: "Tertiaire", failCount: 0, lastUsed: 0 },
  ].filter(k => k.key.length > 10 && !k.key.includes("placeholder"));

  return keys.sort((a, b) => a.failCount - b.failCount);
}

export async function callOpenAIImageBridge(params: {
  prompt: string;
  apiKeys?: string[];
  models?: SupportedImageModel[];
  size?: string;
  quality?: string;
  style?: string;
}): Promise<OpenAIImageResult> {
  const {
    prompt,
    apiKeys,
    models = ["gpt-image-1", "dall-e-3", "dall-e-2"],
    size = "1024x1024",
    quality = "standard",
    style = "vivid",
  } = params;

  // Si pas de clés fournies, utiliser la rotation automatique des 3 clés d'environnement
  const keysConfig = (apiKeys && apiKeys.length > 0)
    ? apiKeys.map((k, i) => ({ key: k, label: `Clé ${i+1}`, failCount: 0, lastUsed: 0 }))
    : getOpenAIKeysFromEnv();

  if (keysConfig.length === 0) {
    throw new Error("OpenAI Image Bridge: Aucune clé API OpenAI valide configurée.");
  }

  const errors: string[] = [];

  // Essai des clés dans l'ordre de priorité (failCount le plus bas)
  for (const keyObj of keysConfig) {
    if (keyObj.failCount >= 999) continue; // Skip les clés bloquées pour facturation

    for (const model of models) {
      console.log(`[Bridge OpenAI] 🔑 Essai clé '${keyObj.label}' (${keyObj.key.substring(0, 10)}...) avec modèle '${model}'...`);

      try {
        keyObj.lastUsed = Date.now();
        const result = await generateImageWithModel({
          prompt,
          model,
          apiKey: keyObj.key,
          size,
          quality,
          style,
        });

        console.log(`[Bridge OpenAI] ✅ Succès avec clé '${keyObj.label}' et modèle '${model}'`);
        return result;

      } catch (err: any) {
        const message = err?.message ?? String(err);
        console.warn(`[Bridge OpenAI] Modèle '${model}' échoué avec clé '${keyObj.label}': ${message}`);
        errors.push(`${keyObj.label}/${model}: ${message}`);

        if (message.includes("Billing hard limit") || message.includes("insufficient_quota")) {
          console.warn(`[Bridge OpenAI] 💸 Facturation/Quota dépassé pour clé '${keyObj.label}' → Marquée indisponible`);
          keyObj.failCount = 999;
          break; // Passer directement à la clé suivante
        } else {
          keyObj.failCount += 1;
        }
      }
    }
  }

  console.error("[Bridge OpenAI] ❌ Toutes les clés et tous les modèles ont échoué.");
  throw new Error(`OpenAI Image Bridge: tous les essais ont échoué.\n${errors.join("\n")}`);
}

