import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { projectId, renderId, rating, feedback, metadata } = await req.json();

    if (!projectId || rating === undefined) {
      return Response.json({ error: "Missing projectId or rating" }, { status: 400 });
    }

    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "render_feedbacks" ("id", "project_id", "render_id", "rating", "feedback", "metadata", "created_at")
       VALUES ($1, $2, $3, $4, $5, CAST($6 AS jsonb), NOW())`,
      id,
      projectId,
      renderId || null,
      Number(rating),
      feedback || null,
      metadata ? JSON.stringify(metadata) : null
    );

    return Response.json({ success: true, id });
  } catch (err: any) {
    console.error("[API Feedback] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
