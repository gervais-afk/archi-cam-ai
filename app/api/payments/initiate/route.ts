import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { CREDIT_PACKS } from "@/lib/payment-config";

export const dynamic = "force-dynamic";

/**
 * INITIALISATION DU PAIEMENT MOBILE MONEY (MTN MoMo / Orange Money)
 * ──────────────────────────────────────────────────────────────────
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { packId, phoneNumber, operator, userId } = body;

    if (!packId || !phoneNumber || !operator) {
      return NextResponse.json(
        { error: "Pack, numéro de téléphone et opérateur sont requis." },
        { status: 400 }
      );
    }

    const pack = CREDIT_PACKS.find((p) => p.id === packId);
    if (!pack) {
      return NextResponse.json({ error: "Pack de crédits inexistant." }, { status: 404 });
    }

    // Normalisation du numéro de téléphone au format Cameroun (2376XXXXXXX)
    let cleanPhone = phoneNumber.replace(/\s+/g, "").replace(/^\+/, "");
    if (!cleanPhone.startsWith("237")) {
      cleanPhone = `237${cleanPhone}`;
    }

    const reference = `ARCHI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 1. Enregistrement de la transaction dans la table payment_transactions
    await query(
      `INSERT INTO payment_transactions 
       (reference, user_id, pack_id, amount_fcfa, credit_amount, operator, phone_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        reference,
        userId || "usr_guest",
        pack.id,
        pack.amountFCFA,
        pack.totalCredits,
        operator.toUpperCase(),
        cleanPhone,
        "PENDING",
      ]
    );

    console.log(`[Payment Init] Transaction ${reference} créée pour ${cleanPhone} (${pack.amountFCFA} FCFA)`);

    // 2. Mock mode dev si clés Campay absentes
    const campayUsername = process.env.CAMPAY_USERNAME;
    if (!campayUsername || campayUsername.startsWith("mock")) {
      // Simulation USSD Push réussie en dev
      setTimeout(async () => {
        try {
          await query(
            `UPDATE payment_transactions SET status = 'SUCCESSFUL', updated_at = NOW() WHERE reference = $1`,
            [reference]
          );
          await query(
            `INSERT INTO user_credits (user_id, balance) 
             VALUES ($1, $2)
             ON CONFLICT (user_id) 
             DO UPDATE SET balance = user_credits.balance + EXCLUDED.balance, updated_at = NOW()`,
            [userId || "usr_guest", pack.totalCredits]
          );
          console.log(`[Payment Mock] Transaction ${reference} validée avec succès (+${pack.totalCredits} crédits) !`);
        } catch (mockErr) {
          console.error("[Payment Mock Error]", mockErr);
        }
      }, 5000);

      return NextResponse.json({
        success: true,
        reference,
        status: "PENDING",
        message: `Notification USSD envoyée sur le ${cleanPhone}. Validez avec votre code secret MTN/Orange.`,
        ussdPrompt: `Composez le *126# (MTN) ou #150# (Orange) pour valider le paiement de ${pack.amountFCFA} FCFA.`,
      });
    }

    // 3. Mode Production : Appel de l'API Campay (Collect endpoint)
    const campayRes = await fetch("https://www.campay.net/api/token/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: process.env.CAMPAY_USERNAME,
        password: process.env.CAMPAY_PASSWORD,
      }),
    });

    if (!campayRes.ok) {
      throw new Error("Impossible d'authentifier la passerelle Campay.");
    }

    const { token } = await campayRes.json();

    const collectRes = await fetch("https://www.campay.net/api/collect/", {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: pack.amountFCFA.toString(),
        currency: "XAF",
        telephone: cleanPhone,
        description: `Recharge Archi Cam AI - ${pack.name}`,
        external_reference: reference,
      }),
    });

    const collectData = await collectRes.json();

    return NextResponse.json({
      success: true,
      reference,
      status: collectData.status || "PENDING",
      operator: operator.toUpperCase(),
      message: `Demande de paiement de ${pack.amountFCFA} FCFA envoyée sur le ${cleanPhone}.`,
    });
  } catch (error: any) {
    console.error("Erreur API Payment Initiate:", error);
    return NextResponse.json(
      { error: "Échec de l'initialisation du paiement Mobile Money.", details: error.message },
      { status: 500 }
    );
  }
}
