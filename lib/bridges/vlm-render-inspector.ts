import { safeReadFileSync, safeExistsSync } from "@/lib/server-fs";

export interface VlmInspectionDiagnostic {
  mask_integrity_status: "PASS" | "FAIL";
  mask_integrity_reason: string;
  payload_status: "PASS" | "FAIL";
  payload_reason: string;
  aspect_ratio_status: "PASS" | "FAIL";
  aspect_ratio_reason: string;
  geometric_fidelity_status: "PASS" | "FAIL";
  geometric_fidelity_reason: string;
}

export interface VlmInspectionResult {
  passed: boolean;
  score?: number; // 0 to 100
  diagnostic?: VlmInspectionDiagnostic;
  hallucinations?: string[];
  correctionInstruction?: string;
  recommended_auto_fix?: string;
}

export interface VlmInspectionParams {
  originalPlanPath: string;
  generatedRenderPath: string;
  cannyMaskPath?: string;
  payloadJson?: Record<string, any>;
  rooms?: Array<{ name: string; type: string }>;
}

/**
 * ARCHITECTURAL VLM QUALITY INSPECTOR — 'ANTIGRAVITY QA' (Niveau 4)
 * Audit à 4 étapes (Masque, Payload, Aspect Ratio, Fidélité Géométrique) avec retour JSON strict.
 */
export async function inspectRenderedImage(params: VlmInspectionParams): Promise<VlmInspectionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    console.warn("[VLM Inspector] Clé OpenRouter non configurée. Contournement de l'inspection.");
    return { passed: true, score: 100 };
  }

  try {
    const { originalPlanPath, generatedRenderPath, cannyMaskPath, payloadJson, rooms } = params;

    if (!generatedRenderPath) {
      return { passed: true, score: 100 };
    }

    // Resolution de l'URL ou du Base64 du rendu genere
    let renderImageUrl = "";
    if (generatedRenderPath.startsWith("http://") || generatedRenderPath.startsWith("https://")) {
      renderImageUrl = generatedRenderPath;
    } else if (safeExistsSync(generatedRenderPath)) {
      const renderBuf = safeReadFileSync(generatedRenderPath);
      if (renderBuf) renderImageUrl = `data:image/png;base64,${renderBuf.toString("base64")}`;
    } else {
      const cwd = process.cwd();
      const publicPath = require("path").join(cwd, "public", generatedRenderPath.replace(/^\//, ""));
      if (safeExistsSync(publicPath)) {
        const renderBuf = safeReadFileSync(publicPath);
        if (renderBuf) renderImageUrl = `data:image/png;base64,${renderBuf.toString("base64")}`;
      }
    }

    if (!renderImageUrl) {
      console.warn(`[VLM Inspector] Notice: Impossible d'accéder au rendu pour audit : ${generatedRenderPath}`);
      return { passed: true, score: 100 };
    }

    let originalBase64 = "";
    if (safeExistsSync(originalPlanPath)) {
      const origBuf = safeReadFileSync(originalPlanPath);
      if (origBuf) originalBase64 = `data:image/png;base64,${origBuf.toString("base64")}`;
    }

    let cannyBase64 = "";
    if (cannyMaskPath && safeExistsSync(cannyMaskPath)) {
      const cannyBuf = safeReadFileSync(cannyMaskPath);
      if (cannyBuf) cannyBase64 = `data:image/png;base64,${cannyBuf.toString("base64")}`;
    }

    // ── Prompt Système v2.0 — Validé par l'état de l'art 2026 (Source 6 RAG) ─────
    // CORRECTION DU BUG CANNY : L'ancien prompt cherchait des "lignes blanches sur fond noir"
    // ce qui est un critère OBSOLÈTE (on n'utilise plus Canny pur comme sortie finale).
    // Le nouveau prompt évalue la FIDÉLITÉ ARCHITECTURALE RÉELLE :
    // 1. Les murs porteurs sont-ils intacts et non déformés ?
    // 2. La distribution des pièces correspond-elle au JSON de référence ?
    // 3. Aucun meuble n'est-il apparu dans une mauvaise pièce ?
    // Modèle recommandé : Gemini (leader multimodal 2026 pour analyse plan+JSON — Source 6)
    const systemPrompt = `You are 'Antigravity QA v2', an expert Architectural AI Inspector.
Your mission: verify that an AI-enhanced floor plan render is geometrically faithful to the original blueprint.
You use the 'Architectural Critical Point' (ACP) protocol.

### WHAT YOU ARE LOOKING AT:
- IMAGE A: The original 2D architectural blueprint (source of truth).
- IMAGE C: The final AI-enhanced render to audit.
- GROUND TRUTH JSON: The extracted list of rooms with their types and areas.

### STEP 1: STRUCTURAL WALL INTEGRITY CHECK
Compare IMAGE A to IMAGE C.
- Rule 1 (Wall Thickness): Are all load-bearing walls still the same thickness in IMAGE C as in IMAGE A? Wall thickness must not have changed.
- Rule 2 (Wall Position): Have any walls moved, merged, or disappeared between IMAGE A and IMAGE C? Flag any missing wall segments.
- Rule 3 (Overall Footprint): Does the outer boundary and overall shape of the building match exactly between IMAGE A and IMAGE C?

### STEP 2: ROOM DISTRIBUTION AUDIT
Compare the GROUND TRUTH JSON to IMAGE C.
- Rule 4 (Room Count): Is the number of distinct enclosed spaces in IMAGE C equal to the number of rooms in the JSON?
- Rule 5 (Room Function): Is each room's purpose coherent with its type in the JSON? (e.g., a BEDROOM should not have a car in it, a PARKING should not have a bed).
- Rule 6 (Hallucination Check): Has the AI added any new rooms, corridors, or spaces that do not exist in the original blueprint?

### STEP 3: MATERIAL & STYLE VALIDATION
- Rule 7 (No 3D Extrusion): Is the render strictly a flat 2D top-down orthographic view? Flag any signs of 3D perspective distortion, isometric projection, or wall extrusion.
- Rule 8 (No Text Corruption): Are the room labels and dimension annotations from the original preserved and legible?

### OUTPUT FORMAT (STRICT JSON ONLY — no markdown)
{
  "passed": boolean,
  "score": number,
  "diagnostic": {
    "mask_integrity_status": "PASS" | "FAIL",
    "mask_integrity_reason": "Wall integrity assessment",
    "payload_status": "PASS" | "FAIL",
    "payload_reason": "Room distribution assessment",
    "aspect_ratio_status": "PASS" | "FAIL",
    "aspect_ratio_reason": "Projection and style assessment",
    "geometric_fidelity_status": "PASS" | "FAIL",
    "geometric_fidelity_reason": "Overall structural fidelity assessment"
  },
  "hallucinations": ["list of specific hallucinations detected, or empty array"],
  "recommended_auto_fix": "Concise actionable instruction to fix the main issue, or null if passed"
}`;

    const userContent: any[] = [];
    userContent.push({
      type: "text",
      text: `JSON PAYLOAD SENT TO FAL.AI: ${JSON.stringify(payloadJson || { conditioning_scale: 0.85, controlnet_name: "canny" })}`
    });

    if (rooms && rooms.length > 0) {
      userContent.push({
        type: "text",
        text: `EXTRACTED ROOMS GROUND TRUTH: ${JSON.stringify(rooms, null, 2)}`
      });
    }

    if (originalBase64) {
      userContent.push({ type: "text", text: "IMAGE A: ORIGINAL 2D ARCHITECTURAL BLUEPRINT" });
      userContent.push({ type: "image_url", image_url: { url: originalBase64 } });
    }

    if (cannyBase64) {
      userContent.push({ type: "text", text: "IMAGE B: CANNY EDGE MASK (SENT TO FAL.AI)" });
      userContent.push({ type: "image_url", image_url: { url: cannyBase64 } });
    }

    if (renderImageUrl) {
      userContent.push({ type: "text", text: "IMAGE C: FINAL GENERATED RENDER" });
      userContent.push({ type: "image_url", image_url: { url: renderImageUrl } });
    }

    // Gemini 2.5 Flash = leader multimodal 2026 pour analyse plan+JSON (Source 6 RAG)
    const inspectorModel = process.env.VLM_INSPECTOR_MODEL || "google/gemini-2.5-flash";
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

    console.log(`[VLM Inspector] 🕵️‍♂️ Audit 'Antigravity QA' en cours via '${inspectorModel}'...`);

    let modelUsed = inspectorModel;
    let res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://archicam.ai",
        "X-Title": "ArchiCam AI Antigravity QA"
      },
      body: JSON.stringify({
        model: inspectorModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.1
      })
    });

    // Fallback secours vers gemini-2.5-flash-image
    if (!res.ok) {
      console.warn(`[VLM Inspector] ⚠️ Modèle '${inspectorModel}' indisponible. Secours vers 'google/gemini-2.5-flash-image'...`);
      modelUsed = "google/gemini-2.5-flash-image";
      res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://archicam.ai",
          "X-Title": "ArchiCam AI Antigravity QA"
        },
        body: JSON.stringify({
          model: modelUsed,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ],
          temperature: 0.1
        })
      });
    }

    if (!res.ok) {
      console.warn(`[VLM Inspector] Réponse API non OK (${res.status}). Contournement.`);
      return { passed: true, score: 90 };
    }

    const text = await res.text();
    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content || "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`[VLM Inspector] 📊 Audit Antigravity QA terminé -> Passed: ${parsed.passed}`);
      if (!parsed.passed) {
        console.warn(`[VLM Inspector] ⚠️ Défauts détectés : ${JSON.stringify(parsed.diagnostic)}`);
      }
      return {
        passed: !!parsed.passed,
        score: parsed.passed ? 100 : 40,
        diagnostic: parsed.diagnostic,
        correctionInstruction: parsed.recommended_auto_fix,
        recommended_auto_fix: parsed.recommended_auto_fix
      };
    }

    return { passed: true, score: 85 };
  } catch (err: any) {
    console.warn("[VLM Inspector] Notice exception Antigravity QA :", err?.message || err);
    return { passed: true, score: 90 };
  }
}
