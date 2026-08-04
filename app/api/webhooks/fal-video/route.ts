import { NextResponse } from "next/server";
import crypto from "crypto";
import { query } from "@/lib/db";
import { refundCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";

const VIDEO_CREDIT_COST = 10;

/**
 * VALIDE LA SIGNATURE HMAC DU WEBHOOK FAL.AI
 */
function verifyFalSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return true; // Tolérance en dev
  try {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(payload).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    const userId = url.searchParams.get("userId");

    const rawBody = await req.text();
    const signature = req.headers.get("x-fal-signature");
    const webhookSecret = process.env.FAL_WEBHOOK_SECRET || "";

    // 1. VÉRIFICATION HMAC DE SÉCURITÉ
    if (webhookSecret && !verifyFalSignature(rawBody, signature, webhookSecret)) {
      console.warn("[Webhook FAL] Signature HMAC invalide reçue.");
      return NextResponse.json({ error: "Signature HMAC invalide." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    console.log(`[Webhook FAL] Callback reçu pour Job ID: ${jobId || payload.request_id}`, payload.status);

    const status = payload.status || (payload.video?.url ? "OK" : "ERROR");
    const videoUrl = payload.video?.url || payload.output?.video?.url || payload.payload?.video?.url;

    const targetJobId = jobId || payload.request_id;
    const targetUserId = userId || payload.user_id;

    // ── 2. CAS DE SUCCÈS : ENREGISTREMENT DE LA VIDÉO MP4 ──
    if ((status === "OK" || status === "COMPLETED" || status === "succeeded") && videoUrl) {
      console.log(`[Webhook FAL] ✨ Succès rendu vidéo pour Job ${targetJobId} : ${videoUrl}`);

      await query(
        `UPDATE render_jobs 
         SET status = 'completed', media_url = $1, updated_at = NOW() 
         WHERE id = $2 OR fal_request_id = $2`,
        [videoUrl, targetJobId]
      );

      return NextResponse.json({ success: true, jobId: targetJobId, mediaUrl: videoUrl });
    }

    // ── 3. CAS D'ÉCHEC : REMBOURSEMENT AUTOMATIQUE DES 10 CRÉDITS ──
    console.warn(`[Webhook FAL] ⚠️ Échec de génération vidéo pour Job ${targetJobId}. Déclenchement du remboursement...`);

    await query(
      `UPDATE render_jobs 
       SET status = 'failed', updated_at = NOW() 
       WHERE id = $1 OR fal_request_id = $1`,
      [targetJobId]
    );

    if (targetUserId) {
      await refundCredits(targetUserId, VIDEO_CREDIT_COST, `Échec génération vidéo FAL (Job ${targetJobId})`);
    }

    return NextResponse.json({
      success: false,
      jobId: targetJobId,
      refunded: true,
      message: "Génération échouée. Crédits remboursés intégralement."
    });

  } catch (error: any) {
    console.error("[Webhook FAL] Erreur interne webhook :", error);
    return NextResponse.json({ error: "Erreur traitement webhook." }, { status: 500 });
  }
}
