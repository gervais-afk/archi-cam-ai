/**
 * UNIFIED OPENROUTER BRIDGE — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Bridge unique utilisant l'API OpenRouter (https://openrouter.ai/api/v1)
 *
 * 1. extractPlanMetadata(imageBase64) : Extraction VLM ultra-rapide (< 1.5s)
 *    de la structure JSON des pièces (google/gemini-2.5-flash)
 *
 * 2. generateArchitecturalRender(imageBase64Mask, prompt) : Rendu d'image HD
 *    photoréaliste à partir du masque OpenCV nettoyé (sans lignes de cahier)
 *
 * OPTIMISATION PAYLOAD (RISQUE 3) : Les images Base64 sont redimensionnées
 * via smartResizeBase64() (Lanczos3 + sharpen, max 1024px) avant envoi
 * pour éviter les erreurs "fetch failed" sur les payloads lourds.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { smartResizeBase64 } from "@/lib/image/smart-resize";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

function getOpenRouterHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  return {
    "Authorization": `Bearer ${apiKey}`,
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "Archi Cam AI",
    "Content-Type": "application/json",
  };
}

export interface PlanRoom {
  name: string;
  surface_m2: number;
  type: string;
}

export interface PlanMetadataResult {
  rooms: PlanRoom[];
  totalSurface: number;
  roomCount: number;
  rawText?: string;
}

/**
 * Robust JSON parser for AI outputs
 */
function parseStrictJson<T>(rawText: string): T | null {
  try {
    let cleaned = rawText.trim();
    const mdMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
    if (mdMatch) cleaned = mdMatch[1].trim();

    const startIdx = cleaned.search(/[{\[]/);
    if (startIdx >= 0) cleaned = cleaned.substring(startIdx);

    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

/**
 * Wrapper local : délègue à smartResizeBase64 (Lanczos3 + sharpen).
 * Conservé pour rétro-compatibilité avec les appels existants dans ce fichier.
 */
async function resizeBase64ImageForCloud(base64: string, maxDimension: number = 2048): Promise<string> {
  return smartResizeBase64(base64, { maxDimension, preserveText: true, quality: 90 });
}

/**
 * ÉTAPE 1.A : Extraction des métadonnées du plan (< 1.5s)
 * Modèle : google/gemini-2.5-flash via OpenRouter
 * NOTE : L'image est redimensionnée à 1024×1024 JPEG q=80 avant envoi
 * pour éviter les erreurs "fetch failed" sur les payloads Base64 lourds.
 */
export async function extractPlanMetadata(imageBase64: string): Promise<PlanMetadataResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    console.warn("[OpenRouter Bridge] OPENROUTER_API_KEY absente. Métadonnées par défaut.");
    return { rooms: [], totalSurface: 0, roomCount: 0 };
  }

  // ── OPTIMISATION PAYLOAD : resize 1024×1024 JPEG q=80 avant envoi ──────────
  const imageUri = await resizeBase64ImageForCloud(
    imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`
  );

  const prompt = `Analyse ce plan d'architecte et extrais les pièces sous forme de tableau JSON strict.
Structure attendue :
{
  "rooms": [
    { "name": "Salon", "surface_m2": 24.5, "type": "living" },
    { "name": "Chambre 1", "surface_m2": 14.0, "type": "bedroom" }
  ],
  "totalSurface": 98.5,
  "roomCount": 5
}`;

  try {
    const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
      method: "POST",
      headers: getOpenRouterHeaders(),
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Tu es un ingénieur métreur BTP au Cameroun. Réponds TOUJOURS avec un objet JSON strict.",
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUri, detail: "low" } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[OpenRouter Bridge] VLM HTTP ${res.status}: ${errText.slice(0, 150)}`);
      return { rooms: [], totalSurface: 0, roomCount: 0 };
    }

    const text = await res.text();
    console.log("[OpenRouter Bridge] VLM Raw Response:", text.slice(0, 1000));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonErr: any) {
      console.error("[OpenRouter Bridge] VLM JSON Parse Error:", jsonErr.message, "on text:", text);
      return { rooms: [], totalSurface: 0, roomCount: 0 };
    }
    
    const content = data.choices?.[0]?.message?.content || "";
    const parsed = parseStrictJson<PlanMetadataResult>(content);

    if (parsed && Array.isArray(parsed.rooms)) {
      // Force room type to 'outdoor_veranda' for veranda/porch/balcony/terrasse keywords
      const mappedRooms = parsed.rooms.map((room: any) => {
        const nameUpper = String(room.name || "").toUpperCase();
        if (
          nameUpper.includes("VERANDA") ||
          nameUpper.includes("PORCH") ||
          nameUpper.includes("BALCONY") ||
          nameUpper.includes("TERRASSE") ||
          nameUpper.includes("TERRACE")
        ) {
          return { ...room, type: "outdoor_veranda" };
        }
        return room;
      });

      const totalSurface = parsed.totalSurface || mappedRooms.reduce((sum, r) => sum + (r.surface_m2 || 0), 0);
      return {
        rooms: mappedRooms,
        totalSurface: Math.round(totalSurface * 10) / 10,
        roomCount: mappedRooms.length,
        rawText: content,
      };
    }
  } catch (err: any) {
    console.warn("[OpenRouter Bridge] Erreur extractPlanMetadata:", err?.message || err);
  }

  return { rooms: [], totalSurface: 0, roomCount: 0 };
}

/**
 * ÉTAPE 1.B : Génération de l'image architecturale HD à partir du masque OpenCV
 * Le masque transmis DOIT être le masque nettoyé (sans texte OCR, sans lignes de cahier).
 * L'image est redimensionnée à 1024×1024 JPEG q=80 avant envoi pour éviter les
 * erreurs "fetch failed" sur les payloads Base64 lourds.
 * Modèles : google/gemini-2.5-flash-image -> gemini-3.1-flash-image -> gemini-3-pro-image
 */
function computeCardinalLocation(centroid?: [number, number]): string {
  if (!centroid || !Array.isArray(centroid) || centroid.length < 2) return "";
  const [rawX, rawY] = centroid;
  if (typeof rawX !== "number" || typeof rawY !== "number" || isNaN(rawX) || isNaN(rawY)) return "";
  // Normalisation si coordonnées en pixels ou sur échelle 1000
  const xNorm = rawX > 1 ? rawX / (rawX > 1000 ? 2000 : 1000) : rawX;
  const yNorm = rawY > 1 ? rawY / (rawY > 1000 ? 2000 : 1000) : rawY;

  let h = "Center";
  if (xNorm < 0.35) h = "West / Left Wing";
  else if (xNorm > 0.65) h = "East / Right Wing";

  let v = "Middle";
  if (yNorm < 0.35) v = "North / Top";
  else if (yNorm > 0.65) v = "South / Bottom";

  return ` [Location: ${h}, ${v}]`;
}

export async function generateArchitecturalRender(
  imageBase64Mask: string,
  imageBase64Anchors: string | null,
  prompt: string,
  negativePrompt?: string,
  rooms?: Array<{ name: string; type: string; surface_m2?: number; centroid?: [number, number] }>
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.length < 10) {
    console.warn("[OpenRouter Bridge] OPENROUTER_API_KEY absente pour le rendu d'image.");
    return null;
  }

  // ── OPTIMISATION PAYLOAD : resize 2048px max avec Lanczos3 pour haute définition ──
  const imageUri = await resizeBase64ImageForCloud(
    imageBase64Mask.startsWith("data:") ? imageBase64Mask : `data:image/png;base64,${imageBase64Mask}`,
    2048
  );

  let anchorsUri: string | null = null;
  if (imageBase64Anchors) {
    anchorsUri = await resizeBase64ImageForCloud(
      imageBase64Anchors.startsWith("data:") ? imageBase64Anchors : `data:image/png;base64,${imageBase64Anchors}`,
      2048
    );
  }

  let positivePromptWithMapping = prompt;
  if (rooms && rooms.length > 0) {
    const roomsListStr = rooms.map(r => `${r.name}${computeCardinalLocation(r.centroid)} (${r.type || 'piece'})`).join(', ');
    positivePromptWithMapping = `${prompt}\n\nCRITICAL ARCHITECTURAL ROOM LAYOUT:\nThis floorplan consists of the following distinct rooms with their relative spatial coordinates: ${roomsListStr}.\nYOU MUST RESPECT THE EXACT ROOM TYPES AND PLACE ONLY APPROPRIATE FURNITURE IN EACH SPECIFIC ZONE:`;
    
    let constraints = "";
    for (const r of rooms) {
      const type = (r.type || "").toLowerCase();
      const name = (r.name || "").toLowerCase();
      const loc = computeCardinalLocation(r.centroid);
      
      if (name.includes("barbecue") || name.includes("bbq") || name.includes("grill")) {
        constraints += `\n- ZONE '${r.name}'${loc} (COIN BARBECUE / OUTDOOR GRILL): Semi-open outdoor barbecue pergola with built-in stone grill, charcoal smoke hood, and stone prep counter. ABSOLUTELY FORBIDDEN: NEVER A BEDROOM, NO BEDS.`;
      }
      else if (name.includes("traditionnelle") || name.includes("externe") || name.includes("africaine")) {
        constraints += `\n- ZONE '${r.name}'${loc} (CUISINE TRADITIONNELLE / SECONDARY KITCHEN): Traditional prep kitchen with gas burner cooktop, stone counters, and stainless sink. ABSOLUTELY FORBIDDEN: NEVER A BEDROOM, NO BEDS.`;
      }
      else if (name.includes("magasin") || name.includes("stockage") || name.includes("reserve") || name.includes("cellier") || name.includes("pantry")) {
        constraints += `\n- ZONE '${r.name}'${loc} (MAGASIN / RÉSERVE / PANTRY): Dedicated utility storage room with neat metal/wood shelving and dry goods. ABSOLUTELY NEVER A TOILET, NEVER A DRESSING.`;
      }
      else if (name.includes("grand hall") || name.includes("hall") || name.includes("entree") || name.includes("foyer")) {
        constraints += `\n- ZONE '${r.name}'${loc} (GRAND HALL / FOYER): Spacious grand entrance foyer with polished marble floor, opening directly onto the living room. Open circulation walkway 100% free of large dining tables blocking the door.`;
      }
      else if (type === "living" || name.includes("sejour") || name.includes("salon") || name.includes("living") || name.includes("sam")) {
        constraints += `\n- ZONE '${r.name}'${loc} (LIVING ROOM / SÉJOUR / SALON): Luxurious large-format travertine beige stone tiles or light Italian porcelain stoneware (distinct from bedroom parquet). Furnished with sectional sofa, coffee table, rug, and dining table with chairs. ABSOLUTELY NO BEDS, NO KITCHEN APPLIANCES IN SEJOUR.`;
      }
      else if (type === "hallway" || name.includes("coul") || name.includes("degagement")) {
        constraints += `\n- ZONE '${r.name}'${loc} (CORRIDOR / COULOIR / CIRCULATION): Polished Carrara white marble tiles with subtle light grey veining. Pure circulation pathway 100% free of furniture, beds, or kitchen counters.`;
      }
      else if (type === "dressing" || name.includes("dressing") || name.includes("placard") || name.includes("closet")) {
        constraints += `\n- ZONE '${r.name}'${loc} (WALK-IN DRESSING): Open wardrobe cabinetry with neat clothes hangers and shelves. ABSOLUTELY FORBIDDEN: THIS IS NEVER A KITCHEN, NEVER A TOILET, NEVER PLACE A STOVE OR SINK IN THE DRESSING.`;
      }
      else if (type === "bedroom" || name.includes("chambre") || name.includes("cham") || name.includes("bed")) {
        constraints += `\n- ZONE '${r.name}'${loc} (BEDROOM / CHAMBRE): Warm honey oak wood parquet planks. Double bed with white duvet, headboard against wall, and nightstands. NO dining tables, NO kitchen counters.`;
      }
      else if (type === "kitchen" || name.includes("cuisine") || name.includes("kitchen")) {
        constraints += `\n- ZONE '${r.name}'${loc} (KITCHEN / CUISINE): Quartz stone floor. Fitted L-shaped countertop with sink, induction cooktop, and cabinetry. ABSOLUTELY FORBIDDEN: NEVER A TOILET, NO BEDS.`;
      }
      else if (type === "bathroom" || type === "toilet" || name.includes("toil") || name.includes("sdb") || name.includes("wc") || name.includes("tch")) {
        constraints += `\n- ZONE '${r.name}'${loc} (BATHROOM / TOILET / WC): Non-slip ceramic mosaic floor, 1 single wall-hung toilet, 1 sink vanity, 1 walk-in shower ONLY. ABSOLUTELY NO BEDS, NO KITCHENS.`;
      }
      else if (type === "stairs" || name.includes("escalier") || name.includes("stair")) {
        constraints += `\n- ZONE '${r.name}'${loc} (STAIRCASE / ESCALIER): Parallel wooden stair treads ONLY. Kept 100% free of any furniture or toilets.`;
      }
      else if (type === "balcony" || name.includes("balcon") || name.includes("terrasse") || name.includes("veranda") || name.includes("rotonde")) {
        constraints += `\n- ZONE '${r.name}'${loc} (BALCONY / VÉRANDA / ROTONDE): Weather-resistant outdoor teak wood decking with curved steps and patio seating. NO indoor beds, NO indoor sofas.`;
      }
      else if (type === "office" || name.includes("bureau") || name.includes("study") || name.includes("office") || name.includes("bibliotheque")) {
        constraints += `\n- ZONE '${r.name}'${loc} (HOME OFFICE / BUREAU / STUDY): Executive wooden desk, ergonomic office chair, built-in bookshelves, and desk lamp. ABSOLUTELY FORBIDDEN: NO BEDS, NO KITCHEN COUNTERS IN THE OFFICE.`;
      }
      else if (type === "laundry" || name.includes("buanderie") || name.includes("laundry") || name.includes("lingerie")) {
        constraints += `\n- ZONE '${r.name}'${loc} (LAUNDRY / BUANDERIE): Side-by-side washing machine, dryer, laundry sink, and linen storage cabinets. ABSOLUTELY NO TOILETS, NO BEDS.`;
      }
      else if (name.includes("piscine") || name.includes("pool") || name.includes("bassin")) {
        constraints += `\n- ZONE '${r.name}'${loc} (SWIMMING POOL / PISCINE): Crystal clear turquoise water with gentle wave reflections, underwater steps, and non-slip stone coping.`;
      }
      else if (name.includes("vide") || name.includes("tremie") || name.includes("void") || name.includes("mezzanine")) {
        constraints += `\n- ZONE '${r.name}'${loc} (DOUBLE HEIGHT VOID / VIDE SUR SÉJOUR): Open architectural void overlooking the ground floor, bordered by a modern glass and steel safety balustrade. 100% free of floating furniture.`;
      }
      else if (name.includes("technique") || name.includes("gaine") || name.includes("gtl") || name.includes("local")) {
        constraints += `\n- ZONE '${r.name}'${loc} (TECHNICAL SHAFT / LOCAL TECHNIQUE): Clean utility room with electrical panels / plumbing ducts. 100% free of residential furniture.`;
      }
      else if (type === "garage" || type === "parking" || name.includes("car") || name.includes("parking") || name.includes("voiture") || name.includes("garage")) {
        constraints += `\n- ZONE '${r.name}'${loc} (PARKING / CARPORT): Contemporary luxury sedan or SUV car neatly parked on the interlocking paved driveway within the designated parking area.`;
      }
    }
    if (constraints) {
      positivePromptWithMapping = `${positivePromptWithMapping}\n\nZONE-BY-ZONE FURNITURE & TEXTURE CONSTRAINTS:${constraints}`;
    }
  }

  // Ensure negative prompt has silence protocol and strict placement rules
  let finalNegative = negativePrompt || "toilet in kitchen, toilet in stairs, toilet under stairs, diagonal 45 degree walls, missing bed in bedroom, chairs instead of bed, bed in living room, bed in dining room, misplaced bed, floating furniture, misspelled text, room label overlays, watermark, distorted walls.";
  if (!finalNegative.includes("toilet in kitchen")) {
    finalNegative = `toilet in kitchen, kitchen in dressing, stove in dressing, toilet in cuisine, colectes, colectte, balconies, misspelled words, pseudo-text labels, fake text on floors, toilet in stairs, toilet under stairs, diagonal 45 degree walls, missing bed in bedroom, chairs instead of bed, bed in living room, ${finalNegative}`;
  }

  // ── DÉTECTION DYNAMIQUE DU RATIO ET DE L'ORIENTATION RÉELLE DU PLAN ─────────
  let orientationInstruction = "PRESERVE THE EXACT NATIVE ASPECT RATIO AND ORIENTATION (DO NOT ROTATE OR CROP).";
  try {
    const rawBuf = Buffer.from(imageBase64Mask.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    const meta = await sharp(rawBuf).metadata();
    const w = meta.width || 1000;
    const h = meta.height || 1000;
    const ratio = w / h;

    if (ratio > 1.15) {
      orientationInstruction = `HORIZONTAL WIDE / LANDSCAPE ORIENTATION (Width: ${w}px > Height: ${h}px). The output MUST BE in WIDE LANDSCAPE format. DO NOT crop the left or right edges. DO NOT rotate to vertical. All horizontal wings and outdoor boundaries must remain fully visible.`;
    } else if (ratio < 0.85) {
      orientationInstruction = `VERTICAL PORTRAIT ORIENTATION (Height: ${h}px > Width: ${w}px). The output MUST BE in TALL VERTICAL format. DO NOT crop the top or bottom edges. DO NOT rotate 90° horizontally to landscape. Top of blueprint remains at the TOP of the render; bottom remains at the BOTTOM.`;
    } else {
      orientationInstruction = `SQUARE 1:1 ORIENTATION (Width: ${w}px ≈ Height: ${h}px). Preserve exact square proportions without cropping.`;
    }
  } catch (e) {
    console.warn("[OpenRouter Bridge] Notice calcul ratio dynamique:", e);
  }

  // Protocole de Coloriste Architectural 100% Adaptatif et Universel (Verrouillage Murs & Mobilier CAO)
  const roomListDynamic = (rooms || []).map(r => `  * [${r.name}] (${r.type || 'pièce'}${r.surface_m2 ? `, ~${r.surface_m2}m²` : ''})`).join('\n');

  const depthRules = `EXPERT ARCHITECTURAL 2D-TO-3D TOP-DOWN MASTER PROTOCOL (BULLETPROOF SPECIFICATION):
1. ABSOLUTE 2D-TO-3D SYMBOL ELEVATION:
   * The input blueprint ALREADY contains the architect's exact 2D furniture drawings (beds, nightstands, sectional sofas, dining tables, dressing wardrobes, stair steps, sanitary ware).
   * ELEVATE THESE EXACT 2D SYMBOLS INTO 3D PHOTOREALISTIC OBJECTS at their precise drawn coordinates and angles.
   * DO NOT redesign or invent alternate furniture layouts. If a round table with 4 chairs is on a balcony, render that exact round table with 4 chairs.
2. WATERTIGHT WALL INTEGRITY & STRICT 2D GEOMETRY FIDELITY (NO INVENTED CURVES):
   * Render continuous anthracite structural walls (#1E293B, uniform thickness) strictly following the solid black wall lines of the blueprint.
   * Watertight room enclosures: NO missing wall segments, NO broken wall lines.
   * STRICT GEOMETRY FIDELITY: If a wall, balcony, or veranda is RECTANGULAR/STRAIGHT, it MUST REMAIN 100% RECTANGULAR AND STRAIGHT. ABSOLUTELY FORBIDDEN: NEVER invent circular shapes, semi-circular bulges, or curved rotondes unless a circle is explicitly drawn on the blueprint.
   * ENCLOSED INDOOR FAÇADES: Living rooms and dining rooms are fully enclosed indoor spaces with solid exterior walls and sliding glass doors leading to balconies/verandas.
   * ABSOLUTE PROHIBITION: NEVER invent internal partition walls, NEVER merge or remove existing walls.
3. BUILDING FOOTPRINT INTEGRITY & 100% OUTDOOR LANDSCAPING (ZERO WHITE VOID):
   * SINGLE-BUILDING PLANS: If the blueprint shows only ONE single building (standalone villa, bungalow, or apartment), render ONLY that single building surrounded by its landscaped garden/driveway. ABSOLUTELY NEVER invent a second building or phantom annex.
   * MULTI-BUILDING COMPLEXES: If and only if the blueprint explicitly contains a second building/annexe, faithfully furnish each room according to its drawn 2D symbols and detected labels.
   * EXTERIOR PARKING & DRIVEWAYS: Open paved driveways (interlocking grey stone pavers) running clear with all drawn vehicles parked facing downward towards the exit.
   * 100% PLOT LANDSCAPING (NO BLANK WHITE PAPER): The entire outdoor area around all buildings MUST be fully textured with realistic lush green grass lawn, stone paving, and garden plants. ABSOLUTELY ZERO BLANK WHITE CANVAS OR EMPTY WHITE PAPER AROUND BUILDINGS.
4. DOORWAYS & WINDOW CLEARANCES:
   * Door swing clearance arcs indicate open doorways. Render clean wooden interior doors and sliding glass patio doors at these exact slots.
   * NEVER place furniture, beds, or solid walls across door openings or circulation corridors.
5. DISTINCT HIGH-END FLOOR TEXTURES (ZONING PER ROOM):
   * CORRIDORS / CIRCULATION: Polished Carrara white marble tiles with subtle grey veins.
   * SÉJOUR / SALON (Living room): Large-format travertine beige stone tiles ($80x80cm) with satin sheen or rich oak parquet.
   * BEDROOMS (All bedrooms across main house and annexe): Warm honey oak wood parquet planks with realistic wood grain.
   * CUISINE: Dark grey quartz / stone flooring with polished marble countertops and cooktops.
   * BALCONIES / VERANDAS: Weather-resistant outdoor teak wood decking STRICTLY confined to the drawn balcony boundaries.
   * PARKING / DRIVEWAY: Interlocking concrete/stone pavers ONLY (NO wood decking).
6. STRICT ROOM IDENTITY & FUNCTIONAL CONTAINMENT:
   * DRESSING: Walk-in wardrobe with open shelves and clothes racks. ABSOLUTELY NEVER A STAIRCASE. Do NOT mistake dense wardrobe hatchings or dimension lines for stairs.
   * MAGASIN / STORAGE: Dedicated utility storage room with shelving. ABSOLUTELY NEVER A TOILET OR DRESSING.
   * CUISINE: Cooktop, sink, counter. ABSOLUTELY NEVER A TOILET.
   * TOILETS / WC: 1 single toilet, 1 vanity sink. Confined strictly to bathroom zones.
7. TYPOGRAPHY & COTATIONS HYGIENE:
   * Keep crisp architectural dimension ticks and extension lines along the outer presentation frame.
   * Do NOT write scrambled or misspelled words on floors. Use clean, correct French architectural terms (e.g. 'Séjour', 'Chambre', 'Cuisine', 'Balcon') or keep floors pure.
9. DYNAMIC ADAPTIVE ORIENTATION & ZERO-CROP FRAMING:
   * ${orientationInstruction}
   * Centered presentation on a clean neutral white/light-grey architectural board with generous uniform margins (padding).
   * NEVER CROP any part of the floorplan (neither width nor height).
10. LIGHTING & CAMERA PURITY:
   * 100% flat orthographic 90° top-down view (zero isometric tilt, zero perspective distortion).
   * Overhead soft diffuse lighting with realistic subtle ambient occlusion drop shadows (<15% depth) along wall bases.
11. LUXURY ARCHITECTURAL CARTOUCHE & BRANDING:
   * A pristine, high-end presentation banner along the bottom:
   * Left: Golden circular 'AI' emblem badge.
   * Center: Crisp official title 'ARCHI-CAMEROUN AI • RENDU ARCHITECTURAL 3D'.
   * Right: Golden circular 'HD' quality badge.
   * ABSOLUTELY ZERO misspelled words, ZERO fake gibberish text in the cartouche.
- DETECTED ROOMS FROM THIS SPECIFIC BLUEPRINT:
${roomListDynamic || '  * Faithfully preserve all rooms, boundaries, and annotations present on the blueprint.'}`;

  const enhancedPrompt = `${depthRules}\n\nNEGATIVE CONSTRAINTS: stairs in dressing, stairs in master bedroom, wooden blocks in rotonde, open patio in living room, open patio in dining room, room extension in parking, dividing wall in living room, bed in barbecue, bed in traditional kitchen, empty white bars, excessive letterboxing margins, wood decking in parking, parquet in driveway, missing cars, empty garden, kitchen in dressing, stove in bedroom, toilet in cuisine, colectes, colectte, balconies, Voreooy, Dreseing, scrambled text, misspelled words, fake words on floors, rotated 90 degrees, horizontal flip of vertical plan, duplicated toilets, cloned bathrooms, invented interior partition walls, missing dressing, dining table in corridor, bed in living room, deformed furniture, broken walls, fuzzy lines, missing doors, furniture blocking doors, grass indoors, ${finalNegative}`;


  const candidateModels = [
    "google/gemini-3-pro-image",           // 🏆 Nano Banana Pro (Gemini 3 Pro) - Priorité 1 (4K & Meublé)
    "google/gemini-3.1-flash-lite-image",  // ⚡ Nano Banana 2 Lite (Gemini 3.1 Flash Lite) - Priorité 2 (~4s)
    "google/gemini-3.1-flash-image",       // Gemini 3.1 Flash Image
    "google/gemini-2.5-flash-image",       // Fallback de secours
  ];

  for (const model of candidateModels) {
    console.log(`[OpenRouter Bridge] 🎨 Essai de rendu avec '${model}'...`);

    // 1. Essai via /chat/completions (format multimodal standard OpenRouter)
    try {
      const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: "POST",
        headers: getOpenRouterHeaders(),
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: depthRules
            },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: imageUri } },
                ...(anchorsUri ? [{ type: "image_url", image_url: { url: anchorsUri } }] : []),
                { type: "text", text: enhancedPrompt },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        const text = await res.text();
        console.log(`[OpenRouter Bridge] Chat Raw Response (${model}):`, text.slice(0, 1000));
        let data;
        try {
          data = JSON.parse(text);
        } catch (jsonErr: any) {
          console.error(`[OpenRouter Bridge] Chat JSON Parse Error (${model}):`, jsonErr.message, "on text:", text);
          continue;
        }
        const output = data.choices?.[0]?.message?.content || "";
        let imgUrl = "";
        const msgImages = data.choices?.[0]?.message?.images;
        if (Array.isArray(msgImages) && msgImages[0]?.image_url?.url) {
          imgUrl = msgImages[0].image_url.url;
        } else {
          const imgUrlMatch = output.match(/https?:\/\/[^\s\)"']+\.(?:png|jpg|jpeg|webp)|data:image\/[a-zA-Z]+;base64,[^\s\)"']+/i);
          if (imgUrlMatch) {
            imgUrl = imgUrlMatch[0];
          } else if (output.startsWith("http://") || output.startsWith("https://") || output.startsWith("data:image/")) {
            imgUrl = output;
          }
        }

        if (imgUrl) {
          console.log(`[OpenRouter Bridge] ✨ Image générée avec succès via ${model} !`);
          return imgUrl;
        }
      }
    } catch (e: any) {
      console.warn(`[OpenRouter Bridge] Notice chat/completions (${model}):`, e?.message || e);
    }

    // 2. Essai via /images/generations (format OpenAI Image Standard)
    try {
      const res = await fetch(`${OPENROUTER_API_URL}/images/generations`, {
        method: "POST",
        headers: getOpenRouterHeaders(),
        body: JSON.stringify({
          model,
          prompt: enhancedPrompt,
          image: imageUri,
          n: 1,
          size: "1024x1024",
          ...(anchorsUri ? { depth_map: anchorsUri } : {}),
          ...(finalNegative ? { negative_prompt: finalNegative } : {}),
        }),
      });

      if (res.ok) {
        const text = await res.text();
        console.log(`[OpenRouter Bridge] Images Gen Raw Response (${model}):`, text.slice(0, 1000));
        let data;
        try {
          data = JSON.parse(text);
        } catch (jsonErr: any) {
          console.error(`[OpenRouter Bridge] Images Gen JSON Parse Error (${model}):`, jsonErr.message, "on text:", text);
          continue;
        }
        const imageUrl = data.data?.[0]?.url || (data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);
        if (imageUrl) {
          console.log(`[OpenRouter Bridge] ✨ Image générée via /images/generations (${model}) !`);
          return imageUrl;
        }
      }
    } catch (e: any) {
      console.warn(`[OpenRouter Bridge] Notice images/generations (${model}):`, e?.message || e);
    }
  }

  console.warn("[OpenRouter Bridge] Tous les modèles d'image OpenRouter ont échoué.");
  return null;
}
