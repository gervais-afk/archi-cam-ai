/**
 * CRÉDIT MANAGER — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Gestionnaire de portefeuille virtuel (Wallet) & contrôle d'accès aux APIs IA
 *
 * Coûts des fonctionnalités :
 *   • IMAGE_RENDER    : 1 Crédit
 *   • BTP_ESTIMATE    : 1 Crédit
 *   • VOICE_ASSISTANT : 1 Crédit
 *   • VIDEO_RENDER    : 5 Crédits
 * ════════════════════════════════════════════════════════════════════════════
 */

export const FEATURE_COSTS: Record<string, number> = {
  IMAGE_RENDER: 1,
  BTP_ESTIMATE: 1,
  VOICE_ASSISTANT: 1,
  VIDEO_RENDER: 5,
};

// In-memory wallet store (pour développement/fallback si base indisponible)
const MOCK_USER_WALLETS = new Map<string, number>([
  ["demo-user", 25],
  ["admin-user", 100],
]);

export interface DeductCreditsResult {
  success: boolean;
  error?: string;
  remainingCredits?: number;
  requiredCredits?: number;
  currentBalance?: number;
}

export interface AddCreditsResult {
  success: boolean;
  newBalance: number;
}

/**
 * Déduit les crédits du portefeuille utilisateur avant d'invoquer l'API Cloud
 */
export async function deductCredits(
  userId: string = "demo-user",
  feature: keyof typeof FEATURE_COSTS | string
): Promise<DeductCreditsResult> {
  const cost = FEATURE_COSTS[feature] ?? 1;
  const currentBalance = MOCK_USER_WALLETS.get(userId) ?? 10;

  if (currentBalance < cost) {
    console.warn(
      `[CreditManager] 💸 Solde insuffisant pour ${userId} (${currentBalance} crédits < ${cost} requis pour ${feature})`
    );
    return {
      success: false,
      error: `Solde de crédits insuffisant. Requis : ${cost} crédit(s), Solde actuel : ${currentBalance} crédit(s).`,
      currentBalance,
      requiredCredits: cost,
    };
  }

  const newBalance = currentBalance - cost;
  MOCK_USER_WALLETS.set(userId, newBalance);

  console.log(
    `[CreditManager] 💳 ${cost} crédit(s) déduit(s) pour '${feature}' (User: ${userId}, Solde restant: ${newBalance})`
  );

  return {
    success: true,
    remainingCredits: newBalance,
    requiredCredits: cost,
    currentBalance: newBalance,
  };
}

/**
 * Crédite le portefeuille utilisateur suite à une recharge (Webhooks Stripe / OM / MoMo)
 */
export async function addCredits(
  userId: string = "demo-user",
  creditsAmount: number,
  provider: "STRIPE" | "ORANGE_MONEY" | "MTN_MOMO" | "SYSTEM" = "SYSTEM",
  metadata?: Record<string, any>
): Promise<AddCreditsResult> {
  const currentBalance = MOCK_USER_WALLETS.get(userId) ?? 10;
  const newBalance = currentBalance + creditsAmount;
  MOCK_USER_WALLETS.set(userId, newBalance);

  console.log(
    `[CreditManager] 🎁 +${creditsAmount} crédit(s) ajoutés via ${provider} (User: ${userId}, Nouveau solde: ${newBalance})`,
    metadata || ""
  );

  return {
    success: true,
    newBalance,
  };
}

/**
 * Obtient le solde actuel d'un utilisateur
 */
export function getCreditsBalance(userId: string = "demo-user"): number {
  return MOCK_USER_WALLETS.get(userId) ?? 10;
}
