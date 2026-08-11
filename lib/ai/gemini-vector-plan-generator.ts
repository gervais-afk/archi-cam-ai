/**
 * ══════════════════════════════════════════════════════════════════════════
 * PURE DETERMINISTIC TYPESCRIPT SVG VECTOR GENERATOR — ARCHI CAM AI
 * ══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE 100% SANS HALLUCINATION :
 *   1. Géométrie (Polygones, Murs, Centroïdes, Bounding Box, viewBox)
 *      → Générés 100% par du code TypeScript natif à partir de extraction.json.
 *      → AUCUN LLM / Vision AI ne dessine ni n'estime de coordonnées.
 *
 *   2. Sémantique (Noms des pièces & Couleurs pastels)
 *      → Gemini / OpenRouter interrogé UNIQUEMENT pour retourner un JSON :
 *        [{ id: "room_5", name: "Séjour Etage", color: "#FFF8E1" }]
 *      → Fallback déterministe automatique si l'IA est indisponible.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ExtractionRoom {
  id?: string;
  polygon: [number, number][];
  bbox?: [number, number, number, number];
  centroid: [number, number];
  area_pixels?: number;
  area_m2: number;
  label?: string | null;
  type?: string | null;
  name?: string;
}

export interface ExtractionWall {
  p1: [number, number];
  p2: [number, number];
  thickness: number;
  length: number;
}

export interface ExtractionData {
  status: string;
  image_size: [number, number]; // [width, height]
  scale: { pixels_per_meter: number };
  wall_count: number;
  walls: ExtractionWall[];
  room_count?: number;
  rooms?: ExtractionRoom[];
  room_polygons?: ExtractionRoom[];
  segments?: ExtractionWall[];
}

export interface GeminiSVGResult {
  success: boolean;
  svgCode: string;
  viewBox: string;
  roomCount: number;
  wallCount: number;
  error?: string;
}

export interface RoomSemantic {
  id: string;
  name: string;
  color: string;
  area_m2: number;
}

// ─── Palette Pastels CAO ─────────────────────────────────────────────────────

const PASTEL_PALETTE: Record<string, string> = {
  sejour:    "#FFF8E1", // Jaune crème
  chambre:   "#FFF3E0", // Beige chaud
  dressing:  "#FFE0B2", // Ambre clair
  cuisine:   "#E3F2FD", // Bleu eau
  sdb:       "#BBDEFB", // Bleu cerulean
  wc:        "#B3E5FC", // Cyan pastel
  couloir:   "#F5F5F5", // Gris clair
  terrasse:  "#E8F5E9", // Vert pastel
  escalier:  "#EDE7F6", // Violet poudré
  bureau:    "#FCE4EC", // Rose poudré
  default:   "#FAFAFA",
};

// ─── Sanitiseur d'attributs XML ──────────────────────────────────────────────

function sanitizeSvgDuplicateAttributes(svgCode: string): string {
  return svgCode.replace(/<([a-zA-Z][a-zA-Z0-9:]*)((?:\s[^>]*)?)(\/?>)/g, (_fullMatch, tagName, attrs, close) => {
    if (!attrs || !attrs.trim()) return `<${tagName}${attrs}${close}`;
    
    const seenAttrs = new Set<string>();
    const cleanAttrs = attrs.replace(
      /\s+([a-zA-Z][a-zA-Z0-9:_-]*)(?:=(?:"[^"]*"|'[^']*'|[^\s>]*))?/g,
      (attrMatch: string, attrName: string) => {
        const lowerName = attrName.toLowerCase();
        if (seenAttrs.has(lowerName)) {
          return "";
        }
        seenAttrs.add(lowerName);
        return attrMatch;
      }
    );
    return `<${tagName}${cleanAttrs}${close}`;
  });
}

// ─── Repli Sémantique Déterministe (Si IA indisponible) ─────────────────────

function inferSemanticFallback(room: ExtractionRoom, index: number): RoomSemantic {
  const roomId = room.id || `room_${index}`;
  const area = room.area_m2 || 10;
  let name = room.name || room.label || "";
  let color = PASTEL_PALETTE.default;

  if (name) {
    const lower = name.toLowerCase();
    for (const [key, hex] of Object.entries(PASTEL_PALETTE)) {
      if (lower.includes(key)) {
        color = hex;
        break;
      }
    }
  } else {
    if (area < 3.0) {
      name = "WC";
      color = PASTEL_PALETTE.wc;
    } else if (area < 5.5) {
      name = "Salle de Bain";
      color = PASTEL_PALETTE.sdb;
    } else if (area < 9.0) {
      name = "Dressing";
      color = PASTEL_PALETTE.dressing;
    } else if (area < 16.0) {
      name = `Chambre ${index + 1}`;
      color = PASTEL_PALETTE.chambre;
    } else if (area >= 16.0) {
      name = "Séjour";
      color = PASTEL_PALETTE.sejour;
    } else {
      name = `Dégagement ${index + 1}`;
      color = PASTEL_PALETTE.couloir;
    }
  }

  return { id: roomId, name, color, area_m2: Math.round(area * 100) / 100 };
}

// ─── Interrogation Sémantique Gemini (Retourne UNIQUEMENT du JSON) ─────────

async function fetchRoomSemanticsViaAI(
  rooms: ExtractionRoom[],
  roomMetadata?: Array<{ name: string; type: string; surface_m2: number }>
): Promise<Map<string, RoomSemantic>> {
  const resultMap = new Map<string, RoomSemantic>();

  // Remplissage initial par le fallback déterministe
  rooms.forEach((r, idx) => {
    const key = r.id || `room_${idx}`;
    resultMap.set(key, inferSemanticFallback(r, idx));
  });

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!apiKey) return resultMap;

  try {
    const roomsPayload = rooms.map((r, idx) => ({
      id: r.id || `room_${idx}`,
      area_m2: Math.round((r.area_m2 || 10) * 100) / 100,
      metadata_name: roomMetadata?.[idx]?.name || r.name || r.label || null,
    }));

    const systemPrompt = `Tu es un expert sémantique en architecture. Tu reçois la liste des pièces d'un plan avec leurs surfaces en m². Tu associes à chaque ID un nom de pièce en français et une couleur HEX pastel.`;

    const userPrompt = `Voici la liste des pièces :
${JSON.stringify(roomsPayload, null, 2)}

Retourne STRICTEMENT un tableau JSON valide au format exact suivant :
[
  { "id": "room_0", "name": "Séjour", "color": "#FFF8E1" }
]`;

    // Essayer direct Gemini (Priorité Nano Banana 2 Lite / Gemini 3.1 Flash Lite)
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      let res;
      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-3.1-flash-lite-image",
          systemInstruction: systemPrompt,
        });
        res = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        });
      } catch (liteErr) {
        // Fallback Gemini 2.5 Flash
        const fallbackModel = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: systemPrompt,
        });
        res = await fallbackModel.generateContent({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        });
      }

      const jsonText = res.response.text().trim();
      const parsed: Array<{ id: string; name: string; color: string }> = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item.id && resultMap.has(item.id)) {
            const existing = resultMap.get(item.id)!;
            resultMap.set(item.id, {
              ...existing,
              name: item.name || existing.name,
              color: item.color || existing.color,
            });
          }
        });
        console.log(`[PureVectorTS] 🧠 Sémantique Nano Banana / Gemini appliquée pour ${parsed.length} pièces.`);
      }
    }
  } catch (err: any) {
    console.warn(`[PureVectorTS] ⚠️ Sémantique IA indisponible, utilisation du fallback déterministe. (${err?.message || err})`);
  }

  return resultMap;
}

// ─── MOTEUR DE DESSIN EN TYPESCRIPT PUR (GÉOMÉTRIE 100% DÉTERMINISTE) ────────

function buildPureTypeScriptSvg(
  imgW: number,
  imgH: number,
  ppm: number,
  rooms: ExtractionRoom[],
  walls: ExtractionWall[],
  semanticsMap: Map<string, RoomSemantic>
): string {
  const svg: string[] = [];

  // 1. En-tête SVG avec viewBox strict 1:1 correspondant à l'image source (ex: 1190 x 1684)
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imgW} ${imgH}" width="${imgW}" height="${imgH}">`);

  // 2. Styles CSS intégrés
  svg.push(`
  <style>
    .bg-plan { fill: #F8F6F0; }
    .room-polygon { stroke: #94A3B8; stroke-width: 1.5; stroke-linejoin: round; }
    .wall-segment { stroke: #1E293B; stroke-linecap: square; stroke-linejoin: miter; }
    .text-name { font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 700; fill: #0F172A; text-anchor: middle; }
    .text-area { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; font-weight: 500; fill: #475569; text-anchor: middle; font-style: italic; }
    .cartouche-box { fill: #FFFFFF; stroke: #64748B; stroke-width: 1.5; rx: 6px; }
    .cartouche-txt-main { font-family: sans-serif; font-size: 13px; font-weight: 700; fill: #0F172A; }
    .cartouche-txt-sub  { font-family: sans-serif; font-size: 10px; font-weight: 500; fill: #475569; }
    .frame-border { fill: none; stroke: #64748B; stroke-width: 2; }
  </style>
  `);

  // 3. Fond principal du plan
  svg.push(`  <!-- Couche 1 : Fond -->`);
  svg.push(`  <rect width="${imgW}" height="${imgH}" class="bg-plan" />`);

  // 4. Dessin déterministe des polygones de pièces (points exacts du JSON)
  svg.push(`\n  <!-- Couche 2 : Polygones des pièces (TypeScript pur) -->`);
  rooms.forEach((room, idx) => {
    const key = room.id || `room_${idx}`;
    const sem = semanticsMap.get(key) || inferSemanticFallback(room, idx);
    const pointsStr = room.polygon.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(" ");
    svg.push(`  <polygon points="${pointsStr}" fill="${sem.color}" class="room-polygon" data-room-id="${key}" />`);
  });

  // 5. Dessin déterministe des murs (coordonnées p1, p2 et thickness exactes du JSON)
  svg.push(`\n  <!-- Couche 3 : Murs & Cloisons (TypeScript pur) -->`);
  walls.forEach((wall) => {
    const strokeW = Math.max(5, Math.min(25, Math.round(wall.thickness * 1.3)));
    svg.push(
      `  <line x1="${Math.round(wall.p1[0])}" y1="${Math.round(wall.p1[1])}" x2="${Math.round(wall.p2[0])}" y2="${Math.round(wall.p2[1])}" stroke-width="${strokeW}" class="wall-segment" />`
    );
  });

  // 6. Placement déterministe des textes au centroïde exact [cx, cy]
  svg.push(`\n  <!-- Couche 4 : Textes et surfaces m² (Centroïdes exacts) -->`);
  rooms.forEach((room, idx) => {
    const key = room.id || `room_${idx}`;
    const sem = semanticsMap.get(key) || inferSemanticFallback(room, idx);
    const cx = Math.round(room.centroid[0]);
    const cy = Math.round(room.centroid[1]);
    const areaStr = `${(room.area_m2 || 0).toFixed(2).replace(".", ",")} m²`;

    svg.push(`  <g transform="translate(${cx}, ${cy})">`);
    svg.push(`    <text x="0" y="-6" class="text-name">${escapeXml(sem.name)}</text>`);
    svg.push(`    <text x="0" y="12" class="text-area">${areaStr}</text>`);
    svg.push(`  </g>`);
  });

  // 7. Cartouche professionnel en bas à droite
  const cartW = 290;
  const cartH = 75;
  const cartX = imgW - cartW - 20;
  const cartY = imgH - cartH - 20;

  svg.push(`\n  <!-- Couche 5 : Cartouche CAO -->`);
  svg.push(`  <g transform="translate(${cartX}, ${cartY})">`);
  svg.push(`    <rect width="${cartW}" height="${cartH}" class="cartouche-box" />`);
  svg.push(`    <text x="14" y="24" class="cartouche-txt-main">🏛️ ARCHI CAM AI — PLAN VECTEUR 2D</text>`);
  svg.push(`    <text x="14" y="44" class="cartouche-txt-sub">ÉCHELLE 1:50 | PIÈCES : ${rooms.length} | MURS : ${walls.length}</text>`);
  svg.push(`    <text x="14" y="60" class="cartouche-txt-sub">NORME SCoT OKF BTP CAMEROUN v2.0</text>`);
  svg.push(`  </g>`);

  // 8. Cadre de bordure 1:1
  svg.push(`\n  <!-- Couche 6 : Cadre de bordure -->`);
  svg.push(`  <rect x="4" y="4" width="${imgW - 8}" height="${imgH - 8}" class="frame-border" />`);

  svg.push(`</svg>`);
  return sanitizeSvgDuplicateAttributes(svg.join("\n"));
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── Fonction Principale Utilisée par le Serveur ───────────────────────────────

export async function generateGeminiVectorPlan(
  extractionData: ExtractionData,
  roomNamesFromMetadata?: Array<{ name: string; type: string; surface_m2: number }>,
  _ignoredImagePath?: string
): Promise<GeminiSVGResult> {
  const [imgW, imgH] = extractionData.image_size || [1190, 1684];
  const ppm = extractionData.scale?.pixels_per_meter || 48;

  const rooms: ExtractionRoom[] = (
    extractionData.rooms ||
    extractionData.room_polygons ||
    []
  ).filter((r) => r.area_m2 > 1.0);

  const walls: ExtractionWall[] = extractionData.walls || extractionData.segments || [];

  console.log(`[PureVectorTS] 📐 Génération déterministe TypeScript pur : image ${imgW}×${imgH}px, ${rooms.length} pièces, ${walls.length} murs...`);

  // 1. Sémantique (Gemini retourne UNIQUEMENT un tableau JSON de noms/couleurs)
  const semanticsMap = await fetchRoomSemanticsViaAI(rooms, roomNamesFromMetadata);

  // 2. Génération SVG 100% TypeScript pur (ZÉRO IA pour les traits/murs/coordonnées)
  const svgCode = buildPureTypeScriptSvg(imgW, imgH, ppm, rooms, walls, semanticsMap);

  console.log(`[PureVectorTS] ✅ SVG généré par TypeScript : ${svgCode.length} octets, viewBox="0 0 ${imgW} ${imgH}"`);

  return {
    success: true,
    svgCode,
    viewBox: `0 0 ${imgW} ${imgH}`,
    roomCount: rooms.length,
    wallCount: walls.length,
  };
}
