import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { LumaDreamMachineClient } from "@/lib/video/luma-dream-machine";

export async function POST(req: Request) {
  try {
    const { projectId, cameraPath } = await req.json();

    if (!projectId || !cameraPath) {
      return Response.json({ error: "Missing projectId or cameraPath" }, { status: 400 });
    }

    // 1. Initialiser le RenderJob vidéo
    const jobId = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "render_jobs" ("id", "project_id", "media_type", "status", "media_url", "created_at", "updated_at")
       VALUES ($1, $2, 'video', 'processing', NULL, NOW(), NOW())`,
      jobId,
      projectId
    );

    // 2. Lancer la génération Luma
    const luma = new LumaDreamMachineClient(process.env.LUMA_API_KEY || "");
    const result = await luma.generateDroneVideo({
      projectId,
      imageUrl: "http://example.com/mock_image.png",
      cameraPath,
      duration: 10
    });

    return Response.json({
      success: true,
      videoUrl: result.videoUrl,
      jobId: result.jobId,
      message: "Vidéo générée avec succès"
    });
  } catch (err: any) {
    console.error("[API Pro Video Generate] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
