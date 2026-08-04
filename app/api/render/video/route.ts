import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserCredits, deductCredits, refundCredits } from "@/lib/credits";

export const dynamic = "force-dynamic";

// Coût unitaire d'un rendu vidéo cinématique I2V (10 crédits)
const VIDEO_CREDIT_COST = 10;

/**
 * ROUTE API DE RENDU VIDÉO CINÉMATIQUE (FAL.AI LUMA DREAM MACHINE)
 * ───────────────────────────────────────────────────────────────
 * 1. Vérification du solde (10 crédits requis).
 * 2. Prélèvement transactionnel de crédits (BDD PostgreSQL).
 * 3. Envoi du job I2V vers FAL.ai avec Webhook Callback.
 */
export async function POST(req: Request) {
  let userIdToRefund: string | null = null;
  let creditsDeducted = false;

  try {
    const body = await req.json();
    const { userId, projectId, imageUrl, cameraMotion, style } = body;
    const targetUserId = userId || "usr_guest";

    if (!imageUrl && !projectId) {
      return NextResponse.json(
        { error: "Paramètres manquants : 'imageUrl' ou 'projectId' requis." },
        { status: 400 }
      );
    }

    const sourceImage = imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80";
    const falApiKey = process.env.FAL_API_KEY;

    // ── 1. VÉRIFICATION DE SOLDE & PRÉLÈVEMENT TRANSACTIONNEL ──
    const userBalance = await getUserCredits(targetUserId);
    if (userBalance < VIDEO_CREDIT_COST) {
      console.warn(`[API Video] Solde insuffisant pour ${targetUserId} (${userBalance}/${VIDEO_CREDIT_COST} crédits)`);
      return NextResponse.json(
        {
          error: "Solde de crédits insuffisant pour générer la visite vidéo 4K.",
          required: VIDEO_CREDIT_COST,
          balance: userBalance,
        },
        { status: 402 } // HTTP 402 Payment Required -> Déclenche la modal Mobile Money
      );
    }

    const deductRes = await deductCredits(targetUserId, VIDEO_CREDIT_COST, "VIDEO_DRONE_I2V");
    if (!deductRes.success) {
      return NextResponse.json(
        { error: deductRes.error || "Échec du prélèvement de crédits." },
        { status: 402 }
      );
    }

    creditsDeducted = true;
    userIdToRefund = targetUserId;

    // ── 2. ENREGISTREMENT DU JOB EN BDD (Statut: processing) ──
    const jobRes = await query(
      `INSERT INTO render_jobs (project_id, user_id, media_type, prompt, style, status, media_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        projectId || null,
        targetUserId,
        "video",
        cameraMotion || "orbit_flythrough",
        style || "photorealistic_luxury",
        "processing",
        null
      ]
    );

    const jobId = jobRes.rows[0]?.id || `job_${Date.now()}`;
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://archicambtp.cm"}/api/webhooks/fal-video`;

    // ── 3. APPEL API FAL.AI LUMA DREAM MACHINE (I2V) ──
    if (falApiKey && !falApiKey.startsWith("mock")) {
      console.log(`[API Video] Envoi de l'ordre d'animation I2V vers FAL.ai (Job ID: ${jobId})...`);

      const falRes = await fetch("https://api.fal.ai/v1/fal-ai/luma-dream-machine/image-to-video", {
        method: "POST",
        headers: {
          "Authorization": `Key ${falApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: `Cinematic 4K architectural drone flythrough, smooth camera motion ${cameraMotion || "orbit"}, luxury tropical estate, daylight ray tracing`,
          image_url: sourceImage,
          aspect_ratio: "16:9",
          webhook_url: `${webhookUrl}?jobId=${jobId}&userId=${targetUserId}`
        })
      });

      if (falRes.ok) {
        const falData = await falRes.json();
        const requestId = falData.request_id || jobId;

        await query(
          `UPDATE render_jobs SET fal_request_id = $1 WHERE id = $2`,
          [requestId, jobId]
        );

        return NextResponse.json({
          success: true,
          jobId,
          requestId,
          status: "processing",
          message: "Visite virtuelle vidéo 4K en cours de génération dans le Cloud GPU...",
          remainingBalance: deductRes.balance,
        });
      }
    }

    // ── MOCK / FALLBACK LOCAL DÉVELOPPEMENT ──
    console.log(`[API Video] Mode Mock/Fallback actif pour le Job ID: ${jobId}`);
    setTimeout(async () => {
      await query(
        `UPDATE render_jobs 
         SET status = 'completed', media_url = $1, updated_at = NOW() 
         WHERE id = $2`,
        ["/sample_drone_tour.mp4", jobId]
      );
    }, 4000);

    return NextResponse.json({
      success: true,
      jobId,
      status: "processing",
      videoUrl: "/sample_drone_tour.mp4",
      remainingBalance: deductRes.balance,
    });

  } catch (error: any) {
    console.error("[API Video] Erreur serveur lors de l'animation vidéo :", error);

    // REMBURSEMENT AUTOMATIQUE EN CAS DE CRASH SERVEUR
    if (creditsDeducted && userIdToRefund) {
      console.warn(`[API Video] Déclenchement du remboursement automatique de ${VIDEO_CREDIT_COST} crédits pour ${userIdToRefund}...`);
      await refundCredits(userIdToRefund, VIDEO_CREDIT_COST, "Échec serveur rendu vidéo");
    }

    return NextResponse.json(
      { error: "Erreur serveur lors de la génération vidéo." },
      { status: 500 }
    );
  }
}
