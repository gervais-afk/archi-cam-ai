import { NextResponse } from "next/server";
import { verifyFirebaseToken } from "@/lib/auth/verify-firebase-token";
import { classifyModification } from "@/lib/agents/modification-classifier";
import { executeModification } from "@/lib/agents/modification-engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await verifyFirebaseToken(request);
  if (!session.authenticated) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, message, currentRender, currentRooms, currentQuote } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Le message d'instruction est requis." }, { status: 400 });
    }

    // 1. Classification ultra-rapide (< 500ms)
    const classified = await classifyModification({
      userMessage: message,
      projectId: projectId || "proj_demo",
      currentRender: currentRender || "/renders/default.png",
      currentRooms: currentRooms || [{ id: "r1", name: "Salon", area_m2: 30 }],
      currentQuote: currentQuote || { total_ht: 25000000, tva: 4812500, total_ttc: 29812500 },
    });

    console.log(`[API Agent Modify] 🎯 Classification: level=${classified.level}, action=${classified.action}, estTime=${classified.estimatedTime}s`);

    // 2. Exécution du niveau correspondant
    const result = await executeModification(classified, {
      userMessage: message,
      projectId: projectId || "proj_demo",
      currentRender: currentRender || "/renders/default.png",
      currentRooms: currentRooms || [{ id: "r1", name: "Salon", area_m2: 30 }],
      currentQuote: currentQuote || { total_ht: 25000000, tva: 4812500, total_ttc: 29812500 },
    });

    return NextResponse.json({
      jobId: `mod_${Date.now()}`,
      level: classified.level,
      estimatedTime_s: classified.estimatedTime,
      costImpact: classified.costImpact,
      action: classified.action,
      newValue: classified.newValue,
      result,
    });
  } catch (err: any) {
    console.error("[API Agent Modify Error]:", err);
    return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
  }
}
