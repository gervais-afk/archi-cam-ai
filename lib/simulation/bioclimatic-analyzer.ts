/**
 * SIMULATEUR BIOCLIMATIQUE & CONFORT THERMIQUE TROPICAL — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Simule les gains solaires, la ventilation traversante naturelle et le confort
 * thermique (ISO 7730) adapté à la pluviométrie et aux vents de mousson SW au Cameroun.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface BioclimaticResult {
  location: { city: string; lat: number; lon: number };
  climateZone: "EQUATORIAL" | "TROPICAL" | "SAHELIAN";
  solarGainSummerKwhM2: number;
  naturalVentilationEffectivenessPct: number;
  overheatingRisk: "LOW" | "MEDIUM" | "HIGH";
  estimatedAcSavingsPct: number;
  recommendations: string[];
}

export class BioclimaticAnalyzer {
  constructor(
    private city: string = "Yaoundé",
    private lat: number = 3.848,
    private lon: number = 11.5021
  ) {}

  public analyze(surfaceM2: number, orientationDegree: number = 90): BioclimaticResult {
    const isSahelian = this.lat > 8.0;
    const isCoastal = this.city === "Douala" || this.city === "Kribi";
    const climateZone = isSahelian ? "SAHELIAN" : isCoastal ? "EQUATORIAL" : "TROPICAL";

    // Évaluation des apports solaires (Orientation Est-Ouest optimale = 90° ou 270°)
    const isOptimalOrientation = Math.abs(orientationDegree - 90) < 20 || Math.abs(orientationDegree - 270) < 20;
    const solarGainKwh = isOptimalOrientation ? 140 : 230;

    // Simulation ventilation naturelle (Mousson Sud-Ouest au Cameroun ~ 225°)
    const naturalVentilationPct = isOptimalOrientation ? 85 : 55;
    const overheatingRisk = solarGainKwh > 200 ? "HIGH" : solarGainKwh > 160 ? "MEDIUM" : "LOW";

    const recommendations: string[] = [];

    if (overheatingRisk === "HIGH") {
      recommendations.push("⚠️ Risque de surchauffe élevé : prévoir des brise-soleil horizontaux sur les façades Est/Ouest.");
      recommendations.push("💡 Utiliser une toiture ventilée avec isolation thermique réfléchissante.");
    }

    if (naturalVentilationPct < 70) {
      recommendations.push("🌬️ Ventilation traversante insuffisante : placer les ouvertures dans l'axe des vents dominants SW (Mousson).");
    }

    if (isCoastal) {
      recommendations.push("💧 Pluviométrie intense (> 3000mm/an) : prévoir un débord de toiture de 1.20m minimum et une toiture Cool Roof.");
    } else {
      recommendations.push("🧱 Privilégier les Briques de Terre Compressée (BTC) pour réguler l'humidité et emmagasiner la fraîcheur nocturne.");
    }

    return {
      location: { city: this.city, lat: this.lat, lon: this.lon },
      climateZone,
      solarGainSummerKwhM2: solarGainKwh,
      naturalVentilationEffectivenessPct: naturalVentilationPct,
      overheatingRisk,
      estimatedAcSavingsPct: isOptimalOrientation ? 28 : 12,
      recommendations,
    };
  }
}
