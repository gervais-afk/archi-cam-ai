import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * WEBHOOK HANDLER PAIEMENT MOBILE MONEY (MTN / Orange Money)
 * ──────────────────────────────────────────────────────────
 * Reçoit la confirmation instantanée de paiement Campay / CinetPay
 * et crédite le solde du client dans PostgreSQL.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { status, reference, external_reference, amount } = body;

    const ref = external_reference || reference;

    if (!ref) {
      return NextResponse.json({ error: "Référence de transaction manquante." }, { status: 400 });
    }

    // 1. Recherche de la transaction
    const txRes = await query(
      `SELECT id, user_id AS "userId", pack_id AS "packId", credit_amount AS "creditAmount", status 
       FROM payment_transactions 
       WHERE reference = $1 
       LIMIT 1`,
      [ref]
    );

    const transaction = txRes.rows[0];

    if (!transaction) {
      console.warn(`[Payment Webhook] Transaction non trouvée pour ref: ${ref}`);
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    if (transaction.status === "SUCCESSFUL") {
      return NextResponse.json({ message: "Transaction déjà validée." });
    }

    // 2. Traitement du statut de paiement
    if (status === "SUCCESSFUL" || status === "SUCCESS" || status === "COMPLETED") {
      // Mise à jour de la transaction en SUCCESSFUL
      await query(
        `UPDATE payment_transactions 
         SET status = 'SUCCESSFUL', updated_at = NOW() 
         WHERE reference = $1`,
        [ref]
      );

      // Rechargement du solde de crédits de l'utilisateur
      await query(
        `INSERT INTO user_credits (user_id, balance) 
         VALUES ($1, $2)
         ON CONFLICT (user_id) 
         DO UPDATE SET balance = user_credits.balance + EXCLUDED.balance, updated_at = NOW()`,
        [transaction.userId, transaction.creditAmount]
      );

      console.log(`✅ [Payment Webhook] Transaction ${ref} confirmée ! +${transaction.creditAmount} crédits pour ${transaction.userId}`);
      return NextResponse.json({ success: true, mode: "CREDITED", creditsAdded: transaction.creditAmount });
    } else if (status === "FAILED" || status === "CANCELLED") {
      await query(
        `UPDATE payment_transactions 
         SET status = 'FAILED', updated_at = NOW() 
         WHERE reference = $1`,
        [ref]
      );

      console.log(`❌ [Payment Webhook] Transaction ${ref} échouée ou annulée.`);
      return NextResponse.json({ success: true, mode: "FAILED" });
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error("Erreur Payment Webhook:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la validation du paiement.", details: error.message },
      { status: 500 }
    );
  }
}
