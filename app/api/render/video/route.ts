import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, prompt, style } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Le paramètre 'prompt' est requis." },
        { status: 400 }
      );
    }

    // 1. Insertion de la tâche de rendu en base de données PostgreSQL (Cloud SQL)
    const dbResult = await query(
      `INSERT INTO render_jobs (project_id, media_type, prompt, style, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status`,
      [projectId || null, "video", prompt, style || "modern", "processing"]
    );

    const job = dbResult.rows[0];

    if (!job) {
      console.error("Erreur insertion job : Aucune ligne retournée.");
      return NextResponse.json(
        { error: "Impossible de créer la tâche de rendu en base de données." },
        { status: 500 }
      );
    }

    const jobId = job.id;

    // 2. Lancement asynchrone de la simulation du rendu Veo 3 (non bloquant)
    (async () => {
      try {
        console.log(`[Veo 3 Polling Engine] Démarrage du rendu en arrière-plan pour le job: ${jobId}`);
        
        // Simulation d'une attente de 20 secondes (temps de traitement Veo 3)
        await new Promise((resolve) => setTimeout(resolve, 20000));

        // Ajout d'une touche locale camerounaise dans la simulation de génération
        const promptLower = prompt.toLowerCase();
        let mockVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-exterior-42247-large.mp4"; // video moderne par défaut
        
        if (promptLower.includes("interieur") || promptLower.includes("intérieur") || promptLower.includes("salon")) {
          // Vidéo d'intérieur premium (Mixkit)
          mockVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-living-room-of-a-modern-apartment-43037-large.mp4";
        }

        // 3. Mise à jour de la tâche en 'completed' avec l'URL de la vidéo dans Cloud SQL
        await query(
          `UPDATE render_jobs 
           SET status = $1, media_url = $2, updated_at = NOW() 
           WHERE id = $3`,
          ["completed", mockVideoUrl, jobId]
        );
        console.log(`[Veo 3 Background] Job de rendu ${jobId} complété avec succès !`);
      } catch (err: any) {
        console.error(`[Veo 3 Background] Échec critique du job ${jobId}:`, err);
        try {
          await query(
            `UPDATE render_jobs 
             SET status = $1, error_message = $2, updated_at = NOW() 
             WHERE id = $3`,
            ["failed", err?.message || "Erreur inconnue en tâche de fond", jobId]
          );
        } catch (dbErr) {
          console.error(`[Veo 3 Background] Erreur lors de l'enregistrement de l'échec du job ${jobId}:`, dbErr);
        }
      }
    })();

    // 4. Réponse immédiate avec le jobId et le statut initial
    return NextResponse.json(
      { jobId: jobId, status: "processing" },
      { status: 202 } // 202 Accepted
    );
  } catch (error: any) {
    console.error("Erreur API Render Video:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'initiation du rendu." },
      { status: 500 }
    );
  }
}
