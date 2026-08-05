/**
 * ARCHI CAM AI — SYSTEM PROMPTS & DYNAMIC TEMPLATES
 * ──────────────────────────────────────────────────
 * Moteur de prompts pour la génération de rendus architecturaux
 * 2D / 2.5D Top-Down Orthogonaux 90° de Style "Luxe Tropical", "Moderne", "Commercial", "R+1" et "R+2".
 */

export const UNIVERSAL_GEOMETRY_RULES = `
MANDATORY GEOMETRY & PERSPECTIVE RULES:
- PERSPECTIVE: Strict 90-degree direct top-down orthographic overhead view (plan de masse / vue de dessus à plat). Absolutely NO 35-45 degree isometric or 3/4 perspective tilts.
- GEOMETRY FIDELITY: Strictly preserve the exact wall layout, room partitioning, annex position, and room arrangement from the input scribble/lineart map.
- INTERIOR MATERIALS & FINISHES:
  * Living & Bedrooms: Premium floor finishes matching the requested architectural style. Plush designer furniture, clean layout.
  * Kitchen & Corridors: Polished tiles/marble with sleek countertops.
  * Bathrooms & Wet Areas: Patterned ceramic tiles with clean white sanitary fixtures.
- ARCHITECTURAL COMPLIANCE: Dark anthracite walls (#1E293B) with smooth 3D ambient occlusion drop shadows. Preserve room names and surface areas.
- NO HALLUCINATED ANNEXES OR VEHICLES: Do NOT add random cars, garages, or extra wings that are not in the input plan.
`.trim();

export const MASTER_NEGATIVE_PROMPT = 
  "blurry, low quality, distorted, deformed furniture, 35-45 degree isometric, perspective view, 3/4 angle, hand-drawn, sketch, watercolor, white background, empty rooms, unfurnished, text errors, watermark, cropped";

export interface Neo4jRenderContext {
  city?: string;
  zonePos?: string;
  maxHeightM?: number;
  dominantStyle?: string;
  localMaterials?: string[];
  typeSol?: string;
}

export interface SemanticAnalysisResult {
  analyzerUsed: string; // 'lm-studio' | 'gemini' | 'yolo'
  planType?: string;
  rooms?: Array<{ name: string; area_m2: number }>;
  furniture?: Array<{ name: string; room: string; bbox?: number[] }>;
  fromCache?: boolean;
}

export function buildRenderPrompt(
  style: string = "luxe_tropical",
  rooms?: Array<{ name: string; area_m2: number }>,
  neo4jContext?: Neo4jRenderContext,
  semanticAnalysis?: SemanticAnalysisResult
): string {
  // Règle 9 : Analyse sémantique unique (dédoublonnée)
  const activeRooms = semanticAnalysis?.rooms || rooms;
  
  const roomsDescription = activeRooms && activeRooms.length > 0
    ? activeRooms.map((r) => `- ${r.name}: ${r.area_m2}m²`).join("\n")
    : "- Séjour Principal: 30m²\n- Chambre Parent: 18m²\n- Cuisine & SDB: 15m²";

  const totalArea = activeRooms
    ? activeRooms.reduce((sum, r) => sum + (r.area_m2 || 0), 0).toFixed(1)
    : "120.0";

  const FIDELITY_BLOCK = `
CRITICAL — PLAN FIDELITY RULES:
This render MUST reproduce EXACTLY this specific floor plan.
The plan contains ${activeRooms ? activeRooms.length : 4} rooms as follows:
${roomsDescription}
Total area: ${totalArea}m²

DO NOT add rooms not listed above.
DO NOT remove rooms listed above.
DO NOT change the relative positions of rooms.
The geometry comes from the Canny edge map provided.
TRUST THE CANNY MAP over any general knowledge.
`.trim();

  let styleSpecifics = "";
  const s = style.toLowerCase();

  if (s.includes("moderne")) {
    styleSpecifics = "STYLE MODERNE SCANDINAVE: White bleached oak wood flooring in bedrooms, Nero Marquina black marble in kitchen, neutral grey linen sofas, minimalist black matte fixtures, sleek architectural geometry.";
  } else if (s.includes("commercial")) {
    styleSpecifics = "STYLE COMMERCIAL / BUREAUX: Dark anthracite commercial carpet tiles in open-space offices, glass partition walls, LED panel light fixtures, modern office desks with ergonomic chairs, conference rooms, executive suites.";
  } else if (s.includes("r_plus_1") || s.includes("r+1")) {
    styleSpecifics = "STYLE VILLA DUPLEX R+1: Two-story duplex residential floor plan layout with double-height ceiling voids, spiral/quarter-turn wooden staircase with glass balustrade, expansive master suite, balcony verandas, luxe tropical landscaping.";
  } else if (s.includes("r_plus_2") || s.includes("r+2")) {
    styleSpecifics = "STYLE IMMEUBLE RESIDENTIEL R+2: Multi-family R+2 apartment complex layout with T3/T4 apartments, elevator shaft with stainless steel cabin, central staircase core, private balconies, covered parking bays.";
  } else {
    styleSpecifics = "STYLE LUXE TROPICAL VILLA: Warm honey teak hardwood floors in living areas and bedrooms, polished white Calacatta marble tiles in kitchen and corridors, patterned ceramic tiles in bathrooms. Top-down 2D architectural floorplan, clean inner rooms, realistic wood and tile textures, no cars, no vehicles, no external parking, strictly match internal wall geometry.";
  }

  let neo4jPromptInject = "";
  if (neo4jContext) {
    const parts = [];
    if (neo4jContext.city && neo4jContext.zonePos) {
      parts.push(`Project Location: ${neo4jContext.city} (Zone POS ${neo4jContext.zonePos}).`);
    }
    if (neo4jContext.maxHeightM) {
      parts.push(`POS Maximum Height: ${neo4jContext.maxHeightM}m limit.`);
    }
    if (neo4jContext.typeSol) {
      parts.push(`Geotechnical Ground: Sol ${neo4jContext.typeSol} (LABOGENIE Cameroun).`);
    }
    if (neo4jContext.localMaterials && neo4jContext.localMaterials.length > 0) {
      parts.push(`Local Eco Materials: ${neo4jContext.localMaterials.join(", ")}.`);
    }
    if (parts.length > 0) {
      neo4jPromptInject = `\nNEO4J URBANISM & MATERIALS CONTEXT:\n- ${parts.join("\n- ")}\n`;
    }
  }

  return `
${UNIVERSAL_GEOMETRY_RULES}

${FIDELITY_BLOCK}

${styleSpecifics}${neo4jPromptInject}
Strict 90-degree overhead top-down floor plan rendering of the EXACT uploaded floor plan geometry.
Soft ambient drop shadows under walls, clean architectural details, 8k resolution.
`.trim();
}

export function buildMasterPrompt(renderMode: string, customPrompt?: string): string {
  return buildRenderPrompt(renderMode, undefined);
}

