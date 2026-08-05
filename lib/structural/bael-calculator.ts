/**
 * CALCULATEUR STRUCTURAL AUTOMATISÉ BAEL 91 & EUROCODE 2 — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Dimensionne automatiquement les poteaux, poutres, semelles isolées,
 * le tonnage d'acier FeE500 et le volume de béton (C25/30) selon les normes
 * en vigueur au Cameroun et en Afrique Tropicale.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface ColumnDesign {
  id: string;
  position: { x: number; y: number };
  section: { width: number; height: number }; // cm
  reinforcement: {
    longitudinal: string; // Ex: "8HA20"
    transversal: string;  // Ex: "Cadres HA8 e=15cm"
  };
  concreteGrade: "C20/25" | "C25/30" | "C30/37";
  loads: {
    permanent: number; // kN (G)
    variable: number;  // kN (Q)
    ultimate: number;  // kN (Nu = 1.35G + 1.5Q)
  };
}

export interface FootingDesign {
  columnId: string;
  dimensions: { width: number; length: number; height: number }; // mètres
  reinforcement: string;
}

export interface StructuralDesign {
  columns: ColumnDesign[];
  foundations: FootingDesign[];
  totalSteelWeightTons: number;
  totalConcreteVolumeM3: number;
  ratios: {
    steelDensityKgPerM3: number;
    safetyFactor: number;
  };
}

export class BAELStructuralCalculator {
  private readonly GAMMA_B = 1.5;   // Coefficient sécurité béton
  private readonly GAMMA_S = 1.15;  // Coefficient sécurité acier
  private readonly FE_E500 = 500;   // MPa (Acier Haute Adhérence FeE500)

  constructor(
    private soilBearingMpa: number = 0.25, // Contrainte admissible du sol (250 kPa)
    private isCoastalZone: boolean = false  // Air salin corrosif (Douala / Kribi)
  ) {}

  public designBuildingStructure(
    rooms: Array<{ surface_m2: number; name: string }>,
    numberOfFloors: number = 2 // Ex: R+1 = 2 niveaux
  ): StructuralDesign {
    const totalSurface = rooms.reduce((sum, r) => sum + (r.surface_m2 || 15), 0);
    const estimatedColumnCount = Math.max(4, Math.ceil(totalSurface / 20) * 4);

    const columns: ColumnDesign[] = [];
    const foundations: FootingDesign[] = [];

    // Charge permanente G (0.7 t/m2 par niveau) et charge d'exploitation Q (0.25 t/m2)
    const loadPerM2Permanent = 7.0; // kN/m2
    const loadPerM2Variable = 2.5;  // kN/m2

    const areaPerColumn = totalSurface / estimatedColumnCount;

    for (let i = 1; i <= estimatedColumnCount; i++) {
      const g = loadPerM2Permanent * areaPerColumn * numberOfFloors;
      const q = loadPerM2Variable * areaPerColumn * numberOfFloors;
      const nu = 1.35 * g + 1.5 * q; // Charge ultime Nu (kN)

      // Section minimale BAEL (cm2)
      const fc28 = 25; // C25/30
      const requiredAreaCm2 = (nu / (0.85 * fc28 / this.GAMMA_B)) * 10;
      const sideCm = Math.max(25, Math.ceil(Math.sqrt(Math.max(1, requiredAreaCm2)) / 5) * 5);

      // Section d'acier longitudinal (1% à 4% de la section béton)
      const sectionAreaCm2 = sideCm * sideCm;
      const minSteelAreaCm2 = 0.01 * sectionAreaCm2;
      const barCount = Math.max(8, Math.ceil(minSteelAreaCm2 / 3.142) * 2); // Barres HA20

      // Enrobage minimal (35mm intérieur, 50mm zone côtière)
      const stirrupSpacing = this.isCoastalZone ? 12 : 15;

      columns.push({
        id: `POTEAU_P${i}`,
        position: { x: (i % 4) * 4.5, y: Math.floor(i / 4) * 4.5 },
        section: { width: sideCm, height: sideCm },
        reinforcement: {
          longitudinal: `${barCount}HA20`,
          transversal: `Cadres HA8 e=${stirrupSpacing}cm (Enrobage ${this.isCoastalZone ? "50mm" : "35mm"})`,
        },
        concreteGrade: "C25/30",
        loads: {
          permanent: Math.round(g),
          variable: Math.round(q),
          ultimate: Math.round(nu),
        },
      });

      // Dimensionnement semelle isolée
      const soilBearingKpa = this.soilBearingMpa * 1000;
      const footingAreaReqM2 = nu / soilBearingKpa;
      const footingSideM = Math.ceil(Math.sqrt(Math.max(0.64, footingAreaReqM2)) * 10) / 10;
      const footingHeightM = Math.max(0.4, Math.ceil((footingSideM - sideCm / 100) / 0.25) / 10);

      foundations.push({
        columnId: `POTEAU_P${i}`,
        dimensions: { width: footingSideM, length: footingSideM, height: footingHeightM },
        reinforcement: `Nappe Quadrillée HA12 e=15cm`,
      });
    }

    // Calculs globaux du béton (m3) et acier (tonnes)
    let totalConcreteM3 = 0;
    columns.forEach((c) => {
      totalConcreteM3 += (c.section.width / 100) * (c.section.height / 100) * 3.0 * numberOfFloors;
    });
    foundations.forEach((f) => {
      totalConcreteM3 += f.dimensions.width * f.dimensions.length * f.dimensions.height;
    });

    const steelDensity = 90; // 90 kg d'acier HA FeE500 par m3 de béton armé
    const totalSteelWeightTons = (totalConcreteM3 * steelDensity) / 1000;

    return {
      columns,
      foundations,
      totalSteelWeightTons: Math.round(totalSteelWeightTons * 100) / 100,
      totalConcreteVolumeM3: Math.round(totalConcreteM3 * 10) / 10,
      ratios: {
        steelDensityKgPerM3: steelDensity,
        safetyFactor: 1.35,
      },
    };
  }
}
