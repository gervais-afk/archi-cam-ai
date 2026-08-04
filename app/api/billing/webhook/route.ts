/**
 * 🔔 MOBILE MONEY WEBHOOK ROUTE — ARCHI CAM AI
 * ───────────────────────────────────────────────
 * Webhook de confirmation asynchrone pour Orange Money & MTN MoMo.
 */

import { NextResponse } from "next/server";
import { getTransactionStatus } from "@/lib/billing/subscription-manager";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionId, status } = body;

    console.log(`[Billing Webhook] 🔔 Notification reçue pour Tx: ${transactionId}, Statut: ${status}`);

    const tx = getTransactionStatus(transactionId);
    if (tx) {
      tx.status = status === "SUCCESS" || status === "SUCCESSFUL" ? "SUCCESSFUL" : "failed";
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
