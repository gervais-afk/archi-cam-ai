/**
 * Utilitaire de limitation de tokens pour s'assurer que les invites restent compactes.
 */
export function estimateTokens(text: string): number {
  // Règle de calcul empirique simple : ~4 caractères par token en anglais/français
  return Math.ceil(text.length / 4);
}

export function enforceTokenLimit(text: string, maxTokens = 3500): string {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) {
    return text;
  }

  // Si on dépasse, on tronque et ajoute une alerte
  const allowedLength = maxTokens * 4;
  console.warn(`[TokenLimiter] Prompt de ${estimated} tokens dépasse la limite de ${maxTokens}. Troncature active.`);
  
  return text.substring(0, allowedLength) + '\n\n... [CONTENU TRONQUÉ PAR LE SECURITY GUARD POUR CONTEXTE < 4K TOKENS] ...';
}
