/**
 * guardrailAuditor.ts — Archi Cam AI Guardrails & BAEL Ratio Auditor
 *
 * Outil d'audit automatique vérifiant que les métriques et devis générés par l'IA
 * respectent les plages d'acceptabilité physiques et normatives (Code BAEL 91 / Eurocode).
 */

export interface GuardrailAuditResult {
  isCompliant: boolean;
  score: number; // 0 à 100
  warnings: string[];
  errors: string[];
  metrics: {
    ratioSteelConcreteKgM3?: number;
    plasterToWallRatio?: number;
    budgetXafTotal?: number;
  };
}

/**
 * Audite un projet de devis ou calcul de métré contre les garde-fous BAEL.
 */
export function auditBuildingMetrics(payload: {
  volumeConcreteM3: number;
  weightSteelKg: number;
  areaWallM2?: number;
  areaPlasterM2?: number;
  totalBudgetCaf?: number;
}): GuardrailAuditResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  // 1. Audit du ratio Acier / Béton (Poteaux / Poutres en Zone Tropicale)
  // Norme BAEL : Le ratio doit être compris entre 80 kg/m3 et 140 kg/m3 pour du bâtiment courant.
  let ratioSteelConcreteKgM3 = 0;
  if (payload.volumeConcreteM3 > 0) {
    ratioSteelConcreteKgM3 = payload.weightSteelKg / payload.volumeConcreteM3;

    if (ratioSteelConcreteKgM3 < 70) {
      errors.push(`[BAEL_B.6.2] Ratio Acier/Béton sous-dimensionné (${ratioSteelConcreteKgM3.toFixed(1)} kg/m³ < 70 kg/m³ minimum). Risque de fissure sous charge.`);
      score -= 30;
    } else if (ratioSteelConcreteKgM3 > 160) {
      warnings.push(`[BAEL_B.6.2] Ratio Acier/Béton particulièrement élevé (${ratioSteelConcreteKgM3.toFixed(1)} kg/m³ > 160 kg/m³). Surcoût potentiel à vérifier.`);
      score -= 10;
    }
  }

  // 2. Audit du ratio Enduit / Maçonnerie
  let plasterToWallRatio = 0;
  if (payload.areaWallM2 && payload.areaPlasterM2) {
    plasterToWallRatio = payload.areaPlasterM2 / payload.areaWallM2;
    // Deux faces d'enduit = ratio proche de 2.0
    if (plasterToWallRatio < 1.6 || plasterToWallRatio > 2.4) {
      warnings.push(`[MÉTRÉ] Ratio Surface Enduit / Surface Mur inhabituel (${plasterToWallRatio.toFixed(2)} attendu autour de 2.0 pour 2 faces).`);
      score -= 10;
    }
  }

  // 3. Audit Coût Total Plausibilité
  if (payload.totalBudgetCaf && payload.totalBudgetCaf < 0) {
    errors.push(`[FINANCE] Budget total négatif détecté. Erreur de calcul dans le sous-détail de prix.`);
    score -= 50;
  }

  const isCompliant = errors.length === 0;

  return {
    isCompliant,
    score: Math.max(0, score),
    warnings,
    errors,
    metrics: {
      ratioSteelConcreteKgM3,
      plasterToWallRatio,
      budgetXafTotal: payload.totalBudgetCaf,
    },
  };
}
