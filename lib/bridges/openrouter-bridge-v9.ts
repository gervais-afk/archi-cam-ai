import fs from "fs";
import { smartResizeBase64 } from "@/lib/image/smart-resize";
import { PROMPT_V8_COLORIST_ONLY } from "@/lib/prompts/render-prompts";

export interface RenderPayloadOptions {
  inputImagePath: string;
  cannyPath?: string;
  depthMapPath?: string; // furniture_anchors_map.png (V8/V9 Anchor Map)
  stairMaskPath?: string;
  metadata: {
    rooms: Array<{
      name: string;
      type: string;
      surface_m2?: number;
    }>;
    total_surface_m2: number;
    floor_level?: string;
  };
  mode: string;
  userId: string;
}

/**
 * Génère le payload JSON structuré complet prêt à être envoyé à OpenRouter pour le rendu d'image.
 * Intègre le prompt Coloriste Pur V8 et guide l'IA à l'aide des étiquettes de pièces extraites de la Branche A.
 */
export async function generateRenderPayload(options: RenderPayloadOptions): Promise<any> {
  const { inputImagePath, depthMapPath, metadata } = options;

  if (!fs.existsSync(inputImagePath)) {
    throw new Error(`Image inpaintée d'entrée introuvable pour le rendu : ${inputImagePath}`);
  }

  // 1. Lire et redimensionner l'image inpaintée propre
  const inputBuffer = fs.readFileSync(inputImagePath);
  const rawInputBase64 = inputBuffer.toString("base64");
  const resizedInputBase64 = await smartResizeBase64(`data:image/png;base64,${rawInputBase64}`, {
    maxDimension: 1024,
    preserveText: false,
    quality: 85
  });

  // 2. Lire et redimensionner le masque des ancres dur déterministe
  let resizedDepthBase64: string | null = null;
  if (depthMapPath && fs.existsSync(depthMapPath)) {
    const depthBuffer = fs.readFileSync(depthMapPath);
    const rawDepthBase64 = depthBuffer.toString("base64");
    resizedDepthBase64 = await smartResizeBase64(`data:image/png;base64,${rawDepthBase64}`, {
      maxDimension: 1024,
      preserveText: false,
      quality: 85
    });
  }

  // 3. Construction des règles de coloriste basées sur les étiquettes extraites par la Branche A
  const roomsListStr = (metadata.rooms || []).map(r => `${r.name} (${r.type})`).join(", ");
  
  // Prompt positif issu de la convention V8 Coloriste Pur
  let positivePrompt = `
  ${PROMPT_V8_COLORIST_ONLY.positive_prompt}
  
  CRITICAL ROOM MAPPING:
  This floorplan contains the following exact rooms from the original document: ${roomsListStr}.
  The total area is ${metadata.total_surface_m2}m² on level ${metadata.floor_level || "RDC"}.
  
  YOUR INSTRUCTIONS:
  - Do NOT modify the layout.
  - Texturize only. Apply textures and furniture styling matching these room types.
  - No bathroom fixtures in bedroom zones.
  - No beds in corridors.
  `.trim();

  // Ajouter des contraintes spécifiques par type de pièce détecté
  let specificConstraints = "";
  for (const r of (metadata.rooms || [])) {
    const type = String(r.type || "unknown").toLowerCase();
    const name = String(r.name || "").toLowerCase();
    
    if (type === "stairs" || name.includes("escalier")) {
      specificConstraints += "\n- Value 55 (Dark Grey) is STAIRS. Render wooden staircase threads. Absolutely NO beds or kitchens in this zone.";
    }
    if (type === "bedroom" || name.includes("chambre")) {
      specificConstraints += `\n- In the area identified as "${r.name}", style the bed elements (Value 205) with white duvets and oak wood nightstands (Value 220).`;
    }
    if (type === "dressing" || name.includes("dressing")) {
      specificConstraints += `\n- In the area identified as "${r.name}", render walk-in wardrobes with wooden cabinetry on Value 235. NO kitchen counters.`;
    }
    if (type === "balcony" || name.includes("balcon") || name.includes("terrasse")) {
      specificConstraints += `\n- In the outdoor area identified as "${r.name}", render wooden deck planks. Do NOT put indoor beds.`;
    }
  }

  if (specificConstraints) {
    positivePrompt = `${positivePrompt}\n\nPIECE SPECIFIC CONSTRAINTS:${specificConstraints}`;
  }

  const model = "google/gemini-3-pro-image";

  return {
    model: model,
    messages: [
      {
        role: "system",
        content: `You are an architectural colorist texturizing a fixed 2D skeleton. Render strictly in 2D top-down orthogonal view.`
      },
      {
        role: "user",
        content: [
          { type: "text", text: positivePrompt + `\n\nNEGATIVE CONSTRAINTS:\n${PROMPT_V8_COLORIST_ONLY.negative_prompt}` },
          { type: "image_url", image_url: { url: resizedInputBase64 } },
          ...(resizedDepthBase64 ? [{ type: "image_url", image_url: { url: resizedDepthBase64 } }] : [])
        ]
      }
    ]
  };
}
