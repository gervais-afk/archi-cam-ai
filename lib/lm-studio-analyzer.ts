import fs from "fs";
import path from "path";
import { safeExistsSync, safeReadFileSync } from "@/lib/server-fs";
import { autoCorrectAnalysis, LMStudioPlanAnalysis } from "@/lib/validators/plan-analysis-schema";

const LM_STUDIO_ENDPOINT = process.env.LM_STUDIO_URL || "http://localhost:1234/v1/chat/completions";

/**
 * Répare automatiquement les chaînes JSON tronquées ou incomplètes renvoyées par LM Studio.
 * Ferme les guillemets, crochets et accolades non fermés.
 */
export function repairIncompleteJson(jsonStr: string): any {
  let cleaned = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();

  // Tentative 1 : Parsing direct
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Poursuivre vers la réparation automatique
  }

  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
    }
  }

  let repairCandidate = cleaned;
  if (inString) {
    repairCandidate += '"';
  }

  // Nettoyage des virgules pendantes ou clés incomplètes à la fin
  repairCandidate = repairCandidate.replace(/,\s*$/, "");
  repairCandidate = repairCandidate.replace(/,\s*"[^"]*"?\s*:?\s*$/, "");

  // Compter et fermer les crochets et accolades manquants
  const openBraces = (repairCandidate.match(/\{/g) || []).length - (repairCandidate.match(/\}/g) || []).length;
  const openBrackets = (repairCandidate.match(/\[/g) || []).length - (repairCandidate.match(/\]/g) || []).length;

  for (let i = 0; i < Math.max(0, openBrackets); i++) repairCandidate += "]";
  for (let i = 0; i < Math.max(0, openBraces); i++) repairCandidate += "}";

  try {
    const parsed = JSON.parse(repairCandidate);
    console.log("[LM Studio Vision] 🛠️ Auto-réparation du JSON tronqué réussie avec succès !");
    return parsed;
  } catch (err) {
    // Tentative 3 : Extraction Regex de secours de la liste des pièces
    const roomsMatch = cleaned.match(/"rooms"\s*:\s*\[([\s\S]*?)(?:\]|\}|$)/);
    if (roomsMatch) {
      try {
        let roomsText = "[" + roomsMatch[1].replace(/,\s*$/, "") + "]";
        const openB = (roomsText.match(/\{/g) || []).length - (roomsText.match(/\}/g) || []).length;
        for (let i = 0; i < openB; i++) roomsText += "}";
        if (!roomsText.endsWith("]")) roomsText += "]";
        const roomsArr = JSON.parse(roomsText);
        console.log(`[LM Studio Vision] 🛠️ Récupération Regex de secours : ${roomsArr.length} pièces restaurées.`);
        return { rooms: roomsArr };
      } catch (e) {
        // Ignorer
      }
    }
    throw new Error(`JSON irréparable : ${cleaned.substring(0, 80)}...`);
  }
}

export async function analyzePlanWithLMStudioVision(imageOrPdfPath: string): Promise<LMStudioPlanAnalysis | null> {
  if (!safeExistsSync(imageOrPdfPath)) {
    console.warn(`[LM Studio Vision] ⚠️ Fichier introuvable: ${imageOrPdfPath}`);
    return null;
  }

  try {
    let targetImagePath = imageOrPdfPath;
    let isPdf = targetImagePath.toLowerCase().endsWith(".pdf");

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
        console.warn(`[LM Studio Vision Notice] LM Studio requiert une image (PNG/JPG). Le fichier PDF sera analysé par Gemini Vision.`);
        return null;
      }
    }

    const rawBuf = safeReadFileSync(targetImagePath);
    if (!rawBuf) return null;

    // 1. REDIMENSIONNEMENT AGRESSIF JPEG 512x512 @ 70% (Divise par 4 le nombre de patchs VLM)
    const sharp = require("sharp");
    const resizedBuf = await sharp(rawBuf)
      .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const base64Data = resizedBuf.toString("base64");
    const imageSizeKb = resizedBuf.length / 1024;

    if (imageSizeKb < 5) {
      console.error(`[LM Studio Vision] ❌ Image source trop petite ou corrompue: ${imageSizeKb.toFixed(1)} Ko < 5 Ko`);
      throw new Error("Image source invalide pour l'analyse visuelle");
    }

    const mimeType = "image/jpeg";
    console.log(`[LM Studio Vision] 🤖 Inférence VLM JPEG ultra-légère (${imageSizeKb.toFixed(0)} Ko) via LM Studio Local...`);

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
  "plan_info": {"title": "PLAN RESIDENTIEL", "total_area": 120.0, "floors": "RDC", "image_width_px": 512, "image_height_px": 512},
  "rooms": [{"id": "room_01", "name": "Séjour Principal", "area_m2": 30.0, "texture": "marble_tile", "bbox": {"x": 50, "y": 50, "w": 400, "h": 300}, "center": {"x": 250, "y": 200}}],
  "furniture": [{"id": "furn_01", "type": "sofa_3seat", "room_id": "room_01", "bbox": {"x": 100, "y": 100, "w": 120, "h": 60}, "rotation_deg": 0, "wall_snap": "none", "confidence": 0.9}]
}
Return raw JSON ONLY with no markdown commentary.
`;

    // 2. TIMEOUT HTTP ÉTENDU & AGENT KEEP-ALIVE
    const controller = new AbortController();
    const TIMEOUT_MS = 600000; // 10 minutes max (600 000 ms)
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const http = require("http");
    const agent = new http.Agent({ keepAlive: true, timeout: 620000 });

    const res = await fetch(LM_STUDIO_ENDPOINT, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "Connection": "keep-alive" 
      },
      signal: controller.signal,
      // @ts-ignore - Agent Node.js pour maintenir la connexion TCP active sans coupure client
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
        max_tokens: 800,
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

    // 3. PARSING JSON SÉCURISÉ AVEC AUTO-RÉPARATION SI TRONQUÉ
    const parsedObj = repairIncompleteJson(rawContent);
    const validated = autoCorrectAnalysis(parsedObj);

    console.log(`[LM Studio Vision] ✅ ${validated.rooms.length} pièces extraites et validées avec succès !`);
    return validated;
  } catch (err: any) {
    console.warn(`[LM Studio Vision Notice] ${err.message || err}`);
    return null;
  }
}
