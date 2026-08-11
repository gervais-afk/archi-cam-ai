import { RenderVersionManager } from "@/lib/versioning/render-history";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = params;

    if (!projectId) {
      return Response.json({ error: "Missing projectId" }, { status: 400 });
    }

    const versions = await RenderVersionManager.getVersionHistory(projectId);

    // Récupérer le numéro de version correspondant à la mediaUrl actuelle du dernier RenderJob
    let currentVersionNumber = null;
    const lastJobRows = (await (prisma as any).$queryRawUnsafe(
      `SELECT "media_url" FROM "render_jobs" WHERE "project_id" = $1 ORDER BY "updated_at" DESC LIMIT 1`,
      projectId
    )) as any[];

    if (lastJobRows && lastJobRows.length > 0 && lastJobRows[0].media_url) {
      const matchedVersion = versions.find((v) => v.imageUrl === lastJobRows[0].media_url);
      if (matchedVersion) {
        currentVersionNumber = matchedVersion.versionNumber;
      }
    }

    if (currentVersionNumber === null && versions.length > 0) {
      currentVersionNumber = versions[0].versionNumber;
    }

    return Response.json({ versions, currentVersionNumber });
  } catch (err: any) {
    console.error("[API Version History] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
