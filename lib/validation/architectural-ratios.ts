/**
 * VALIDATEUR DE RATIOS ET HARMONIE ARCHITECTURALE — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Empêche les anomalies visuelles et les incohérences de proportions (ex: SDB de 30m²
 * plus grande que le salon de 25m²) sur les croquis manuels réinterprétés par l'IA.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface RoomRatioInput {
  id: string;
  name: string;
  type: "SALON" | "CHAMBRE" | "CUISINE" | "SDB" | "WC" | "AUTRE";
  areaM2: number;
}

export interface RatioValidationIssue {
  roomId: string;
  roomName: string;
  severity: "WARNING" | "CRITICAL";
  message: string;
  suggestedAreaM2: number;
}

export class ArchitecturalRatioValidator {
  public validate(rooms: RoomRatioInput[]): {
    isValid: boolean;
    issues: RatioValidationIssue[];
  } {
    const issues: RatioValidationIssue[] = [];

    const salon = rooms.find((r) => r.type === "SALON" || r.name.toLowerCase().includes("salon"));
    const chambres = rooms.filter((r) => r.type === "CHAMBRE" || r.name.toLowerCase().includes("chambre"));
    const sdbs = rooms.filter((r) => r.type === "SDB" || r.name.toLowerCase().includes("sdb") || r.name.toLowerCase().includes("bain"));

    const avgChambreArea = chambres.length > 0
      ? chambres.reduce((sum, c) => sum + c.areaM2, 0) / chambres.length
      : 15;

    // Règle 1 : SDB trop grande par rapport à la chambre (> 40% de la chambre)
    sdbs.forEach((sdb) => {
      if (sdb.areaM2 > avgChambreArea * 0.45) {
        issues.push({
          roomId: sdb.id,
          roomName: sdb.name,
          severity: "CRITICAL",
          message: `La surface de la SDB (${sdb.areaM2} m²) est trop grande par rapport à la moyenne des chambres (${Math.round(avgChambreArea)} m²).`,
          suggestedAreaM2: Math.max(4, Math.round(avgChambreArea * 0.3)),
        });
      }
    });

    // Règle 2 : Salon trop petit par rapport à la chambre (< 1.3x la chambre)
    if (salon && avgChambreArea > 0 && salon.areaM2 < avgChambreArea * 1.3) {
      issues.push({
        roomId: salon.id,
        roomName: salon.name,
        severity: "WARNING",
        message: `Le salon (${salon.areaM2} m²) est disproportionnellement petit par rapport aux chambres (${Math.round(avgChambreArea)} m²).`,
        suggestedAreaM2: Math.round(avgChambreArea * 2.0),
      });
    }

    return {
      isValid: issues.filter((i) => i.severity === "CRITICAL").length === 0,
      issues,
    };
  }
}
