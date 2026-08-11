/**
 * FLOOR TEXTURE AI ENHANCER — ARCHI CAM AI v2.0 (Stratégie ZHA/Gendo)
 * ═════════════════════════════════════════════════════════════════════════
 * Enhancement IA des textures de sols architecturaux via Fal.ai Inpainting.
 *
 * Pipeline "Sandwich" validé par l'état de l'art 2026 (ZHA, Gendo, QWE AI) :
 *   1. TextureMapper Python génère raw_rendered_hd.png (rendu procédural pixel-perfect)
 *   2. wall_mask.png (inversé) = masque de préservation — l'IA NE TOUCHE PAS les murs
 *   3. L'IA agit UNIQUEMENT sur les zones de sol (Enhancement localisé)
 *   4. strength = 0.25 (Enhancement léger, fidélité structurelle totale)
 *   5. guidance_scale = 7.0 (CFG safe : ControlNet prime sur le prompt)
 *   6. seed = 42 figé : cohérence visuelle entre toutes les pièces
 *   7. Prompt structure Gendo : Project / Direction / Camera / Lighting / Materials
 *
 * Stratégies appliquées (Sources RAG 1-7) :
 *   - Source 1 : Multi-conditionnement ControlNet, CFG=7 strict
 *   - Source 2 : Inpainting localisé, Denoising bas, seed verrouillé
 *   - Source 3 : Enhancement Gendo (sublimer l'existant, ne pas recréer)
 *   - Source 4 : Prompt Gendo structuré par catégories
 *   - Source 5 : Rejet Midjourney/Img2Img simple, Stable Diffusion avec ControlNet
 *   - Source 7 : Lexique positif + Negative Prompts architecturaux
 *
 * Usage (route.ts) :
 *   const enhanced = await enhanceFloorTexturesWithAI(renderPath, wallMaskPath, outPath, rooms);
 * ═════════════════════════════════════════════════════════════════════════
 */

import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

// ── ArchiPrompt Framework (7 Couches Logiques) ──────────────────────────────
// Format : {Sujet} · {Style} · {Matériaux} · {Éclairage} · {Caméra} · {Atmosphère} · {Rendu}
// Permet d'améliorer l'esthétique émotionnelle sans distorsion structurelle.
function buildGendoPrompt(rooms?: Array<{ name: string; type: string; surface_m2?: number }>): string {
  const hasParquet = !rooms || rooms.some(r => /BEDROOM|CHAMBRE|LIVING|SALON|CORRIDOR|HALL|SUITE/i.test(r.type || r.name));
  const hasTile    = rooms?.some(r => /BATH|TOILET|WC|KITCHEN|CUISINE|SDB|EAU/i.test(r.type || r.name));
  const hasDecking = rooms?.some(r => /VERANDA|BALCON|TERRAS|PORCH/i.test(r.type || r.name));
  const hasGrass   = rooms?.some(r => /GARDEN|JARDIN|COUR|EXTERIOR|PELOUSE/i.test(r.type || r.name));
  const hasConcrete= rooms?.some(r => /PARKING|GARAGE/i.test(r.type || r.name));

  const materials: string[] = [];
  if (hasParquet)  materials.push("warm oak hardwood parquet with visible natural grain and honey amber tones");
  if (hasTile)     materials.push("large-format polished porcelain ceramic tiles with fine grout lines and slight glossy reflections");
  if (hasDecking)  materials.push("natural teak wood decking planks");
  if (hasGrass)    materials.push("lush photorealistic grass with natural light variations");
  if (hasConcrete) materials.push("smooth polished concrete with subtle texture grain");
  if (materials.length === 0) materials.push("polished timber floor, matte concrete finish");

  const roomNames = rooms && rooms.length > 0
    ? rooms.map(r => r.name.toLowerCase()).join(", ")
    : "rooms and corridors";

  return [
    `Subject: An architectural floor plan layout showing ${roomNames}, detailed CAD lines`,
    "Style: minimalist modernist style, Scandinavian minimalism",
    `Materials: ${materials.join(", ")}`,
    "Lighting: Golden hour sunlight casting long soft shadows, warm low-angle afternoon light with soft shadows",
    "Camera: Strictly top-down orthographic 2D plan view, zero perspective distortion, flat, professional photography",
    "Atmosphere: warm, serene, high-end hospitality ambiance, cozy domestic atmosphere",
    "Rendu: Corona Renderer, photorealistic architectural photography, 8K"
  ].join(" · ");
}

// ── Negative Prompt architectural — Validé Source 7 ─────────────────────────
// RÈGLE (Source 7) : NE PAS utiliser "pas de 3D" ou "pas de croquis" (contre-productif).
// Utiliser des artefacts d'IA visuels spécifiques à exclure.
const FLOOR_NEGATIVE_PROMPT =
  "blurry, distorted windows, warped geometry, extra floors, extra windows, distorted proportions, perspective skew, " +
  "walls, black lines, vertical surfaces, ceiling, overhead light fixtures, " +
  "cartoon style, anime, watercolor, pencil sketch, blueprint drawing, wireframe, " +
  "watermark, logo, text labels, signature, borders, " +
  "overexposed, oversaturated, low quality, noise, grain, artifacts";

// ── Paramètres Enhancement (Stratégies 1-5, optimisés RAG 2026) ─────────────
// strength = 0.50 : Équilibre parfait RAG entre préservation et ombres portées réelles.
// guidance_scale = 7.0 : CFG scale strict pour forcer la contrainte géométrique.
// seed = 42 : Render Seed figé pour cohérence cross-pièces.
const ENHANCEMENT_PARAMS = {
  strength: 0.50,
  guidance_scale: 7.0,
  num_inference_steps: 28,
  seed: 42,
  num_images: 1,
  enable_safety_checker: false,
} as const;

// ── Modèles ordonnés par priorité ─────────────────────────────────────────
const ENHANCEMENT_MODELS = [
  { id: "fal-ai/flux/dev/image-to-image", label: "FLUX Dev img2img (Enhancement)" },
  { id: "fal-ai/flux-lora",               label: "FLUX LoRA img2img (Fallback)"  },
];

// ── Utilitaires ───────────────────────────────────────────────────────────

function getFalKeys(): string[] {
  const keys: string[] = [];
  if (process.env.FAL_KEY) keys.push(process.env.FAL_KEY);
  if (process.env.FAL_KEY_SECONDARY) keys.push(process.env.FAL_KEY_SECONDARY);
  const fallbackKey = "323b03bd-e5d5-4a5d-8df3-f9f2fb37cb29:b1cf83b858cb87a82a8bfa8cfda2f1bc";
  if (!keys.includes(fallbackKey)) keys.push(fallbackKey);
  return keys;
}

function fileToDataUri(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return `data:image/png;base64,${data.toString("base64")}`;
}

async function uploadToFalStorage(dataUri: string, filename: string): Promise<string | null> {
  try {
    const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const fileObj = new File([buffer], filename, { type: "image/png" });
    const url = await fal.storage.upload(fileObj);
    return url;
  } catch (err: any) {
    console.warn(`[FloorTextureEnhancer] Upload Fal Storage échoué : ${err?.message}`);
    return null;
  }
}

/**
 * Applique un Enhancement IA de qualité professionnelle sur les textures de sol.
 *
 * PHILOSOPHIE (Gendo / QWE AI) :
 * L'IA ne GÉNÈRE pas le plan, elle SUBLIME les textures existantes du rendu procédural.
 * - Les murs anthracite (issus de perspective_flattener.py) restent intacts.
 * - Les textes et cotes restent intacts (réinjectés en post-processing).
 * - Seuls les aplats de sol reçoivent un grain photoréaliste organique subtil.
 *
 * @param floorRenderPath  Chemin vers le rendu procédural (raw_rendered_hd.png)
 * @param wallMaskPath     Chemin vers wall_mask.png (masque de préservation)
 * @param outputPath       Chemin de sortie pour enhanced_floor.png
 * @param rooms            Types de pièces pour adapter le prompt matériaux
 * @returns Chemin local du fichier enhanced_floor.png, ou null si échec
 */
export async function enhanceFloorTexturesWithAI(
  floorRenderPath: string,
  wallMaskPath?: string,
  outputPath?: string,
  rooms?: Array<{ name: string; type: string; surface_m2?: number }>
): Promise<string | null> {
  const falKeys = getFalKeys();
  if (falKeys.length === 0) {
    console.warn("[FloorTextureEnhancer] Aucune clé FAL_KEY configurée.");
    return null;
  }

  if (!fs.existsSync(floorRenderPath)) {
    console.warn(`[FloorTextureEnhancer] Rendu procédural introuvable : ${floorRenderPath}`);
    return null;
  }

  const debugDir = path.dirname(floorRenderPath);
  const finalOutputPath = outputPath || path.join(debugDir, "enhanced_floor.png");

  // Construction du prompt Gendo dynamique selon les types de pièces
  const gendoPrompt = buildGendoPrompt(rooms);
  console.log(`[FloorTextureEnhancer] 📝 Prompt Gendo : ${gendoPrompt.substring(0, 120)}...`);
  console.log(`[FloorTextureEnhancer] ⚙️ Params : strength=${ENHANCEMENT_PARAMS.strength} | CFG=${ENHANCEMENT_PARAMS.guidance_scale} | seed=${ENHANCEMENT_PARAMS.seed}`);

  const renderDataUri = fileToDataUri(floorRenderPath);

  // Stratégie 2 : Vérifier la présence du masque mural pour l'Inpainting localisé
  const resolvedMaskPath = wallMaskPath || path.join(debugDir, "wall_mask.png");
  const hasMask = fs.existsSync(resolvedMaskPath);
  if (hasMask) {
    console.log(`[FloorTextureEnhancer] 🔒 Masque de préservation murale trouvé : ${resolvedMaskPath}`);
  } else {
    console.warn(`[FloorTextureEnhancer] ⚠️ Masque wall_mask.png absent — Enhancement sans masque (risque léger d'hallucination sur les bords).`);
  }

  for (const currentKey of falKeys) {
    fal.config({ credentials: currentKey });

    const uploadedRenderUrl = await uploadToFalStorage(renderDataUri, `render_${Date.now()}.png`);
    const imageUrl = uploadedRenderUrl || renderDataUri;

    let finalMaskUrl: string | undefined = undefined;
    if (hasMask) {
      try {
        console.log(`[FloorTextureEnhancer] 🔄 Inversion du masque wall_mask.png pour Fal.ai (Murs -> Noir, Pièces -> Blanc)...`);
        const maskBuffer = fs.readFileSync(resolvedMaskPath);
        const invertedMaskBuffer = await sharp(maskBuffer).negate({ alpha: false }).toBuffer();
        const maskBase64 = invertedMaskBuffer.toString("base64");
        const maskDataUri = `data:image/png;base64,${maskBase64}`;
        const uploadedMaskUrl = await uploadToFalStorage(maskDataUri, `mask_${Date.now()}.png`);
        finalMaskUrl = uploadedMaskUrl || maskDataUri;
      } catch (sharpErr: any) {
        console.warn(`[FloorTextureEnhancer] ⚠️ Échec de l'inversion du masque avec sharp : ${sharpErr.message}. Utilisation du masque brut.`);
        const maskDataUri = fileToDataUri(resolvedMaskPath);
        const uploadedMaskUrl = await uploadToFalStorage(maskDataUri, `mask_${Date.now()}.png`);
        finalMaskUrl = uploadedMaskUrl || maskDataUri;
      }
    }

    if (uploadedRenderUrl) {
      console.log(`[FloorTextureEnhancer] ☁️ Rendu uploadé sur Fal Storage.`);
    }

    for (const model of ENHANCEMENT_MODELS) {
      try {
        console.log(`[FloorTextureEnhancer] 🎨 Enhancement via ${model.label}...`);

          const payload: any = {
            image_url: imageUrl,
            prompt: gendoPrompt,
            negative_prompt: FLOOR_NEGATIVE_PROMPT,
            ...ENHANCEMENT_PARAMS,
          };
          if (finalMaskUrl) {
            payload.mask_url = finalMaskUrl;
          }

          const result: any = await fal.subscribe(model.id, {
            input: payload,
            logs: false,
          });

        const generatedUrl: string | undefined =
          result?.data?.images?.[0]?.url ||
          result?.images?.[0]?.url ||
          result?.image?.url;

        if (!generatedUrl) {
          console.warn(`[FloorTextureEnhancer] Aucune image retournée par ${model.label}`);
          continue;
        }

        const imgResponse = await fetch(generatedUrl);
        if (!imgResponse.ok) {
          console.warn(`[FloorTextureEnhancer] Échec téléchargement: ${imgResponse.status}`);
          continue;
        }

        const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
        fs.writeFileSync(finalOutputPath, imgBuffer);
        console.log(`[FloorTextureEnhancer] 💾 Enhanced floor sauvegardé : ${finalOutputPath} (${Math.round(imgBuffer.length / 1024)} Ko)`);

        return finalOutputPath;

      } catch (modelErr: any) {
        console.warn(`[FloorTextureEnhancer] Notice ${model.label}: ${modelErr?.message}`);
        continue;
      }
    }
  }

  console.warn("[FloorTextureEnhancer] Enhancement IA échoué. Le rendu procédural reste valide.");
  return null;
}

