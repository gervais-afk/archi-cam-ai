import { fal } from "@fal-ai/client";

export interface FalControlNetParams {
  cannyImageUrl: string;            // Masque Canny (backup)
  colorPlanImageUrl?: string;       // Plan pré-coloré 2D (SOURCE PRINCIPALE)
  positivePrompt: string;
  negativePrompt?: string;
  conditioningScale?: number;
  imageSize?: string | { width: number; height: number };
}

/**
 * ARCHITECTURAL FAL.AI ENGINE v2 — Stratégie Plan Pré-Coloré (Archi Cam AI)
 *
 * PROBLÈME RÉSOLU : fal-ai/flux-general génère de la 3D isométrique par nature.
 * Les prompts "top-down" sont insuffisants pour contraindre FLUX.
 *
 * NOUVELLE STRATÉGIE (ce que font les experts) :
 * 1. Python génère un plan 2D pré-coloré (semantic_rooms_map.png)
 * 2. On envoie ce plan coloré à Fal.ai img2img avec strength=0.35
 * 3. À 35% de débruitage, l'IA garde 65% de la structure 2D exacte
 * 4. Le résultat est fidèle géométriquement ET esthétiquement beau
 */

function getFalKeys(): string[] {
  const keys: string[] = [];
  if (process.env.FAL_KEY) keys.push(process.env.FAL_KEY);
  if (process.env.FAL_KEY_SECONDARY) keys.push(process.env.FAL_KEY_SECONDARY);
  if (process.env.FAL_AI_KEY) keys.push(process.env.FAL_AI_KEY);
  const userBackupKey = "323b03bd-e5d5-4a5d-8df3-f9f2fb37cb29:b1cf83b858cb87a82a8bfa8cfda2f1bc";
  if (!keys.includes(userBackupKey)) keys.push(userBackupKey);
  return keys;
}

/** Upload base64 sur Fal Storage et retourne l'URL cloud */
async function uploadToFalStorage(dataUri: string, filename: string): Promise<string | null> {
  try {
    if (dataUri.startsWith("data:image")) {
      const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileObj = new File([buffer], filename, { type: "image/png" });
      const url = await fal.storage.upload(fileObj);
      return url;
    }
    return dataUri;
  } catch (err: any) {
    console.warn(`[Fal Upload] Erreur upload ${filename}:`, err?.message);
    return null;
  }
}

export async function generateFalControlNetRender(params: FalControlNetParams): Promise<string | null> {
  const falKeys = getFalKeys();
  if (falKeys.length === 0) {
    console.warn("[Fal ControlNet] Aucune clé FAL_KEY configurée.");
    return null;
  }

  for (let i = 0; i < falKeys.length; i++) {
    const currentKey = falKeys[i];
    try {
      fal.config({ credentials: currentKey });
      console.log(`[Fal ControlNet] 🚀 Tentative Rendu Fal.ai (Clé #${i + 1}/${falKeys.length})...`);

      const strict2DPrompt = [
        "Colored 2D architectural floor plan rendering, top-down view with realistic textures,",
        "vibrant colored interior rooms seen from directly above, warm wooden floors in living areas, tiled bathrooms,",
        "green terrace area visible, furnished with realistic sofa and furniture symbols,",
        "warm interior lighting simulation, professional architecture magazine quality,",
        "flat lay photography of a house layout, no outline, no wireframe, no sketch style, full color RGB image,",
        params.positivePrompt
      ].join(" ");

      const strictNegative2D = [
        "black and white, monochrome, wireframe, edges only, blueprint style, line drawing,",
        "engineering diagram, technical sketch, white lines on dark background, silhouette,",
        "isometric, 3D perspective, angled view, diagonal view, fisheye, wide angle,",
        "3D tilt, depth of field, shadows from side, exterior view, portrait orientation,",
        "open floor plan, merged rooms, missing walls, demolished interior walls,",
        "studio apartment, loft, no partitions, transparent walls,",
        "blurry, low quality, watermark, text overlay,",
        params.negativePrompt || "distorted walls, extra rooms, wrong layout"
      ].join(" ");

      const targetImageSize = params.imageSize || { width: 768, height: 1088 };

      // ═══════════════════════════════════════════════════════════════════════
      // STRATÉGIE 1 : Fal.ai Flux ControlNet Canny Pur (Fidélité 1:1 & Rendu HD)
      // C'est la méthode de référence : on utilise le masque Canny avec une force
      // de débruitage très élevée (0.95) pour générer un vrai plan réaliste.
      // ═══════════════════════════════════════════════════════════════════════
      try {
        console.log("[Fal ControlNet] 🗺️ STRATÉGIE 1 — Flux ControlNet Canny Pur (strength dispatch)...");
        const cannyUrl = await uploadToFalStorage(params.cannyImageUrl, `canny_mask_${Date.now()}.png`);
        
        // Upload du plan coloré pour guider les pièces sémantiquement
        const colorPlanUrl = params.colorPlanImageUrl
          ? await uploadToFalStorage(params.colorPlanImageUrl, `color_plan_${Date.now()}.png`)
          : null;

        if (cannyUrl) {
          console.log(`[Fal ControlNet] ☁️ Masque Canny 8px uploadé → ${cannyUrl}`);
          
          // Réglage intelligent de la force de débruitage (strength) :
          // - Si plan coloré : 0.78 (compromis industriel, garde la couleur et dessine les meubles)
          // - Si Canny uniquement : 0.95 (force élevée pour effacer le fond noir du masque Canny)
          const chosenStrength = colorPlanUrl ? 0.78 : 0.95;
          
          if (colorPlanUrl) {
            console.log(`[Fal ControlNet] ☁️ Plan pré-coloré détecté → Utilisation d'un strength optimal de ${chosenStrength} (Option C)`);
          } else {
            console.log(`[Fal ControlNet] ⚠️ Plan pré-coloré absent → Utilisation d'un strength élevé de ${chosenStrength} pour effacer le fond noir`);
          }
          
          const result: any = await fal.subscribe("fal-ai/flux-general", {
            input: {
              image_url: colorPlanUrl || cannyUrl,
              control_image_url: cannyUrl,
              controlnet_name: "canny",
              prompt: strict2DPrompt,
              negative_prompt: strictNegative2D,
              strength: chosenStrength,
              conditioning_scale: 0.95, // Conserve strictement la forme des cloisons
              guidance_scale: 7.5,
              num_inference_steps: 30,
              image_size: targetImageSize
            } as any,
            logs: true,
          });

          const imageUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
          if (imageUrl) {
            console.log(`[Fal ControlNet] ✅ STRATÉGIE 1 SUCCÈS — Plan 2D HD généré (strength: ${chosenStrength}) → ${imageUrl}`);
            return imageUrl;
          }
        }
      } catch (err1: any) {
        console.warn(`[Fal ControlNet] Notice Stratégie 1 (ControlNet Canny Pur) :`, err1?.message || err1);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STRATÉGIE 2 : Plan Sémantique Pré-Coloré → img2img strength=0.75
      // Dénouement réaliste des pièces de couleur.
      // ═══════════════════════════════════════════════════════════════════════
      const colorPlanSource = params.colorPlanImageUrl || params.cannyImageUrl;
      if (colorPlanSource) {
        try {
          console.log("[Fal ControlNet] 🎨 STRATÉGIE 2 — Plan pré-coloré → img2img (strength=0.75)...");
          const colorPlanUrl = await uploadToFalStorage(colorPlanSource, `color_plan_${Date.now()}.png`);
          if (colorPlanUrl) {
            console.log(`[Fal ControlNet] ☁️ Plan pré-coloré uploadé → ${colorPlanUrl}`);
            const result: any = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
              input: {
                image_url: colorPlanUrl,
                prompt: strict2DPrompt,
                negative_prompt: strictNegative2D,
                strength: 0.75, // Force de modification de 75% pour remplacer les couleurs par des meubles
                guidance_scale: 4.5,
                num_inference_steps: 28,
                image_size: targetImageSize
              } as any,
              logs: true,
            });
            const imageUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
            if (imageUrl) {
              console.log(`[Fal ControlNet] ✅ STRATÉGIE 2 SUCCÈS — Rendu coloré sémantique → ${imageUrl}`);
              return imageUrl;
            }
          }
        } catch (err2: any) {
          console.warn(`[Fal ControlNet] Notice Stratégie 2 (img2img plan coloré) :`, err2?.message || err2);
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STRATÉGIE 3 : img2img simple sur masque Canny avec force élevée (0.80)
      // ═══════════════════════════════════════════════════════════════════════
      try {
        console.log("[Fal ControlNet] 🔄 STRATÉGIE 3 — Canny → img2img (strength=0.80)...");
        const cannyUrl = await uploadToFalStorage(params.cannyImageUrl, `canny_fallback_${Date.now()}.png`);
        if (cannyUrl) {
          const result: any = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
            input: {
              image_url: cannyUrl,
              prompt: strict2DPrompt,
              negative_prompt: strictNegative2D,
              strength: 0.80, // Force élevée pour éviter l'effet fond noir
              guidance_scale: 4.5,
              num_inference_steps: 28,
              image_size: targetImageSize
            } as any,
            logs: true,
          });
          const imageUrl = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
          if (imageUrl) {
            console.log(`[Fal ControlNet] ✅ STRATÉGIE 3 SUCCÈS → ${imageUrl}`);
            return imageUrl;
          }
        }
      } catch (err3: any) {
        console.warn(`[Fal ControlNet] Notice Stratégie 3 (img2img fallback) :`, err3?.message || err3);
      }

    } catch (keyErr: any) {
      console.warn(`[Fal ControlNet] ⚠️ Clé #${i + 1} indisponible :`, keyErr?.message || keyErr);
    }
  }

  return null;
}
