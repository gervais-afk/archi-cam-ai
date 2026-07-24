import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, projectId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Le paramètre 'imageUrl' est requis." },
        { status: 400 }
      );
    }

    const animationPrompt = "Slow cinematic camera pan forward, 24fps";

    console.log(`[Veo 3.1 Animator] Initiation de l'animation pour l'image : ${imageUrl.slice(0, 50)}...`);

    // 1. Insertion de la tâche de rendu dans Cloud SQL
    const dbResult = await query(
      `INSERT INTO render_jobs (project_id, media_type, prompt, style, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status`,
      [projectId || null, "video", animationPrompt, "Veo 3.1 Animation", "processing"]
    );

    const job = dbResult.rows[0];

    if (!job) {
      console.error("[Veo 3.1 Animator] Erreur lors de la création du job.");
      return NextResponse.json(
        { error: "Impossible de créer la tâche d'animation en base de données." },
        { status: 500 }
      );
    }

    const jobId = job.id;

    // 2. Lancement du worker asynchrone pour simuler l'animation de l'image (20s)
    (async () => {
      try {
        console.log(`[Veo 3.1 Background] Traitement de l'animation de l'image pour le job ${jobId}...`);
        
        // Simulation du rendu Veo 3.1 (20 secondes)
        await new Promise((resolve) => setTimeout(resolve, 20000));

        // Sélection d'une vidéo d'architecture d'intérieur ou d'extérieur
        const mockVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-exterior-42247-large.mp4";

        // 3. Mise à jour de la tâche en 'completed' dans Cloud SQL
        await query(
          `UPDATE render_jobs 
           SET status = $1, media_url = $2, updated_at = NOW() 
           WHERE id = $3`,
          ["completed", mockVideoUrl, jobId]
        );
        console.log(`[Veo 3.1 Background] Job d'animation ${jobId} complété avec succès !`);
      } catch (err: any) {
        console.error(`[Veo 3.1 Background] Échec du job ${jobId}:`, err);
        try {
          await query(
            `UPDATE render_jobs 
             SET status = $1, error_message = $2, updated_at = NOW() 
             WHERE id = $3`,
            ["failed", err?.message || "Erreur lors de l'animation", jobId]
          );
        } catch (dbErr) {
          console.error(`[Veo 3.1 Background] Erreur d'enregistrement d'échec :`, dbErr);
        }
      }
    })();

    // 4. Retour immédiat du jobId au client
    return NextResponse.json(
      { jobId: jobId, status: "processing" },
      { status: 202 } // 202 Accepted
    );

  } catch (error: any) {
    console.error("Erreur API Animate:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors du lancement de l'animation." },
      { status: 500 }
    );
  }
}
