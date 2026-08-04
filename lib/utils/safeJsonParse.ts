/**
 * Helper centralisé pour le parsing JSON robuste.
 * Gère le BOM UTF-8, le stripping des caractères de contrôle et l'extraction des blocs JSON.
 */
export function safeJsonParse<T = unknown>(raw: string): T {
  if (!raw || typeof raw !== "string") {
    throw new Error("Contenu vide ou invalide fourni à safeJsonParse");
  }

  let cleaned = raw.replace(/^\uFEFF/, ""); // Retrait du BOM UTF-8
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""); // Caractères de contrôle
  cleaned = cleaned.trim();

  // Extraction d'un bloc ```json ... ``` si présent
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  // Localisation de la première accolade ou crochet
  const firstBrace = cleaned.search(/[{\[]/);
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }

  // Localisation du dernier crochet ou accolade
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (lastBrace !== -1 && lastBrace < cleaned.length - 1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (parseErr) {
    console.error("[safeJsonParse] Échec du parsing JSON. Début du contenu:", cleaned.substring(0, 200));
    throw new Error(`Réponse API non-JSON valide : ${(parseErr as Error).message}`);
  }
}
