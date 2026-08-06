import { RenderVersionManager } from "@/lib/versioning/render-history";

export async function POST(req: Request, { params }: { params: { projectId: string } }) {
  try {
    const { projectId } = params;
    const { versionId } = await req.json();

    if (!projectId || !versionId) {
      return Response.json({ error: "Missing projectId or versionId" }, { status: 400 });
    }

    const version = await RenderVersionManager.rollbackToVersion(projectId, versionId);

    return Response.json({ success: true, imageUrl: version.imageUrl, versionNumber: version.versionNumber });
  } catch (err: any) {
    console.error("[API Rollback] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
