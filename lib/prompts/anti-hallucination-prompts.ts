// lib/prompts/anti-hallucination-prompts.ts

export interface CleanedPlanMetadata {
  outdoor_zones: Array<{ bbox: [number, number, number, number]; type: string }>;
  staircase_zones: Array<{ bbox: [number, number, number, number] }>;
  storage_zones: Array<{ bbox: [number, number, number, number]; purpose: string }>;
  room_labels?: Array<{ bbox: [number, number, number, number]; text: string }>;
}

export function buildAntiHallucinationPrompt(metadata: CleanedPlanMetadata): {
  system: string;
  negative: string;
} {
  let roomMapStr = "";
  if (metadata.room_labels && metadata.room_labels.length > 0) {
    const roomMap = metadata.room_labels.map(r => {
      const cx = Math.round((r.bbox[0] + r.bbox[2]) / 2);
      const cy = Math.round((r.bbox[1] + r.bbox[3]) / 2);
      const textLower = r.text.toLowerCase();
      let rule = `Area is "${r.text}"`;
      if (textLower.includes("dressing") || textLower.includes("placard") || textLower.includes("closet") || textLower.includes("cellier") || textLower.includes("rangement")) {
        rule += ` (MUST be rendered strictly as: Walk-in closet, built-in wardrobes, warm wood cabinetry. ABSOLUTELY NO kitchen, sink, stove, countertop, toilet, or bath)`;
      } else if (textLower.includes("chambre") || textLower.includes("bedroom")) {
        rule += ` (MUST be rendered strictly as: Bedroom, place ONLY a Bed and Nightstands)`;
      } else if (textLower.includes("cuisine") || textLower.includes("kitchen")) {
        rule += ` (MUST be rendered strictly as: Kitchen with clean white countertops and built-in appliances)`;
      } else if (textLower.includes("bain") || textLower.includes("sdb") || textLower.includes("toilet") || textLower.includes("wc") || textLower.includes("douche")) {
        rule += ` (MUST be rendered strictly as: Bathroom with Cold white marble/tiles and clean sanitary fixtures)`;
      } else if (textLower.includes("salon") || textLower.includes("sejour") || textLower.includes("séjour") || textLower.includes("living") || textLower.includes("lounge")) {
        rule += ` (MUST be rendered strictly as: Small upstairs lounge, round table, elegant seating. ABSOLUTELY NO kitchen, stove)`;
      } else if (textLower.includes("balcon") || textLower.includes("balcony") || textLower.includes("terrasse") || textLower.includes("terrace")) {
        rule += ` (MUST be rendered strictly as: Open balcony, clean outdoor deck, low railing, lots of empty floor space)`;
      }
      return `[${cx},${cy}] ${rule}`;
    }).join(" | ");
    roomMapStr = `\nMANDATORY SPATIAL INSTRUCTIONS: ${roomMap}. STRICTLY respect zoning. Do NOT guess furniture based on shape alone.\n`;
  }

  const system = `
You are an expert architectural renderer specialized in French tropical residential architecture.

${roomMapStr}

CRITICAL RULES - NEVER VIOLATE:

1. OUTDOOR SPACES (BALCONIES/VERANDAS):
${metadata.outdoor_zones.length > 0 ? `
   The plan contains ${metadata.outdoor_zones.length} OUTDOOR zones at these locations:
   ${metadata.outdoor_zones.map((z, i) => `
   Zone ${i + 1}: bbox[${z.bbox.join(',')}]
   - This is an OPEN-AIR ${z.type}
   - MUST have: Open balcony, clean outdoor deck, low railing, lots of empty floor space
   - MUST have: outdoor flooring (stone tiles, wooden deck, NOT indoor parquet)
   - MUST have: outdoor furniture ONLY (deck chairs, planters, NOT sofas or beds)
   - MUST be visually distinct from indoor rooms
   `).join('\n')}
` : '   No outdoor balconies detected, but ensure open areas use concrete/deck floor instead of hardwood.'}

2. STAIRCASES:
${metadata.staircase_zones.length > 0 ? `
   The plan contains ${metadata.staircase_zones.length} staircases at:
   ${metadata.staircase_zones.map((z, i) => `
   Staircase ${i + 1}: bbox[${z.bbox.join(',')}]
   - MUST render strictly as: Top-down architectural staircase, solid oak treads, exact rectangular stairwell, parallel wooden steps, no furniture, no rug, no plants.
   - ORIENTATION: steps ascending in the direction of the arrow
   - Staircase material: Solid Oak Wood treads and white risers, or raw Concrete. ABSOLUTELY NO WATER, NO LIQUID TEXTURE, NO TILES CONTINUITY.
   - NEVER render as: furniture, piano keys, abstract shapes
   `).join('\n')}
` : '   Staircases/Stairwells must render strictly as: Top-down architectural staircase, solid oak treads, exact rectangular stairwell, parallel wooden steps, no furniture, no rug, no plants.'}

3. DRESSING ROOMS / STORAGE:
${metadata.storage_zones.length > 0 ? `
   The plan contains ${metadata.storage_zones.length} storage/dressing areas:
   ${metadata.storage_zones.map((z, i) => `
   Zone ${i + 1}: bbox[${z.bbox.join(',')}] - ${z.purpose}
   - MUST render strictly as: Walk-in closet, built-in wardrobes, warm wood cabinetry.
   - STYLE: modern wood paneling with integrated handles
   - NEVER render as: abstract geometric patterns, black/white shapes, random furniture, or bathroom tiles, kitchen, sink, stove, countertop
   `).join('\n')}
` : '   Storage/closet spaces must render strictly as: Walk-in closet, built-in wardrobes, warm wood cabinetry.'}

4. TEXT & ANNOTATIONS:
   - The input image has been PRE-CLEANED of all text
   - DO NOT attempt to render or recreate any text
   - DO NOT generate fake room labels or dimensions
   - Focus ONLY on architectural elements

5. PERSPECTIVE & VIEWPOINT:
   - Strict 90-degree top-down orthographic view
   - NO isometric tilt, NO 3/4 perspective
   - Maintain exact proportions from the input geometry

RENDERING STYLE:
- Clean unlabeled architectural render, NO visible text
- Photorealistic textures (tropical wood, natural stone, ceramic tiles)
- Soft ambient occlusion shadows
- Consistent lighting (indirect daylight)
- Color palette: warm neutrals (beige, cream, light oak, terracotta)
`.trim();

  const negative = `
text, typography, letters, numbers, labels, room names, dimension arrows, baked-in text, watermark,
palm tree, tropical vegetation, dense greenery, forest background, grass invading floorplan,
ugly, distorted geometry, warped walls, inconsistent scale,
indoor furniture in outdoor spaces, sofas on balconies, beds on terraces, indoor carpets on balconies,
closed walls on balconies, solid walls instead of railings,
staircases rendered as furniture, piano keys instead of steps, abstract shapes instead of stairs,
dressing rooms with abstract black/white patterns, geometric hallucinations in closets,
kitchen, sink, stove, countertop,
isometric view, 3/4 perspective, tilted angle,
low quality, jpeg artifacts, oversaturated colors, harsh shadows
`.trim();

  return { system, negative };
}
