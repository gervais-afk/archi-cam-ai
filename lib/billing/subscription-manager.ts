/**
 * 💳 SUBSCRIPTION & MOBILE MONEY MANAGER — ARCHI CAM AI
 * ───────────────────────────────────────────────────────
 * Gestion des abonnements et intégration des passerelles de paiement
 * Mobile Money (Orange Money Cameroun & MTN MoMo).
 *
 * Tarifs :
 *   - Free       : 0 FCFA (3 rendus/jour, watermark, OpenCV local)
 *   - Pro        : 25 000 FCFA/mois (20 rendus/jour, sans watermark, tous moteurs)
 *   - Enterprise : 150 000 FCFA/mois (illimité, priorité queue, accès API)
 *   - À l'acte   : 5 000 FCFA / rendu premium unitaires
 */

export interface PricingPlan {
  id: "free" | "pro" | "enterprise" | "pay_per_render";
  name: string;
  price_fcfa: number;
  period: "month" | "render" | "free";
  features: string[];
}

export const PRICING_PLANS: Record<string, PricingPlan> = {
  free: {
    id: "free",
    name: "Découverte Free",
    price_fcfa: 0,
    period: "free",
    features: ["3 rendus/jour", "Filigrane Archi Cam AI", "Moteur OpenCV Local", "Support communautaire"],
  },
  pro: {
    id: "pro",
    name: "Architecte Pro",
    price_fcfa: 25000,
    period: "month",
    features: ["20 rendus/jour", "Sans filigrane", "Tous moteurs IA (Gemini, Replicate, DALL-E 3)", "Export PDF DPGF complet", "Support prioritaire"],
  },
  enterprise: {
    id: "enterprise",
    name: "Cabinet & Bureau d'Études",
    price_fcfa: 150000,
    period: "month",
    features: ["Rendus illimités", "Queue prioritaire dédiée", "Accès API Publique REST", "Marque blanche", "Support WhatsApp 24/7"],
  },
  pay_per_render: {
    id: "pay_per_render",
    name: "Rendu Unitaire Premium",
    price_fcfa: 5000,
    period: "render",
    features: ["1 rendu HD sans filigrane", "Tous moteurs IA", "Export PDF inclus"],
  },
};

export interface MobileMoneyPaymentRequest {
  userId: string;
  planId: "pro" | "enterprise" | "pay_per_render";
  operator: "orange_money" | "mtn_momo";
  phoneNumber: string; // ex: 237699000000 ou 237677000000
}

export interface PaymentTransaction {
  transactionId: string;
  status: "pending" | "SUCCESSFUL" | "failed";
  amountFcfa: number;
  phoneNumber: string;
  operator: string;
  createdAt: string;
}

const TRANSACTIONS_DB = new Map<string, PaymentTransaction>();

export async function initiateMobileMoneyPayment(
  req: MobileMoneyPaymentRequest
): Promise<PaymentTransaction> {
  const plan = PRICING_PLANS[req.planId];
  if (!plan) throw new Error(`Plan inconnu: ${req.planId}`);

  const txId = `tx_${req.operator === "orange_money" ? "om" : "momo"}_${Date.now()}`;

  const transaction: PaymentTransaction = {
    transactionId: txId,
    status: "pending",
    amountFcfa: plan.price_fcfa,
    phoneNumber: req.phoneNumber,
    operator: req.operator,
    createdAt: new Date().toISOString(),
  };

  TRANSACTIONS_DB.set(txId, transaction);

  console.log(`[Mobile Money] 📲 Ingestion paiement ${req.operator.toUpperCase()} de ${plan.price_fcfa} FCFA pour ${req.phoneNumber} (Tx: ${txId})`);

  // Simulation de la validation du prompt USSD Mobile Money
  setTimeout(() => {
    transaction.status = "SUCCESSFUL";
    TRANSACTIONS_DB.set(txId, transaction);
    console.log(`[Mobile Money] ✅ Paiement ${txId} confirmé avec succès !`);
  }, 1000);

  return transaction;
}

export function getTransactionStatus(txId: string): PaymentTransaction | null {
  return TRANSACTIONS_DB.get(txId) || null;
}
