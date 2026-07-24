import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Le paramètre 'jobId' est requis." },
        { status: 400 }
      );
    }

    // Récupération de l'état d'avancement du job dans Cloud SQL
    const dbResult = await query(
      `SELECT id, status, media_url AS "mediaUrl", error_message AS "errorMessage", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM render_jobs 
       WHERE id = $1`,
      [jobId]
    );

    const job = dbResult.rows[0];

    if (!job) {
      return NextResponse.json(
        { error: "Tâche de rendu introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      mediaUrl: job.mediaUrl || null,
      errorMessage: job.errorMessage || null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    });
  } catch (error: any) {
    console.error("Erreur API Check Video Status:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la vérification du statut." },
      { status: 500 }
    );
  }
}
