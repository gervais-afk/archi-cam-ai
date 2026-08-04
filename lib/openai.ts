/**
 * BRIDGE OPENAI IMAGE GENERATION — DISABLED
 * ─────────────────────────────────────────
 * OpenAI DALL-E est entièrement désactivé au profit de l'architecture souveraine :
 * 1. Google Gemini 2.5 Pro / Imagen 3
 * 2. ControlNet SDXL (FAL.ai / Replicate)
 * 3. Moteur Graphique Local OpenCV 2.5D
 */

export async function generateImageWithOpenAI(
  _planMaskPathOrUrl: string,
  _userPrompt?: string
): Promise<string | null> {
  console.log("[Bridge OpenAI] 🚫 Le moteur OpenAI DALL-E est désactivé. Utilisation exclusive de Gemini / ControlNet / OpenCV Local.");
  return null;
}
