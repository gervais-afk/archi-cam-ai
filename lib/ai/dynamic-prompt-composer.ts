/**
 * DYNAMIC RENDER PROMPT COMPOSER — ARCHI CAM AI
 * ══════════════════════════════════════════════════════════════
 * Génère automatiquement le prompt optimal pour Fal.ai
 * selon le type de bâtiment détecté par le VIM TopologyBuilder.
 *
 * Pipeline :
 *   VIM JSON → DynamicRenderPrompter.composePrompt() → Fal.ai ControlNet
 *
 * Aucune ligne de code à modifier quand un nouveau type de bâtiment arrive :
 * le composeur s'adapte via les règles déclaratives ci-dessous.
 */

// ─── Types ─────────────────────────────────────────────────────────────────
export interface RoomContext {
  label:    string;
  type?:    string;   // "Bedroom" | "LivingRoom" | "Kitchen" | "Bathroom" | "Circulation" | ...
  area_m2?: number;
}

export interface PlanContext {
  rooms:                 RoomContext[];
  has_garage_or_parking: boolean;
  has_balcony:           boolean;
  has_veranda:           boolean;
  building_type:         string;   // "villa" | "apartment" | "office" | "commercial"
  total_area_m2:         number;
  style_key?:            string;   // "luxe-tropical" | "contemporain" | "minimaliste" | ...
}

export interface ComposedPrompt {
  positive:     string;
  negative:     string;
  building_type: string;
  adaptations:  string[];   // Log des décisions pour debug
}

// ─── Règles de texture par type de pièce ───────────────────────────────────
const ROOM_TEXTURE_RULES: Array<{
  match:   (label: string, type?: string) => boolean;
  texture: (room: RoomContext) => string;
}> = [
  {
    match: (l) => /salon|sejour|living|salle.*(commune|manger)/i.test(l),
    texture: (r) =>
      `"${r.label}" (${r.area_m2 ? r.area_m2.toFixed(1) + "m²" : ""}): ` +
      `Premium oak parquet flooring. Add sofa set, coffee table, TV unit with wall mount. ` +
      `Soft ambient lighting from side windows.`,
  },
  {
    match: (l) => /chambre|bedroom|dorto/i.test(l),
    texture: (r) =>
      `"${r.label}" (${r.area_m2 ? r.area_m2.toFixed(1) + "m²" : ""}): ` +
      `Warm walnut parquet or soft carpet. ` +
      (r.area_m2 && r.area_m2 > 15
        ? "King-size bed, two bedside tables, wardrobe."
        : "Single or double bed, compact bedside table."),
  },
  {
    match: (l) => /cuisine|kitchen/i.test(l),
    texture: (r) =>
      `"${r.label}" (${r.area_m2 ? r.area_m2.toFixed(1) + "m²" : ""}): ` +
      `Polished ceramic or marble countertops. L-shaped kitchen units. ` +
      (r.area_m2 && r.area_m2 > 12 ? "Central kitchen island. " : "") +
      `Stainless steel appliances (hob, oven).`,
  },
  {
    match: (l) => /toil|wc|sdb|salle.*(bain|eau)|bathroom|douche/i.test(l),
    texture: (r) =>
      `"${r.label}" (${r.area_m2 ? r.area_m2.toFixed(1) + "m²" : ""}): ` +
      `White subway tiles with grey grout. Sanitary fixtures: pedestal sink, ` +
      (r.area_m2 && r.area_m2 > 6 ? "bathtub + shower glass panel. " : "shower cubicle. ") +
      `Chrome towel rail.`,
  },
  {
    match: (l) => /bureau|office|travail/i.test(l),
    texture: (r) =>
      `"${r.label}" (${r.area_m2 ? r.area_m2.toFixed(1) + "m²" : ""}): ` +
      `Light grey carpet tiles. Executive desk, ergonomic chair, bookshelf.`,
  },
  {
    match: (l) => /couloir|hall|entree|circulation|corridor/i.test(l),
    texture: (r) =>
      `"${r.label}": Polished light grey porcelain tiles. Keep clear, no furniture.`,
  },
  {
    match: (l) => /garage|parking|carport/i.test(l),
    texture: (r) =>
      `"${r.label}": Bare concrete or epoxy floor texture. ` +
      `Place one parked car (dark sedan) centered in the space.`,
  },
  {
    match: (l) => /balcon|terrasse|veranda|patio/i.test(l),
    texture: (r) =>
      `"${r.label}": Composite wood decking or stone tiles (outdoor). ` +
      `Add 2 outdoor chairs, small table. Tropical potted plants at edges.`,
  },
];

// ─── Règles de style global ─────────────────────────────────────────────────
const STYLE_MODIFIERS: Record<string, string> = {
  "luxe-tropical":
    "Ultra-premium finish: natural Iroko wood accents, lush tropical indoor plants, " +
    "warm golden ambient lighting, marble surfaces in bathrooms.",
  "contemporain":
    "Contemporary minimalist finish: clean lines, neutral palette (white/grey/beige), " +
    "LED recessed lighting, glass partitions where possible.",
  "minimaliste":
    "Pure minimalist: bare essentials only, no decoration, focus on geometry and light.",
  "traditionnel":
    "Traditional Cameroonian aesthetic: warm earth tones, terracotta accents, " +
    "woven texture cushions, wooden lattice details.",
  "industriel":
    "Industrial loft: exposed concrete walls, steel beam accents, Edison bulb lighting, " +
    "dark metal furniture.",
};

// ─── Classe principale ──────────────────────────────────────────────────────
export class DynamicRenderPrompter {

  /**
   * Point d'entrée principal.
   * Reçoit le contexte JSON du VIM et retourne (positive, negative, adaptations[]).
   */
  composePrompt(context: PlanContext): ComposedPrompt {
    const adaptations: string[] = [];

    // ── 1. Textures pièce par pièce ────────────────────────────────────────
    const textureLines: string[] = [];
    for (const room of context.rooms) {
      const label = room.label || "";
      const rule = ROOM_TEXTURE_RULES.find(r => r.match(label, room.type));
      if (rule) {
        textureLines.push(`  • ${rule.texture(room)}`);
        adaptations.push(`Texture: "${label}" → règle "${label.split(" ")[0]}"`);
      }
    }

    const textureBlock = textureLines.length > 0
      ? `ROOM-BY-ROOM TEXTURE & FURNISHING:\n${textureLines.join("\n")}`
      : `Apply appropriate flooring and minimal furniture for each room.`;

    // ── 2. Éléments extérieurs (logique miroir) ────────────────────────────
    let exteriorBlock: string;
    if (context.has_garage_or_parking) {
      exteriorBlock =
        "EXTERIOR: On the dedicated parking/driveway zone (visible in source plan): " +
        "Place a realistic parked car (dark sedan). Concrete/asphalt ground texture. " +
        "Add potted tropical plants near main entrance.";
      adaptations.push("Extérieur: VILLA avec parking → voiture ajoutée");
    } else if (context.has_balcony || context.has_veranda) {
      exteriorBlock =
        "EXTERIOR (Balcony/Veranda only): Apply outdoor wood composite decking. " +
        "Add outdoor lounge chairs and tropical plants. " +
        "NO CAR, NO STREET — this is an apartment or upper-floor plan.";
      adaptations.push("Extérieur: APPARTEMENT avec balcon → plantes, pas de voiture");
    } else {
      exteriorBlock =
        "No outdoor zones detected. Focus entirely on interior quality rendering.";
      adaptations.push("Extérieur: plan intérieur pur → aucun élément externe");
    }

    // ── 3. Modificateur de style ───────────────────────────────────────────
    const styleKey = context.style_key || "contemporain";
    const styleMod = STYLE_MODIFIERS[styleKey] ?? STYLE_MODIFIERS["contemporain"];
    adaptations.push(`Style appliqué: ${styleKey}`);

    // ── 4. Assemblage du prompt maître ────────────────────────────────────
    const positive = [
      `Bright sunlit architectural presentation floor plan — ${context.building_type}.`,
      `Top-down orthographic 2.5D aerial view with soft natural daylight shadows.`,
      `Crisp dark charcoal structural walls clearly outlining each room.`,
      `Clean bright white background.`,
      `Luxurious light oak hardwood parquet flooring in living room and bedrooms.`,
      `Elegant polished light gray and beige ceramic tiles in bathrooms and kitchen.`,
      `Modern stylish furniture arranged naturally in each room (sofas, beds, dining table).`,
      ``,
      textureBlock,
      ``,
      exteriorBlock,
      ``,
      `STYLE DIRECTIVE: ${styleMod}`,
      ``,
      `AESTHETIC QUALITY:`,
      `  • Clean real estate brochure presentation standard.`,
      `  • Warm natural ambient sunlight from North-West.`,
      `  • Photorealistic materials, crisp lines, 8k resolution.`,
    ].join("\n").trim();

    const negative = [
      "dark background, black background, inverted colors, dark room, night view,",
      "sketch, drawing, charcoal, pencil stroke, hand-drawn, rough blueprint, autocad wireframe,",
      "croquis, esquisse, messy lines, fragmented walls, white spots on floor,",
      "3D perspective vanishing point, fisheye distortion, blurry, low resolution, watermark.",
    ].join(" ");

    return { positive, negative, building_type: context.building_type, adaptations };
  }
}

// ─── Helper : Détection automatique du type de bâtiment ────────────────────
export function detectBuildingType(rooms: RoomContext[], totalArea: number): string {
  const labels = rooms.map(r => r.label.toLowerCase()).join(" ");

  const hasOffice    = /bureau|open.space|salle.*(reunion|conf)|reception/i.test(labels);
  const hasCommercial= /commerce|boutique|magasin|show.?room|atelier/i.test(labels);
  const hasBedrooms  = rooms.filter(r => /chambre|bedroom/i.test(r.label)).length;
  const hasGarage    = /garage|parking|carport/i.test(labels);

  if (hasCommercial) return "Commercial Space";
  if (hasOffice)     return "Office / Workspace";

  if (hasBedrooms >= 4 || (hasGarage && totalArea > 150)) return "Large Luxury Villa";
  if (hasBedrooms >= 3 || totalArea > 100)                 return "Standard Family Villa";
  if (hasBedrooms >= 2 || totalArea > 60)                  return "Standard Family Home";
  if (hasBedrooms === 1 || totalArea <= 60)                 return "Compact Apartment / Studio";

  return "Residential Unit";
}

// ─── Helper : Construction du PlanContext depuis les données VIM ────────────
export function buildPlanContext(
  rooms: RoomContext[],
  totalArea: number,
  styleKey?: string
): PlanContext {
  const labels = rooms.map(r => r.label.toLowerCase()).join(" ");
  return {
    rooms,
    has_garage_or_parking: /garage|parking|carport/i.test(labels),
    has_balcony:           /balcon|terrasse|loggia/i.test(labels),
    has_veranda:           /veranda|patio|pergola/i.test(labels),
    building_type:         detectBuildingType(rooms, totalArea),
    total_area_m2:         totalArea,
    style_key:             styleKey,
  };
}
