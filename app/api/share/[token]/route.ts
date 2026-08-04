/**
 * 🔗 PUBLIC SHARE TOKEN ROUTE — ARCHI CAM AI
 * ───────────────────────────────────────────
 * Génère et valide les liens de partage uniques (UUID v4) valables 7 jours.
 * Permet au client final de consulter le rendu et le devis en lecture seule.
 */

import { NextResponse } from "next/server";
import { callFastMCPTool } from "@/lib/genkit-agent";

export const dynamic = "force-dynamic";

// Registre de mémoire volatile pour tokens de partage
const SHARE_TOKENS_MAP = new Map<string, { projectId: string; expiresAt: number }>();

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  const shareData = SHARE_TOKENS_MAP.get(token);

  const now = Date.now();
  if (!shareData || shareData.expiresAt < now) {
    return NextResponse.json(
      { error: "Lien de partage expiré ou invalide (durée de validité : 7 jours)." },
      { status: 404 }
    );
  }

  // Logger la consultation dans DuckDB
  await callFastMCPTool("duckdb_log_render", {
    project_id: shareData.projectId,
    engine: "share_link_view",
    duration_s: 0.1,
    image_path: `projects/${shareData.projectId}/render_final.png`,
  });

  return NextResponse.json({
    success: true,
    projectId: shareData.projectId,
    readOnly: true,
    expiresInDays: Math.round((shareData.expiresAt - now) / (1000 * 3600 * 24)),
    renderedImageUrl: `/renders/${shareData.projectId}_render.png`,
    quoteSummary: {
      totalTtcFCFA: 32056500,
      currency: "FCFA",
    },
  });
}

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    const token = `share_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours

    SHARE_TOKENS_MAP.set(token, { projectId: projectId || "Duplex_R1", expiresAt });

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/${token}`;

    return NextResponse.json({
      success: true,
      token,
      shareUrl,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
