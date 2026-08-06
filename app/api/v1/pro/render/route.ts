import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { authenticateAPIKey } from "@/lib/auth/api-key";

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("X-API-Key");
    const user = await authenticateAPIKey(apiKey);

    if (!user || user.role !== "ENTERPRISE") {
      return Response.json({ error: "Clé API invalide ou compte non-PRO" }, { status: 401 });
    }

    const body = await req.json();
    const { imageBase64, renderMode, stylePreset, callbackUrl, metadata } = body;

    if (!imageBase64 || !renderMode) {
      return Response.json({ error: "Paramètres manquants: imageBase64 ou renderMode requis" }, { status: 400 });
    }

    const projectId = "api_proj_" + Date.now();
    const jobId = randomUUID();

    // Enregistrer le RenderJob en BDD
    await prisma.$executeRawUnsafe(
      `INSERT INTO "render_jobs" ("id", "project_id", "user_id", "media_type", "status", "media_url", "created_at", "updated_at")
       VALUES ($1, $2, $3, 'image', 'processing', NULL, NOW(), NOW())`,
      jobId,
      projectId,
      user.id
    );

    // Enregistrer le webhook si callbackUrl est présent
    if (callbackUrl) {
      const webhookId = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "webhooks" ("id", "project_id", "url", "event", "secret", "created_at")
         VALUES ($1, $2, $3, 'RENDER_COMPLETED', $4, NOW())`,
        webhookId,
        projectId,
        callbackUrl,
        randomUUID()
      );
    }

    return Response.json({
      projectId,
      jobId,
      status: "QUEUED",
      estimatedCompletionTime: new Date(Date.now() + 45000).toISOString(),
      statusUrl: `http://127.0.0.1:3001/api/v1/pro/render?projectId=${projectId}`
    }, { status: 202 });
  } catch (err: any) {
    console.error("[API Pro Render POST] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const apiKey = req.headers.get("X-API-Key");
    const user = await authenticateAPIKey(apiKey);

    if (!user) {
      return Response.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!projectId) {
      return Response.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Récupérer le dernier RenderJob pour ce projet
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "project_id" as "projectId", "media_url" as "mediaUrl", status, "created_at" as "createdAt"
       FROM "render_jobs"
       WHERE "project_id" = $1 LIMIT 1`,
      projectId
    );

    if (!rows || rows.length === 0) {
      return Response.json({ error: "Projet introuvable" }, { status: 404 });
    }

    const job = rows[0];

    return Response.json({
      projectId: job.projectId,
      status: job.status,
      renderedImageUrl: job.mediaUrl || null,
      createdAt: job.createdAt
    });
  } catch (err: any) {
    console.error("[API Pro Render GET] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
