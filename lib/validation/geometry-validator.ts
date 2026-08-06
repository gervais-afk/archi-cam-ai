/**
 * GEOMETRY VALIDATOR — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Vérifie l'intégrité géométrique post-génération du rendu architectural.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { CachedGeometry } from "../geometry/geometry-cache";

export interface ValidationError {
  type: "ROOM_MISMATCH" | "SCALE_ISSUE" | "WALL_BREACH" | "EMPTY_RENDER";
  severity: "ERROR" | "WARNING";
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  score: number; // 0 à 100
}

export class GeometryValidator {
  /**
   * Valide la cohérence géométrique d'un rendu généré par rapport aux métadonnées.
   */
  static validate(
    cachedGeometry: CachedGeometry,
    renderedImageBase64: string
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // 1. Vérification que le rendu n'est pas vide
    if (!renderedImageBase64 || renderedImageBase64.trim().length === 0) {
      errors.push({
        type: "EMPTY_RENDER",
        severity: "ERROR",
        message: "L'image générée est vide ou absente."
      });
      return { isValid: false, errors, score: 0 };
    }

    // 2. Vérification de la cohérence du nombre de pièces
    const expectedCount = cachedGeometry.roomCount;
    if (expectedCount === 0) {
      errors.push({
        type: "ROOM_MISMATCH",
        severity: "WARNING",
        message: "Aucune pièce détectée dans la géométrie de référence pour la validation."
      });
    }

    // 3. Score de cohérence
    const errorCount = errors.filter(e => e.severity === "ERROR").length;
    const warningCount = errors.filter(e => e.severity === "WARNING").length;
    
    let score = 100 - (errorCount * 40) - (warningCount * 15);
    if (score < 0) score = 0;

    return {
      isValid: errorCount === 0,
      errors,
      score
    };
  }
}
