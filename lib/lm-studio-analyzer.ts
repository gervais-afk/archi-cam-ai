import fs from "fs";
import path from "path";
import { safeExistsSync, safeReadFileSync } from "@/lib/server-fs";
import { autoCorrectAnalysis, LMStudioPlanAnalysis } from "@/lib/validators/plan-analysis-schema";

const LM_STUDIO_ENDPOINT = process.env.LM_STUDIO_URL || "http://localhost:1234/v1/chat/completions";

export async function analyzePlanWithLMStudioVision(imageOrPdfPath: string): Promise<LMStudioPlanAnalysis | null> {
  if (!safeExistsSync(imageOrPdfPath)) {
    console.warn(`[LM Studio Vision] ⚠️ Fichier introuvable: ${imageOrPdfPath}`);
    return null;
  }

  try {
    let targetImagePath = imageOrPdfPath;
    let isPdf = targetImagePath.toLowerCase().endsWith(".pdf");

    // Si le fichier source est un PDF, chercher s'il existe une version PNG (ex: _clean_plan.png)
    if (isPdf) {
      const pngCandidate1 = targetImagePath.replace(/\.pdf$/i, ".png");
      const pngCandidate2 = targetImagePath.replace(/\.pdf$/i, "_clean_plan.png");
      if (safeExistsSync(pngCandidate2)) {
        targetImagePath = pngCandidate2;
        isPdf = false;
      } else if (safeExistsSync(pngCandidate1)) {
        targetImagePath = pngCandidate1;
        isPdf = false;
      } else {
        // LM Studio n'accepte pas les PDF bruts en tant que Data URI image
        console.warn(`[LM Studio Vision Notice] LM Studio requiert une image (PNG/JPG). Le fichier PDF sera analysé par Gemini Vision.`);
        return null;
      }
    }

    const rawBuf = safeReadFileSync(targetImagePath);
    if (!rawBuf) return null;

    // Optimisation VLM : Redimensionnement Sharp à max 512px — vitesse x4 vs 1024px
    // minicpm-v-2_6 traite en ~1.3 tokens/sec : 512px = ~2min vs ~8min en 1024px
    const sharp = require("sharp");
    const resizedBuf = await sharp(rawBuf)
      .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
      .png({ quality: 75 })
      .toBuffer();

    const base64Data = resizedBuf.toString("base64");
    const imageSizeKb = resizedBuf.length / 1024;

    // ── VÉRIFICATION 2A : Image trop petite ou corrompue < 10 Ko ──
    if (imageSizeKb < 10) {
      console.error(`[LM Studio Vision] ❌ Image source trop petite ou corrompue: ${imageSizeKb.toFixed(1)} Ko < 10 Ko`);
      throw new Error("Image source invalide pour l'analyse visuelle");
    }

    const mimeType = "image/png";
    console.log(`[LM Studio Vision] 🤖 Analyse visuelle d'image optimisée (${imageSizeKb.toFixed(0)} Ko) via LM Studio Local...`);

    // ── INSTRUCTION ANTI-HALLUCINATION ROBUSTE ──
    const promptText = `
You are an expert architectural plan analyzer specialized in African residential floor plans.
ANTI-HALLUCINATION RULES (CRITICAL):
- Analyze ONLY what is visible in THIS specific image.
- Do NOT invent rooms, walls, or spaces not present.
- Do NOT use general knowledge of typical floor plans.
- If a room name is not legible, use "Pièce X".
- If an area is not written, estimate from pixel dimensions.
- Trust ONLY the provided image.

Analyze this floor plan image and return ONLY a valid raw JSON object matching this structure:
{
  "plan_info": {"title": "PLAN RESIDENTIEL", "total_area": 120.0, "floors": "RDC", "image_width_px": 1024, "image_height_px": 1024},
  "rooms": [{"id": "room_01", "name": "Séjour Principal", "area_m2": 30.0, "texture": "marble_tile", "bbox": {"x": 50, "y": 50, "w": 400, "h": 300}, "center": {"x": 250, "y": 200}}],
  "furniture": [{"id": "furn_01", "type": "sofa_3seat", "room_id": "room_01", "bbox": {"x": 100, "y": 100, "w": 120, "h": 60}, "rotation_deg": 0, "wall_snap": "none", "confidence": 0.9}]
}
Return raw JSON ONLY with no markdown commentary.
`;

    const controller = new AbortController();
    const TIMEOUT_MS = 1800000; // 1800 secondes (30 minutes) — garantit l'analyse complète sans coupure
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const http = require("http");
    const agent = new http.Agent({ keepAlive: true, timeout: 1860000 }); // socket keepAlive 31 min > abort timeout

    const res = await fetch(LM_STUDIO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Connection": "keep-alive" },
      signal: controller.signal,
      // @ts-ignore - Node.js agent to prevent premature socket closure
      agent,
      body: JSON.stringify({
        model: process.env.LM_STUDIO_MODEL || "minicpm-v-2_6",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
              { type: "text", text: promptText },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2500,
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[LM Studio Vision Warning] Status HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content || "";

    if (!rawContent) return null;

    // Clean and validate with Zod Auto-Correction
    const cleanedJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedObj = JSON.parse(cleanedJson);

    const validated = autoCorrectAnalysis(parsedObj);
    console.log(`[LM Studio Vision] ✅ ${validated.rooms.length} pièces extraites et validées par Zod.`);

    return validated;
  } catch (err: any) {
    console.warn(`[LM Studio Vision Notice] ${err.message || err}`);
    return null;
  }
}
