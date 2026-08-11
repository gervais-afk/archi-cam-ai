/**
 * ROUTE API : GÉNÉRATION D'IMAGE ARCHITECTURALE
 * ─────────────────────────────────────────────────────────────────────────────
 * Pipeline complet :
 *   1. Reçoit le plan vectoriel propre (sortie VIM/SCoT) + prompt utilisateur
 *   2. Enrichit le prompt avec les données BIM (pièces, labels, style)
 *   3. Appelle Fal.ai (Flux-Dev + ControlNet Canny @ 0.75)
 *   4. En cas d'échec Fal.ai → Fallback sur Replicate (ControlNet SDXL existant)
 *   5. En cas d'échec total → Renvoie le plan vectoriel brut (toujours un résultat)
 */

import { NextRequest, NextResponse } from "next/server";
import { FalAIClient } from "@/lib/fal-client";
import { generateControlNetWithReplicate } from "@/lib/replicate";

export const maxDuration = 60; // Vercel Pro/Hobby : 60 secondes max pour cette route

export async function POST(req: NextRequest) {
  let body: {
    vectorPlanUrl?: string;
    userPrompt?: string;
    scoData?: { rooms?: Array<{ label: string; area_m2: number }> };
  } = {};

  try {
    body = await req.json();
    const { vectorPlanUrl, userPrompt, scoData } = body;

    if (!vectorPlanUrl) {
      return NextResponse.json(
        { error: "vectorPlanUrl requis — le plan vectoriel SCoT est manquant." },
        { status: 400 }
      );
    }

    // Construction du prompt enrichi avec les données BIM (pièces issues du TopologyBuilder)
    const roomList = scoData?.rooms?.map((r) => `${r.label} (${r.area_m2}m²)`).join(", ") || "pièces non spécifiées";
    const enhancedPrompt = [
      "Architectural floor plan 2D render, top-down orthographic view.",
      `Building contains: ${roomList}.`,
      `Style: ${userPrompt || "plan professionnel minimaliste avec textures réalistes"}.`,
      "Constraints: perfectly straight and solid black structural wall lines,",
      "closed room polygons, realistic material textures (parquet bedrooms, tiles bathrooms, grass balconies),",
      "labels and room names legible, soft shadows, bright uniform lighting.",
      "8k resolution, architectural digest quality.",
    ].join(" ");

    const negativePrompt = "distorted walls, 3d perspective, messy lines, blurry, text errors, floating walls, open polygons";

    // ── ÉTAPE PRIMAIRE : Fal.ai (Flux-Dev + ControlNet Canny) ──────────────────
    console.log("[Route] 🎨 Tentative moteur primaire : Fal.ai...");
    try {
      const falClient = new FalAIClient();
      const result = await falClient.generateArchitecturalRender({
        sourceImageUrl: vectorPlanUrl,
        promptTexte: enhancedPrompt,
        negativePrompt,
      });

      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
        isFallback: false,
        engine: result.engine,
        durationMs: result.durationMs,
        message: `Rendu architectural généré (${(result.durationMs! / 1000).toFixed(1)}s)`,
      });
    } catch (falError: any) {
      console.warn("[Route] ⚠️ Fal.ai indisponible :", falError.message);
      // On tombe sur le fallback Replicate
    }

    // ── FALLBACK : Replicate (ControlNet SDXL — déjà opérationnel) ─────────────
    console.log("[Route] 🔁 Basculement sur Replicate (ControlNet SDXL)...");
    const replicateToken = process.env.REPLICATE_API_TOKEN || "";

    if (replicateToken) {
      try {
        const replicateResult = await generateControlNetWithReplicate(
          vectorPlanUrl,
          enhancedPrompt,
          negativePrompt,
          replicateToken
        );

        if (replicateResult) {
          return NextResponse.json({
            success: true,
            imageUrl: replicateResult,
            isFallback: true,
            engine: "Replicate ControlNet SDXL (fallback)",
            message: "Rendu généré via Replicate (moteur de secours).",
          });
        }
      } catch (repError: any) {
        console.warn("[Route] ⚠️ Replicate indisponible :", repError.message);
      }
    }

    // ── FALLBACK ULTIME : Plan vectoriel brut ───────────────────────────────────
    // Le client reçoit toujours quelque chose, même si les GPU sont tous occupés.
    console.warn("[Route] 🛟 Affichage du plan vectoriel brut (fallback ultime).");
    return NextResponse.json({
      success: true,
      imageUrl: vectorPlanUrl,
      isFallback: true,
      engine: "Plan vectoriel brut (ControlNet indisponible)",
      warning: "Les moteurs de rendu GPU sont temporairement surchargés. Le plan technique reste exploitable.",
    });

  } catch (error: any) {
    console.error("[Route] ❌ Erreur critique :", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur serveur lors de la génération." },
      { status: 500 }
    );
  }
}
