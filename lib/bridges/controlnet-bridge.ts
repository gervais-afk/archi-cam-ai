/**
 * DEPRECATED — BRIDGE CONTROLNET OBSOLÈTE
 * Le pipeline utilise désormais lib/bridges/openrouter-bridge.ts pour le rendu Cloud unifié.
 */
import { generateArchitecturalRender } from "./openrouter-bridge";

export const PROMPT_3D_FLOORPLAN_PHOTOREALISTIC = "Top-down architectural 2D floorplan render";
export const NEGATIVE_PROMPT_3D = "3D perspective, blurry";

export async function callControlNetBridge(params: {
  prompt: string;
  cannyImage: string;
  depthImage?: string;
  negativePrompt?: string;
  apiToken: string;
}): Promise<string> {
  console.warn("[ControlNet Bridge] ⚠️ Bridge obsolète appelé — Redirection vers OpenRouter Bridge...");
  const result = await generateArchitecturalRender(params.cannyImage, params.prompt);
  if (!result) throw new Error("Rendu ControlNet indisponible. Utiliser OpenRouter Bridge.");
  return result;
}
