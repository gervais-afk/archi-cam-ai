import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { RenderVersionManager } from "@/lib/versioning/render-history";

export async function GET() {
  try {
    const projectId = "test_proj_" + Date.now();

    // 1. Initialiser un RenderJob factice
    const jobId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "render_jobs" ("id", "project_id", "media_type", "status", "media_url", "created_at", "updated_at")
       VALUES ($1, $2, 'image', 'completed', 'http://example.com/v1.png', NOW(), NOW())`,
      jobId,
      projectId
    );

    // 2. Enregistrer Version 1
    const v1 = await RenderVersionManager.saveVersion(projectId, {
      imageUrl: "http://example.com/v1.png",
      renderMode: "RENDER_3D_FURNISHED_LUXE_TROPICAL",
      stylePreset: "luxe_tropical",
      geometryHash: "hash_v1_123"
    });

    // 3. Enregistrer Version 2
    const v2 = await RenderVersionManager.saveVersion(projectId, {
      imageUrl: "http://example.com/v2.png",
      renderMode: "RENDER_3D_INTERIOR_PERSPECTIVE",
      stylePreset: "architect_pro",
      geometryHash: "hash_v2_456"
    });

    // 4. Récupérer l'historique
    const history = await RenderVersionManager.getVersionHistory(projectId);

    // 5. Rollback vers v1
    const rollback = await RenderVersionManager.rollbackToVersion(projectId, v1.id);

    // Vérifier la mise à jour
    const checkJob: any = await (prisma as any).$queryRawUnsafe(
      `SELECT "media_url" FROM "render_jobs" WHERE "project_id" = $1 LIMIT 1`,
      projectId
    );

    return Response.json({
      success: true,
      projectId,
      v1,
      v2,
      history,
      rollback,
      updatedJobMediaUrl: checkJob[0].media_url
    });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
