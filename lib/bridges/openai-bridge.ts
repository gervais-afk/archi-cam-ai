/**
 * DEPRECATED — BRIDGE OPENAI OBSOLÈTE
 * Le pipeline utilise désormais lib/bridges/openrouter-bridge.ts pour le rendu Cloud unifié.
 */
import { generateArchitecturalRender } from "./openrouter-bridge";

export async function callOpenAIImageBridge(params: {
  prompt: string;
  apiKeys?: string[];
  models?: string[];
}) {
  console.warn("[OpenAI Bridge] ⚠️ Bridge obsolète appelé — Redirection vers OpenRouter Bridge...");
  const url = await generateArchitecturalRender("", null, params.prompt);
  return {
    imageBuffer: url ? Buffer.from([]) : Buffer.from([]),
    modelUsed: "openrouter-fallback",
    keyUsed: "openrouter",
  };
}
