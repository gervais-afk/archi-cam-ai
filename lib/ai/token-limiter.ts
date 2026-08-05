/**
 * LIMITEUR DE BUDGET DE TOKENS & TRONCATURE INTELLIGENTE — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Empêche l'explosion des coûts d'inférence en tronquant intelligemment les
 * documents trop volumineux (ex: PDF de 50 pages) tout en conservant les extraits critiques.
 * ════════════════════════════════════════════════════════════════════════════
 */

export class TokenBudgetLimiter {
  private readonly MAX_CHARACTERS_INPUT = 16000; // ~ 4000 tokens approximatifs

  public enforceLimit(text: string): string {
    if (text.length <= this.MAX_CHARACTERS_INPUT) {
      return text;
    }

    console.warn(`[Token Limiter] Texte trop volumineux (${text.length} chars). Troncaturation intelligente en cours...`);
    return this.intelligentTruncate(text);
  }

  private intelligentTruncate(text: string): string {
    const headerContext = text.substring(0, Math.round(this.MAX_CHARACTERS_INPUT * 0.4));
    const lines = text.split("\n");

    const criticalPatterns = [
      /chambre/gi,
      /salon/gi,
      /cuisine/gi,
      /sdb/gi,
      /surface/gi,
      /\d+\s*m[²2]/gi,
      /\d+\s*cm/gi,
      /beton/gi,
      /acier/gi,
    ];

    const extractedLines: string[] = [];
    for (const line of lines) {
      if (criticalPatterns.some((p) => p.test(line))) {
        extractedLines.push(line);
      }
      if (extractedLines.join("\n").length > this.MAX_CHARACTERS_INPUT * 0.5) {
        break;
      }
    }

    return `${headerContext}\n\n=== [EXTRAITS CRITIQUES CONSERVÉS] ===\n${extractedLines.join("\n")}`;
  }
}
