/**
 * OPTIMISATION AUTOMATIQUE D'IMAGE POUR INFÉRENCE IA — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Redimensionne et compresse les images téléchargées (max 2048x2048 JPEG)
 * afin d'éviter les timeouts d'API OpenRouter/Gemini et les erreurs 413.
 * ════════════════════════════════════════════════════════════════════════════
 */

import sharp from "sharp";

export interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function optimizeForAI(
  imageInput: Buffer | string,
  options: OptimizeOptions = {}
): Promise<{ buffer: Buffer; base64: string; mimeType: string }> {
  const { maxWidth = 2048, maxHeight = 2048, quality = 85 } = options;

  let buffer: Buffer;
  if (typeof imageInput === "string") {
    const cleanBase64 = imageInput.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    buffer = Buffer.from(cleanBase64, "base64");
  } else {
    buffer = imageInput;
  }

  try {
    const optimizedBuffer = await sharp(buffer)
      .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    const base64 = optimizedBuffer.toString("base64");
    return {
      buffer: optimizedBuffer,
      base64,
      mimeType: "image/jpeg",
    };
  } catch (err) {
    console.warn("[Image Optimizer] Fallback vers l'image brute:", err);
    const rawBase64 = buffer.toString("base64");
    return {
      buffer,
      base64: rawBase64,
      mimeType: "image/png",
    };
  }
}
