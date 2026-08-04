/**
 * ⚡ MODIFICATION CLASSIFIER AGENT — ARCHI CAM AI
 * ───────────────────────────────────────────────
 * Classifie les requêtes utilisateur en langage naturel en 5 niveaux d'exécution (< 500ms).
 */

export type ModificationLevel =
  | "TEXTURE_ONLY"      // < 5s  — change sol/mur/texture
  | "FURNITURE_ONLY"    // < 8s  — ajoute/déplace meuble
  | "STYLE_CHANGE"      // < 15s — change style global
  | "STRUCTURAL_LIGHT"  // < 30s — agrandit une pièce
  | "STRUCTURAL_HEAVY"; // < 90s — restructure le plan

export interface RoomData {
  id: string;
  name: string;
  area_m2: number;
  texture?: string;
}

export interface QuoteResult {
  total_ht: number;
  total_ttc: number;
  tva: number;
}

export interface ModificationRequest {
  userMessage: string;
  projectId: string;
  currentRender: string;
  currentRooms: RoomData[];
  currentQuote: QuoteResult;
}

export interface ClassifiedModification {
  level: ModificationLevel;
  action: string;
  targets: string[];
  newValue?: string;
  estimatedTime: number;
  costImpact: "none" | "low" | "medium" | "high";
}

export async function classifyModification(
  req: ModificationRequest
): Promise<ClassifiedModification> {
  const msg = req.userMessage.toLowerCase().trim();

  // 1. Détection rapide par mots-clés local (Fallback immédiat < 1ms)
  if (msg.includes("parquet") || msg.includes("carrelage") || msg.includes("marbre") || msg.includes("béton") || msg.includes("sol") || msg.includes("tôle") || msg.includes("toit")) {
    let texture = "parquet";
    if (msg.includes("carrelage") || msg.includes("marbre")) texture = "marble_tile";
    if (msg.includes("béton")) texture = "concrete";
    if (msg.includes("tôle") || msg.includes("toit")) texture = "azulejo_tile";

    return {
      level: "TEXTURE_ONLY",
      action: "change_texture",
      targets: extractTargetRooms(msg, req.currentRooms),
      newValue: texture,
      estimatedTime: 3,
      costImpact: "none",
    };
  }

  if (msg.includes("canapé") || msg.includes("lit") || msg.includes("table") || msg.includes("chaise") || msg.includes("meuble") || msg.includes("fauteuil") || msg.includes("plante")) {
    return {
      level: "FURNITURE_ONLY",
      action: "add_furniture",
      targets: extractTargetRooms(msg, req.currentRooms),
      newValue: "sofa_3seat",
      estimatedTime: 5,
      costImpact: "none",
    };
  }

  if (msg.includes("style") || msg.includes("moderne") || msg.includes("scandinave") || msg.includes("traditionnel") || msg.includes("luxe") || msg.includes("minimaliste")) {
    return {
      level: "STYLE_CHANGE",
      action: "change_style",
      targets: ["global"],
      newValue: msg.includes("moderne") ? "moderne" : msg.includes("scandinave") ? "scandinave" : "luxe_tropical",
      estimatedTime: 15,
      costImpact: "low",
    };
  }

  if (msg.includes("agrandis") || msg.includes("réduis") || msg.includes("m²") || msg.includes("mètre") || msg.includes("cloison") || msg.includes("mur")) {
    return {
      level: "STRUCTURAL_LIGHT",
      action: "resize_room",
      targets: extractTargetRooms(msg, req.currentRooms),
      newValue: "+10m²",
      estimatedTime: 30,
      costImpact: "medium",
    };
  }

  if (msg.includes("étage") || msg.includes("r+1") || msg.includes("piscine") || msg.includes("duplex") || msg.includes("déplacer l'entrée")) {
    return {
      level: "STRUCTURAL_HEAVY",
      action: "restructure_plan",
      targets: ["global"],
      newValue: "R+1",
      estimatedTime: 90,
      costImpact: "high",
    };
  }

  // Défaut : Style change < 15s
  return {
    level: "STYLE_CHANGE",
    action: "update_prompt",
    targets: ["global"],
    newValue: msg,
    estimatedTime: 15,
    costImpact: "low",
  };
}

function extractTargetRooms(msg: string, rooms: RoomData[]): string[] {
  const found: string[] = [];
  for (const r of rooms) {
    if (msg.includes(r.name.toLowerCase())) {
      found.push(r.name);
    }
  }
  if (found.length === 0) {
    if (msg.includes("séjour") || msg.includes("salon")) found.push("Salon / Séjour");
    else if (msg.includes("chambre")) found.push("Chambre");
    else if (msg.includes("cuisine")) found.push("Cuisine");
    else found.push("Séjour Principal");
  }
  return found;
}
