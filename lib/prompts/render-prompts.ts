/**
 * ARCHI CAM AI — SYSTEM PROMPTS & DYNAMIC TEMPLATES
 * ──────────────────────────────────────────────────
 * Moteur de prompts pour la génération de rendus architecturaux
 * 2D / 2.5D Top-Down Orthogonaux 90° de Style "Luxe Tropical", "Moderne", "Commercial", "R+1" et "R+2".
 */

export type StylePreset = 'luxe_tropical' | 'architect_pro' | 'luxe_tropical_paysager' | 'board_architecte_pro' | 'top_down_3d_photorealist' | 'nano_banana_pro';

interface PresetConfig {
  name: string;
  description: string;
  positivePrompt: string;
  outdoorFurniture: string;
  colorPalette: string;
  background: string;
}

export const NANO_BANANA_TOPDOWN_PROMPT = `
Ultra-detailed photorealistic 3D architectural floor plan rendering (Strict Top-Down 90-degree orthographic view).
- ABSOLUTE 2D-TO-3D SYMBOL ELEVATION: The input blueprint ALREADY contains exact 2D architectural furniture symbols (beds with pillows, sectional sofas, round/rectangular tables with chairs, walk-in dressing wardrobes, stairs, sanitary fixtures). Elevate these exact symbols into 3D photorealistic objects at their exact drawn positions and orientations. Do NOT invent or redesign furniture layouts.
- WATERTIGHT WALL INTEGRITY & STRICT 2D GEOMETRY: Render continuous solid anthracite structural walls (#1E293B, uniform thickness) strictly following the solid black wall lines of the blueprint. If a wall or veranda is straight/rectangular, it MUST remain 100% straight and rectangular (NEVER invent circular bulges or rotondes unless explicitly drawn on the blueprint).
- BUILDING FOOTPRINT INTEGRITY: If the blueprint shows ONLY 1 single building, render ONLY that 1 single building (NEVER invent a phantom annex or second house). If and only if the blueprint contains an outbuilding/annexe, faithfully furnish every room strictly according to drawn 2D symbols and detected room labels.
- PARKING & DRIVEWAYS: Open paved driveways (interlocking grey stone pavers) running clear from top to bottom with clean contemporary cars parked facing the exit.
- DISTINCT LUXURY FLOOR FINISHES (ZONING PER ROOM):
  * Corridors & Circulation: Polished Carrara white marble tiles with subtle light grey veining.
  * Living Room & Dining (Séjour / Salon): Large-format travertine beige stone tiles (80x80cm) with satin sheen (distinct from bedroom parquet).
  * Bedrooms (All bedrooms): Warm honey oak wood parquet planks with realistic grain.
  * Kitchen (Cuisine): Dark grey quartz flooring with polished marble countertops and induction cooktop.
  * Balconies & Verandas: Weather-resistant teak wood decking with linear plank gaps.
- STRICT ROOM IDENTITY & FUNCTIONAL CONTAINMENT:
  * Dressing: Walk-in wardrobe with open shelves and clothes rails. ABSOLUTELY NEVER A KITCHEN, NEVER A STAIRCASE.
  * Magasin / Storage: Dedicated utility storage room with shelving. ABSOLUTELY NEVER A TOILET OR DRESSING.
  * Cuisine: Kitchen countertops, sink, and cooktop. ABSOLUTELY NEVER A TOILET.
  * Toilets / WC: 1 single wall-hung toilet, 1 sink vanity. Strictly confined to bathroom zones.
- TYPOGRAPHY & SPELLING HYGIENE: All room annotations must be in clean, correct French typography (e.g. 'Séjour', 'Chambre', 'Cuisine', 'Balcon'). Absolutely ZERO misspelled words.
- 100% EXTERIOR PLOT LANDSCAPING (ZERO BLANK WHITE PAPER): The entire outdoor area around all buildings MUST be 100% textured with lush green grass lawn, stone paved driveways, and garden borders (zero blank white canvas).
- ARCHITECTURAL JOINERY & GLAZING: Sleek dark-anthracite aluminum window and sliding door frames with clean transparent architectural glass.
- BIOPHILIC MICRO-DETAILS: Discreet potted designer indoor houseplants (Monstera, Ficus lyrata) placed in living room corners and on verandas to bring authentic life and organic warmth.
- LIGHTING & CAMERA PURITY: 100% flat orthographic 90° top-down view. Overhead soft diffuse lighting with subtle ambient occlusion drop shadows (<15% depth) along wall bases.
- BOTTOM TITLE BLOCK (CARTOUCHE) & BRANDING: Clean, minimalist architectural presentation banner at the bottom with crisp official branding: 'ARCHI-CAMEROUN AI • RENDU ARCHITECTURAL 3D' with golden AI and HD badges. ZERO misspelled words, ZERO fake gibberish text in the cartouche.
- PRESENTATION: 4K UHD real estate brochure standard, award-winning architectural visualization quality.
`.trim();

const STYLE_PRESETS: Record<StylePreset, PresetConfig> = {
  top_down_3d_photorealist: {
    name: 'Top-Down 3D Photoréaliste (Nano Banana Pro)',
    description: 'Rendu 3D meublé haute fidélité avec parquet, mobilier 3D, ombres douces et voiture',
    positivePrompt: NANO_BANANA_TOPDOWN_PROMPT,
    outdoorFurniture: 'car_on_pavers, potted_tropical_plants, teak_patio_chairs',
    colorPalette: 'warm_honey_oak, carrara_white_marble, emerald_green, terracotta_car',
    background: 'clean_light_slate'
  },
  nano_banana_pro: {
    name: 'Top-Down 3D Photoréaliste (Nano Banana Pro)',
    description: 'Rendu 3D meublé haute fidélité avec parquet, mobilier 3D, ombres douces et voiture',
    positivePrompt: NANO_BANANA_TOPDOWN_PROMPT,
    outdoorFurniture: 'car_on_pavers, potted_tropical_plants, teak_patio_chairs',
    colorPalette: 'warm_honey_oak, carrara_white_marble, emerald_green, terracotta_car',
    background: 'clean_light_slate'
  },
  luxe_tropical: {
    name: 'Luxe Tropical Paysager',
    description: 'Verdure minimaliste moderne, palmiers discrets, terrasses propres',
    positivePrompt: `
Professional architectural floor plan render with neatly trimmed architectural landscaping, small modern potted plants, clean concrete or wood outdoor terraces, minimal greenery.
Outdoor areas (veranda, terrace, balcony) filled with:
- Natural stone pavers or warm wood decking
- Elegant outdoor furniture (rattan chairs, teak tables)
- Subtle ambient lighting (lanterns, string lights)
Rich color palette: emerald greens, terracotta, warm wood tones, cream whites.
Photorealistic textures, soft natural shadows, inviting atmosphere.
    `.trim(),
    outdoorFurniture: 'rattan_lounge_set, teak_dining_table, potted_small_plants, stone_pavers',
    colorPalette: 'emerald_green, terracotta_orange, warm_oak, cream_white',
    background: 'soft_garden_blur'
  },
  luxe_tropical_paysager: {
    name: 'Luxe Tropical Paysager',
    description: 'Verdure minimaliste moderne, palmiers discrets, terrasses propres',
    positivePrompt: `
Professional architectural floor plan render with neatly trimmed architectural landscaping, small modern potted plants, clean concrete or wood outdoor terraces, minimal greenery.
Outdoor areas (veranda, terrace, balcony) filled with:
- Natural stone pavers or warm wood decking
- Elegant outdoor furniture (rattan chairs, teak tables)
- Subtle ambient lighting (lanterns, string lights)
Rich color palette: emerald greens, terracotta, warm wood tones, cream whites.
Photorealistic textures, soft natural shadows, inviting atmosphere.
    `.trim(),
    outdoorFurniture: 'rattan_lounge_set, teak_dining_table, potted_small_plants, stone_pavers',
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
- ARCHITECTURAL VISUALIZATION STYLE: Top-down aerial view of a cutaway house model. EXTERIOR GROUND: Raw grey concrete construction site slab, light beige dry soil, or clean asphalt driveway. NO grass touching the building walls, NO dense forest, NO white paper void. The building sits firmly on a realistic buildable plot.
- PERSPECTIVE: Strict 90-degree direct top-down orthographic overhead view (plan de masse / vue de dessus à plat). Absolutely NO 35-45 degree isometric or 3/4 perspective tilts.
- WALL THICKNESS EFFECT: Exterior walls have 20cm thickness shown as light grey concrete border with soft drop shadows cast to the bottom-right direction (light source top-left). The interior is visible through this thick shell structure.
- GEOMETRY FIDELITY: Strictly preserve the exact wall layout, room partitioning, annex position, and room arrangement from the input scribble/lineart map.
- INTERIOR MATERIALS & FINISHES:
  * Living & Bedrooms: Premium floor finishes matching the requested architectural style. Plush designer furniture, clean layout.
  * Kitchen & Corridors: Polished tiles/marble with sleek countertops.
  * Bathrooms & Wet Areas: Patterned ceramic tiles with clean white sanitary fixtures. Cold white marble/tiles.
  * STAIRWELLS & ESCALIERS: CRITICAL: Any area marked or shaped with parallel steps must be rendered strictly as an architectural wooden or concrete staircase. DO NOT generate random black furniture, pianos, or abstract shapes in stairwells.
  * DRESSINGS & CLOSETS: CRITICAL: Walk-in closets (dressing rooms) must be rendered with realistic open wardrobes, clothes rails, and neat shelving. DO NOT generate abstract geometric blocks.
- RULE FOR OUTDOOR SPACES (VERANDAS & PORCHES & BALCONIES):
  * Balcons/Terrasses: Wooden decking texture with subtle gap lines between planks, not continuous indoor parquet. Open balcony, clean outdoor deck, low railing, lots of empty floor space.
  * Entrées/Parking: Grey interlocking pavers or smooth concrete driveway leading to entrance. Include one realistic car parked on driveway or street view outside the perimeter (optional but adds scale).
  * Verandas, porches and balconies MUST BE OPEN TO THE OUTSIDE. NEVER place indoor dining tables, beds, or wardrobes in a veranda. VERANDAS MUST ONLY BE FURNISHED WITH: outdoor lounge armchairs, a small patio coffee table, or rattan sun loungers. Keep walls minimal or open for outdoor spaces.
- LIGHTING & SHADOWS: Overhead soft box lighting at 45 degrees angle, creating gentle ambient occlusion in corners and wall base shadows. High dynamic range (HDR) material properties on floors (slight reflection).
- ARCHITECTURAL COMPLIANCE: Dark anthracite walls (#1E293B) with smooth 3D ambient occlusion drop shadows. Preserve room names and surface areas.
- NO HALLUCINATED ANNEXES OR VEHICLES: Do NOT add random cars, garages, or extra wings that are not in the input plan.
`.trim();

export const MASTER_NEGATIVE_PROMPT = `
white border around plan, floating in green forest, jungle surroundings, isolated on white background, sketch edges, black outline only,
text, typography, letters, numbers, labels, room names, dimension arrows, baked-in text, watermark,
palm tree, tropical vegetation, dense greenery, forest background, grass invading floorplan,
kitchen, sink, stove, countertop,
baked-in text, unreadable letters, gibberish, closed balconies, abstract black shapes, deformed stairs,
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

export function buildRenderPrompt(
  style: string = 'luxe_tropical',
  rooms: Array<{ name: string; type?: string; area?: number; surface_m2?: number }> = [],
  context?: { city?: string; zonePos?: string; typeSol?: string; localMaterials?: string[] },
  analysis?: any
): string {
  const normalizedRooms = (rooms || []).map((r) => ({
    name: r.name || 'Pièce',
    type: r.type || 'indoor_room',
    area: Number(r.area || r.surface_m2 || 15),
  }));

  const { positive } = buildMasterPrompt({ rooms: normalizedRooms }, style as StylePreset);
  
  const contextAddition = context
    ? `\nCAMEROUN LOCAL CONTEXT: City=${context.city || 'Yaoundé'}, Zone=${context.zonePos || 'R2'}, Materials=${(context.localMaterials || []).join(', ')}`
    : '';

  return `${positive}${contextAddition}`.trim();
}

/**
 * ARCHITECTURE V8 : MOTEUR COLORISTE PUR GEMINI / CONTROLNET
 * ────────────────────────────────────────────────────────────
 * Gemini agit STRICTEMENT comme texturiste / coloriste sur un squelette
 * rigide entièrement calculé par les algorithmes géométriques déterministes.
 */
export const PROMPT_V8_COLORIST_ONLY = {
  positive_prompt: `
Professional architectural top-down rendering task.
You are an advanced texture and material engine operating in STRICT ORTHOGRAPHIC 2D mode.

YOUR SOLE FUNCTION: Apply realistic textures, colors, lighting and materials to the provided control mask.
You must NOT move, add, delete or reinterpret any structural element or furniture position defined by the mask.

TEXTURE APPLICATION RULES BY MASK VALUE:
- Value 0 (Black): Render as solid concrete wall cross-section (grey #B0B0B0), slight shadow on interior side.
- Value 30-70 / 55 (Dark Grey): Staircase zone only. Render wooden oak or stone steps with visible treads (horizontal lines), no risers visible from top-down view.
- Value 90-135 (Medium-Dark Grey): Sanitary fixtures (white ceramic WC basin, chrome taps), kitchen appliances (stainless steel countertops, black induction hob). Maintain exact footprint defined by mask.
- Value 140 (Medium-Dark Grey): TV cabinet / console furniture against the wall.
- Value 170-190 (Medium Grey): Upholstered fabric sofas (beige/green/blue according to style preference), wooden dining tables with place settings on them.
- Value 200-215 (Light Grey): Beds with crisp white linen or textured duvet, pillows at head end (identified by mask shape orientation).
- Value 225-235 (Very Light Grey): Small furniture (nightstands with lamp shade, coffee table books/magazines, dining chairs with backrests visible as tiny details).
- Value 240-250 / 248 (Off-White): Floor surfaces:
  * If in area labeled 'bedroom': Oak parquet planks (visible grain, subtle varnish reflection, lengthwise direction varied randomly but aligned to longest wall of that room).
  * If in area labeled 'bathroom/toilet': White marble tiles or grey square ceramic tiles with subtle grid pattern.
  * If in area labeled 'kitchen': Stone or terrazzo flooring.
  * If in area labeled 'living': Light oak parquet or large format concrete-style tiles.
  * If in area labeled 'balcony/veranda/terrace': Wooden decking horizontal planks (grey-brown wood, visible gaps between boards) or light concrete slab.
- Value 255 (Pure White): Keep absolute void/clearance zones clean (maybe very faint concrete texture but ZERO objects placed here).

LIGHTING: Overhead soft diffuse light (architectural visualization standard). Very subtle ambient occlusion darkening in corners where walls meet floors (depth < 10% black). NO strong directional shadows cast by furniture (this is not 3D render).
STYLE: Sharp focus, photorealistic materials, professional real estate marketing brochure quality (like ArchDaily floorplans).

CRITICAL CONSTRAINTS:
- Do NOT invent any object outside the gray-scale masked areas.
- Do NOT rotate furniture differently than the mask's shape orientation suggests (if mask shows bed head against North wall, render it that way).
- Preserve exact room boundaries (black lines are immutable laws).
  `.trim(),

  negative_prompt: `
3d perspective, isometric, distorted geometry, floating objects,
moved walls, missing rooms, invented windows,
shadows cast by furniture onto floor (no drop shadows!),
blurry text, unreadable annotations,
jungle vegetation inside rooms, grass growing indoors,
unrealistic proportions (giant toilets, tiny beds),
white ghost boxes, translucent overlays, water/flood effects on floors,
cartoon style, sketchy lines, hand-drawn look
  `.trim(),

  controlnet_config: {
    guidance_scale: 12.0,
    controlnet_conditioning_scale: 1.2,
    guidance_start: 0.0,
    guidance_end: 1.0
  }
};

export function buildV8ColoristPrompt(hasAnchorMap: boolean = true) {
  if (hasAnchorMap) {
    return PROMPT_V8_COLORIST_ONLY;
  }
  return {
    positive_prompt: buildRenderPrompt('architect_pro', []),
    negative_prompt: MASTER_NEGATIVE_PROMPT,
    controlnet_config: {
      guidance_scale: 7.5,
      controlnet_conditioning_scale: 1.0,
      guidance_start: 0.0,
      guidance_end: 1.0
    }
  };
}


