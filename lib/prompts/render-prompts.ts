/**
 * ARCHI CAM AI — SYSTEM PROMPTS & DYNAMIC TEMPLATES
 * ──────────────────────────────────────────────────
 * Moteur de prompts pour la génération de rendus architecturaux
 * 2D / 2.5D Top-Down Orthogonaux 90° de Style "Luxe Tropical", "Moderne", "Commercial", "R+1" et "R+2".
 */

export type StylePreset = 'luxe_tropical' | 'architect_pro' | 'luxe_tropical_paysager' | 'board_architecte_pro';

interface PresetConfig {
  name: string;
  description: string;
  positivePrompt: string;
  outdoorFurniture: string;
  colorPalette: string;
  background: string;
}

const STYLE_PRESETS: Record<StylePreset, PresetConfig> = {
  luxe_tropical: {
    name: 'Luxe Tropical Paysager',
    description: 'Verdure luxuriante, palmiers, pavés élégants',
    positivePrompt: `
Professional architectural floor plan render with lush tropical landscaping.
Outdoor areas (veranda, terrace, balcony) filled with:
- Tropical plants (monstera, palm trees, ferns)
- Natural stone pavers or warm wood decking
- Elegant outdoor furniture (rattan chairs, teak tables)
- Subtle ambient lighting (lanterns, string lights)
Rich color palette: emerald greens, terracotta, warm wood tones, cream whites.
Photorealistic textures, soft natural shadows, inviting atmosphere.
    `.trim(),
    outdoorFurniture: 'rattan_lounge_set, teak_dining_table, potted_tropical_plants, stone_pavers',
    colorPalette: 'emerald_green, terracotta_orange, warm_oak, cream_white',
    background: 'soft_garden_blur'
  },
  luxe_tropical_paysager: {
    name: 'Luxe Tropical Paysager',
    description: 'Verdure luxuriante, palmiers, pavés élégants',
    positivePrompt: `
Professional architectural floor plan render with lush tropical landscaping.
Outdoor areas (veranda, terrace, balcony) filled with:
- Tropical plants (monstera, palm trees, ferns)
- Natural stone pavers or warm wood decking
- Elegant outdoor furniture (rattan chairs, teak tables)
- Subtle ambient lighting (lanterns, string lights)
Rich color palette: emerald greens, terracotta, warm wood tones, cream whites.
Photorealistic textures, soft natural shadows, inviting atmosphere.
    `.trim(),
    outdoorFurniture: 'rattan_lounge_set, teak_dining_table, potted_tropical_plants, stone_pavers',
    colorPalette: 'emerald_green, terracotta_orange, warm_oak, cream_white',
    background: 'soft_garden_blur'
  },
  architect_pro: {
    name: 'Board Architecte Professionnel',
    description: 'Présentation épurée scandinave sur fond blanc cassé',
    positivePrompt: `
Clean professional architectural presentation board, Scandinavian minimalist style.
Crisp white background (RGB 250,250,248), precise line weights.
Indoor spaces: light oak flooring, soft gray walls, minimal modern furniture.
Outdoor areas (veranda, terrace): simple planters, linear deck boards, understated seating.
No excessive decoration, focus on clarity and geometry.
Subtle shadows for depth, technical precision, award-winning architecture portfolio quality.
    `.trim(),
    outdoorFurniture: 'modern_planter_box, linear_bench, simple_deck_boards',
    colorPalette: 'light_oak, soft_gray, pure_white, charcoal_accents',
    background: 'clean_white_250_250_248'
  },
  board_architecte_pro: {
    name: 'Board Architecte Professionnel',
    description: 'Présentation épurée scandinave sur fond blanc cassé',
    positivePrompt: `
Clean professional architectural presentation board, Scandinavian minimalist style.
Crisp white background (RGB 250,250,248), precise line weights.
Indoor spaces: light oak flooring, soft gray walls, minimal modern furniture.
Outdoor areas (veranda, terrace): simple planters, linear deck boards, understated seating.
No excessive decoration, focus on clarity and geometry.
Subtle shadows for depth, technical precision, award-winning architecture portfolio quality.
    `.trim(),
    outdoorFurniture: 'modern_planter_box, linear_bench, simple_deck_boards',
    colorPalette: 'light_oak, soft_gray, pure_white, charcoal_accents',
    background: 'clean_white_250_250_248'
  }
};

export const UNIVERSAL_GEOMETRY_RULES = `
MANDATORY GEOMETRY & PERSPECTIVE RULES:
- PERSPECTIVE: Strict 90-degree direct top-down orthographic overhead view (plan de masse / vue de dessus à plat). Absolutely NO 35-45 degree isometric or 3/4 perspective tilts.
- GEOMETRY FIDELITY: Strictly preserve the exact wall layout, room partitioning, annex position, and room arrangement from the input scribble/lineart map.
- INTERIOR MATERIALS & FINISHES:
  * Living & Bedrooms: Premium floor finishes matching the requested architectural style. Plush designer furniture, clean layout.
  * Kitchen & Corridors: Polished tiles/marble with sleek countertops.
  * Bathrooms & Wet Areas: Patterned ceramic tiles with clean white sanitary fixtures.
- RULE FOR OUTDOOR SPACES (VERANDAS & PORCHES): Verandas, porches and balconies MUST BE OPEN TO THE OUTSIDE. NEVER place indoor dining tables, beds, or wardrobes in a veranda. VERANDAS MUST ONLY BE FURNISHED WITH: outdoor lounge armchairs, a small patio coffee table, or rattan sun loungers. Keep walls minimal or open for outdoor spaces.
- ARCHITECTURAL COMPLIANCE: Dark anthracite walls (#1E293B) with smooth 3D ambient occlusion drop shadows. Preserve room names and surface areas.
- NO HALLUCINATED ANNEXES OR VEHICLES: Do NOT add random cars, garages, or extra wings that are not in the input plan.
`.trim();

export const MASTER_NEGATIVE_PROMPT = `
distorted geometry, warped walls, inconsistent scale,
indoor furniture in outdoor spaces (no sofa on terrace, no bed on balcony),
baked-in text overlays, misspelled room labels burned into image,
watermark text inside the render, fake annotations,
blurry textures, unrealistic proportions, duplicate rooms,
cropped furniture, floating objects, blurry, low quality, deformed furniture, 
35-45 degree isometric, perspective view, 3/4 angle, hand-drawn, sketch, watercolor, 
white background, empty rooms, unfurnished, text errors, watermark, cropped
`.trim();

export function buildMasterPrompt(
  roomData: { rooms: Array<{ name: string; type: string; area: number }> },
  preset: StylePreset = 'luxe_tropical'
): { positive: string; negative: string } {
  
  // Clean preset mapping
  let activePreset: StylePreset = 'architect_pro';
  const p = String(preset || '').toLowerCase();
  if (p.includes('tropical') || p.includes('paysager')) {
    activePreset = 'luxe_tropical';
  } else if (p.includes('pro') || p.includes('architect')) {
    activePreset = 'architect_pro';
  } else if (STYLE_PRESETS[preset]) {
    activePreset = preset;
  }
  
  const config = STYLE_PRESETS[activePreset] || STYLE_PRESETS['architect_pro'];
  
  // Détecter les espaces extérieurs
  const outdoorRooms = roomData.rooms.filter(r => 
    r.type === 'outdoor_veranda' || 
    r.name.toLowerCase().includes('veranda') ||
    r.name.toLowerCase().includes('terrace') ||
    r.name.toLowerCase().includes('terrasse') ||
    r.name.toLowerCase().includes('balcon') ||
    r.name.toLowerCase().includes('balcony') ||
    r.name.toLowerCase().includes('porch')
  );
  
  let outdoorInstructions = '';
  if (outdoorRooms.length > 0) {
    outdoorInstructions = `
OUTDOOR SPACES DETECTED (${outdoorRooms.map(r => r.name).join(', ')}):
- Furnish with: ${config.outdoorFurniture}
- NO indoor furniture allowed
- Use natural materials and plants
    `.trim();
  }
  
  // Build room details description
  const roomsDescription = roomData.rooms.length > 0
    ? roomData.rooms.map((r) => `- ${r.name}: ${r.area || 0}m²`).join("\n")
    : "- Séjour Principal\n- Chambre Parent\n- Cuisine & SDB";

  const totalArea = roomData.rooms.reduce((sum, r) => sum + (r.area || 0), 0);
  
  const FIDELITY_BLOCK = `
CRITICAL — PLAN FIDELITY RULES:
This render MUST reproduce EXACTLY this specific floor plan.
The plan contains ${roomData.rooms.length > 0 ? roomData.rooms.length : 4} rooms as follows:
${roomsDescription}
${totalArea > 0 ? `Total area: ${totalArea}m²` : ''}

DO NOT add rooms not listed above.
DO NOT remove rooms listed above.
DO NOT change the relative positions of rooms.
The geometry comes from the Canny edge map provided.
TRUST THE CANNY MAP over any general knowledge.
`.trim();

  const positivePrompt = `
${UNIVERSAL_GEOMETRY_RULES}

${FIDELITY_BLOCK}

${config.positivePrompt}

${outdoorInstructions}

STYLE PRESET: ${config.name}
Color Palette: ${config.colorPalette}
Background: ${config.background}
  `.trim();
  
  return {
    positive: positivePrompt,
    negative: MASTER_NEGATIVE_PROMPT
  };
}
