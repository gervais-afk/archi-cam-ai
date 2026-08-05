/**
 * CORRECTEUR FUZZY ET OCR POUR ÉCRITURE MANUSCRITE SUR CROQUIS — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Corrige les fautes de frappe ou les erreurs de lecture OCR sur les noms de pièces
 * gribouillés à la main (ex: "charbon" -> "chambre", "sbd" -> "sdb", "sllon" -> "salon").
 * ════════════════════════════════════════════════════════════════════════════
 */

const KNOWN_ROOMS = [
  "salon", "séjour", "salle à manger", "sam",
  "chambre", "chambre principale", "chambre parents", "suite parentale",
  "chambre enfant", "bureau",
  "cuisine", "kitchenette", "office",
  "salle de bain", "sdb", "salle d'eau",
  "wc", "toilettes", "cabinet de toilette",
  "dressing", "placard", "cellier", "buanderie",
  "terrasse", "balcon", "véranda",
  "garage", "parking",
  "entrée", "hall", "couloir", "dégagement"
];

const TYPO_MAP: Record<string, string> = {
  charbon: "chambre",
  chombre: "chambre",
  chambre1: "chambre",
  cuicine: "cuisine",
  cuisinne: "cuisine",
  sbd: "sdb",
  sllon: "salon",
  salom: "salon",
  terasse: "terrasse",
  toilete: "wc",
};

export class HandwritingFuzzyMatcher {
  public matchRoomName(rawText: string): {
    matched: string;
    confidence: number;
    suggestions: string[];
  } {
    const cleaned = rawText
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9àâäéèêëïîôùûü\s]/gi, "");

    if (TYPO_MAP[cleaned]) {
      return {
        matched: TYPO_MAP[cleaned],
        confidence: 0.95,
        suggestions: [TYPO_MAP[cleaned], "chambre", "salon"],
      };
    }

    const exactMatch = KNOWN_ROOMS.find((r) => r === cleaned);
    if (exactMatch) {
      return { matched: exactMatch, confidence: 1.0, suggestions: [] };
    }

    const partialMatch = KNOWN_ROOMS.find((r) => r.includes(cleaned) || cleaned.includes(r));
    if (partialMatch) {
      return { matched: partialMatch, confidence: 0.85, suggestions: [partialMatch] };
    }

    return {
      matched: rawText,
      confidence: 0.5,
      suggestions: ["Chambre", "Salon", "Cuisine", "SDB"],
    };
  }
}
