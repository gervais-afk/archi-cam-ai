/**
 * PROMPT COMPRESSOR — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Compresse les prompts system/positive/negative pour économiser les tokens.
 * ════════════════════════════════════════════════════════════════════════════
 */

export function compressPrompt(verbose: string): string {
  if (!verbose) return "";

  const compressionRules: Record<string, string> = {
    // Remplacements techniques
    "architectural floor plan": "arch floor plan",
    "Professional architectural": "Pro arch",
    "Strict 90-degree direct top-down orthographic overhead view": "90° top ortho view",
    "Absolutely NO 35-45 degree isometric or 3/4 perspective tilts": "NO iso/3/4 persp",
    "eye-level interior photography": "eye-lvl interior",
    "MANDATORY GEOMETRY & PERSPECTIVE RULES": "GEOM & PERSPECTIVE RULES",
    "CRITICAL — PLAN FIDELITY RULES": "FIDELITY RULES",
    "OUTDOOR SPACES DETECTED": "OUTDOOR DETECTED",
    
    // Supprimer les redondances et abréger les termes communs
    "precise and accurate": "precise",
    "clean and professional": "clean pro",
    "high quality photorealistic": "photorealistic",
    "living room": "LR",
    "bedroom": "BR",
    "kitchen": "KIT",
    "bathroom": "BATH",
    "veranda": "VER",
    "terrace": "TER",
    "balcony": "BAL"
  };

  let compressed = verbose;

  for (const [long, short] of Object.entries(compressionRules)) {
    compressed = compressed.replace(new RegExp(long, "gi"), short);
  }

  // Supprimer les espaces multiples et sauts de ligne excessifs
  compressed = compressed.replace(/[ \t]+/g, " ");
  compressed = compressed.replace(/\n\s*\n/g, "\n");
  compressed = compressed.trim();

  const originalLength = verbose.length;
  const compressedLength = compressed.length;
  const originalTokens = Math.ceil(originalLength / 4);
  const compressedTokens = Math.ceil(compressedLength / 4);
  const savings = originalTokens > 0 ? (((originalTokens - compressedTokens) / originalTokens) * 100).toFixed(1) : "0.0";

  console.log(`📊 [PromptCompressor] Tokens: ${originalTokens} → ${compressedTokens} (-${savings}%)`);

  return compressed;
}
