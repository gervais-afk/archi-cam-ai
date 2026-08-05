import { NextResponse } from "next/server";
import { addCredits } from "@/lib/credits/credit-manager";

export const dynamic = "force-dynamic";

/**
 * ARCHITECTURE PASSERELLE PAIEMENT MULTI-PROVIDER — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Gère les notifications asynchrones Webhook pour :
 *  1. Stripe (Carte Bancaire Internationale)
 *  2. Campay / Fapshi (Orange Money & MTN Mobile Money Cameroun)
 * ════════════════════════════════════════════════════════════════════════════
 */

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(bodyText);
    } catch {
      // payload non-json
    }

    const providerHeader = req.headers.get("x-payment-provider") || "";
    const stripeSignature = req.headers.get("stripe-signature");

    console.log(`[Payment Webhook] 📥 Webhook reçu (Provider header: '${providerHeader}')`);

    // ── 1. STRIPE WEBHOOK ───────────────────────────────────────────────────
    if (stripeSignature || body.type?.startsWith("payment_intent.")) {
      console.log("[Payment Webhook] 💳 Traitement événement Stripe...");
      
      const eventType = body.type;
      if (eventType === "payment_intent.succeeded" || body.status === "succeeded") {
        const userId = body.data?.object?.metadata?.userId || body.metadata?.userId || "demo-user";
        const amountUsd = (body.data?.object?.amount || 1000) / 100;
        const creditsToAssign = amountUsd >= 50 ? 100 : amountUsd >= 20 ? 35 : 15;

        await addCredits(userId, creditsToAssign, "STRIPE", {
          stripePaymentIntentId: body.data?.object?.id || body.id,
          amountUsd,
        });

        return NextResponse.json({ received: true, provider: "STRIPE", credited: creditsToAssign });
      }
    }

    // ── 2. CAMPAY / FAPSHI (ORANGE MONEY & MTN MOMO CAMEROUN) ───────────────
    if (providerHeader.includes("campay") || providerHeader.includes("fapshi") || body.operator || body.momo_tx_ref) {
      console.log("[Payment Webhook] 📱 Traitement événement Mobile Money (OM/MTN)...");

      const status = String(body.status || body.event || "").toUpperCase();
      const operator = String(body.operator || body.channel || "OM").toUpperCase();

      if (status === "SUCCESSFUL" || status === "SUCCESS" || status === "COMPLETED") {
        const userId = body.external_reference || body.custom_user_id || "demo-user";
        const amountXaf = Number(body.amount || 5000);
        // Ex: 5000 FCFA = 20 crédits, 10000 FCFA = 45 crédits
        const creditsToAssign = amountXaf >= 10000 ? 45 : amountXaf >= 5000 ? 20 : 10;

        const providerEnum = operator.includes("MTN") ? "MTN_MOMO" : "ORANGE_MONEY";

        await addCredits(userId, creditsToAssign, providerEnum, {
          transactionRef: body.reference || body.momo_tx_ref || body.id,
          amountXaf,
        });

        return NextResponse.json({ received: true, provider: providerEnum, credited: creditsToAssign });
      }
    }

    // Default Fallback pour simulation dev/test
    if (body.action === "simulate_recharge") {
      const userId = body.userId || "demo-user";
      const credits = Number(body.credits || 20);
      const provider = body.provider || "SYSTEM";

      await addCredits(userId, credits, provider, { simulated: true });
      return NextResponse.json({ received: true, simulated: true, credited: credits });
    }

    return NextResponse.json({ received: true, status: "ignored" });
  } catch (error: any) {
    console.error("[Payment Webhook] ❌ Erreur webhook :", error);
    return NextResponse.json({ error: "Erreur serveur webhook paiement." }, { status: 500 });
  }
}
