/**
 * 💳 BILLING SUBSCRIBE ROUTE — ARCHI CAM AI
 * ───────────────────────────────────────────
 * Route d'initiation d'abonnement / achat par Mobile Money (Orange Money / MTN MoMo).
 */

import { NextResponse } from "next/server";
import { initiateMobileMoneyPayment } from "@/lib/billing/subscription-manager";
import { verifyFirebaseToken } from "@/lib/auth/verify-firebase-token";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await verifyFirebaseToken(request);
    if (!session.authenticated || !session.userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { planId, operator, phoneNumber } = body;

    if (!planId || !operator || !phoneNumber) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants : planId, operator (orange_money | mtn_momo), phoneNumber" },
        { status: 400 }
      );
    }

    const tx = await initiateMobileMoneyPayment({
      userId: session.userId,
      planId,
      operator,
      phoneNumber,
    });

    return NextResponse.json({
      success: true,
      message: `Demande de paiement transmise à votre téléphone (${phoneNumber}). Validez votre code secret USSD.`,
      transaction: tx,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
