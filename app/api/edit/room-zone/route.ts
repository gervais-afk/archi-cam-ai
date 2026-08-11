/**
 * ROOM ZONE INPAINTING — ARCHI CAM AI
 * ══════════════════════════════════════════════════════════════
 * Endpoint : Modification locale d'une texture / du mobilier
 * d'une pièce précise sans toucher aux murs ni aux pièces adjacentes.
 *
 * Utilise : fal-ai/flux-fill (inpainting localisé par masque binaire)
 *
 * Scénario : "Je veux ce salon en parquet clair, pas en bois foncé."
 *   1. VIM TopologyBuilder génère le masque PNG de la pièce concernée
 *   2. Cet endpoint reçoit le masque + le nouveau prompt
 *   3. Flux-Fill régénère UNIQUEMENT la zone masquée
 *   4. La géométrie (murs, angles) est préservée à 100%
 */

import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

// Configuration SDK côté serveur
function configureFal() {
  const apiKey = process.env.FAL_KEY || "";
  if (!apiKey) throw new Error("[RoomEdit] FAL_KEY manquante dans .env.local");
  fal.config({ credentials: apiKey });
}

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 1 minute max (inpainting localisé, rapide)

interface RoomEditRequest {
  fullImageUrl: string;   // URL de l'image complète déjà générée (2K)
  roomMaskUrl:  string;   // Masque binaire PNG de la pièce (blanc=zone à modifier, noir=reste)
  newPrompt:    string;   // Description de la nouvelle texture/mobilier
  roomLabel?:   string;   // Nom de la pièce (pour les logs / métriques)
  strength?:    number;   // Intensité de la modification (0.5 = subtil → 1.0 = radical)
}

export async function POST(req: NextRequest) {
  configureFal();

  let body: RoomEditRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête JSON invalide." }, { status: 400 });
  }

  const {
    fullImageUrl,
    roomMaskUrl,
    newPrompt,
    roomLabel = "Pièce inconnue",
    strength = 0.75,
  } = body;

  if (!fullImageUrl || !roomMaskUrl || !newPrompt) {
    return NextResponse.json(
      { error: "fullImageUrl, roomMaskUrl et newPrompt sont requis." },
      { status: 400 }
    );
  }

  // Validation de force : 0.4 (très subtil) → 0.95 (transformation maximale)
  const clampedStrength = Math.min(0.95, Math.max(0.4, strength));

  console.log(`[RoomEdit] 🎨 Inpainting → "${roomLabel}" | Prompt: "${newPrompt.slice(0, 60)}..." | Force: ${clampedStrength}`);

  try {
    const startTime = Date.now();

    const result: any = await fal.subscribe("fal-ai/flux-fill", {
      input: {
        image_url:        fullImageUrl,
        mask_image_url:   roomMaskUrl,
        prompt:           newPrompt,
        num_inference_steps: 25,
        guidance_scale:   6.0,
        strength:         clampedStrength,
        // Prompt négatif pour éviter que l'IA "casse" les murs adjacents
        negative_prompt:
          "broken walls, distorted geometry, blurry edges, wrong perspective, " +
          "modified adjacent rooms, artifacts, watermark",
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log(`[RoomEdit] ⏳ Flux-Fill génère "${roomLabel}"...`);
        }
      },
    });

    const editedImageUrl = result?.data?.images?.[0]?.url || result?.data?.image?.url;
    if (!editedImageUrl) {
      throw new Error("Aucune image renvoyée par Flux-Fill.");
    }

    const durationMs = Date.now() - startTime;
    console.log(`[RoomEdit] ✅ "${roomLabel}" modifiée en ${(durationMs / 1000).toFixed(1)}s → ${editedImageUrl}`);

    return NextResponse.json({
      success:        true,
      editedImageUrl,
      roomLabel,
      durationMs,
      engine:         "fal-ai/flux-fill",
      message:        `Zone "${roomLabel}" mise à jour. Géométrie préservée.`,
    });
  } catch (error: any) {
    console.error("[RoomEdit] ❌ Erreur Flux-Fill :", error.body || error.message || error);
    return NextResponse.json(
      {
        success: false,
        error:   error.body?.detail || error.message || "Erreur lors de la modification de la pièce.",
      },
      { status: 502 }
    );
  }
}
