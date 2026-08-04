import { EstimateLine } from "@/types";

/**
 * SERVICE DE MAPPING BIM -> PRIX (SCoT v0.2 Industrialisé)
 * Ce service transforme les données extraites d'un fichier IFC en lignes de devis (DQE)
 * en appliquant :
 *  - Les coefficients de chutes et pertes réels de chantier (Waste Factors : +5% à +10%)
 *  - L'indexation de volatilité de l'acier (K_volatilité)
 *  - Les prix unitaires réels de la mercuriale MINMAP 2026.
 */

// Coefficients de Pertes et Chutes de Chantier réels (BTP Cameroun)
export const WASTE_FACTORS: Record<string, { pct: number; label: string }> = {
  "GO-PAR15": { pct: 0.08, label: "+8% casse & manutention" },
  "GO-CIM":   { pct: 0.05, label: "+5% stockage & humidité" },
  "GO-SAB":   { pct: 0.07, label: "+7% érosion & transport" },
  "GO-GRA":   { pct: 0.06, label: "+6% tassement & pertes" },
  "GO-ACIER": { pct: 0.10, label: "+10% chutes de découpe barres 12m" }
};

const BIM_PRICE_MAPPING = {
  "IfcWall": [
    { material: "Parpaing", code: "GO-PAR15", ratio: 66, unit: "U" }
  ],
  "IfcSlab": [
    { material: "Béton", code: "GO-CIM", ratio: 7, unit: "Sac" },
    { material: "Béton", code: "GO-SAB", ratio: 0.4, unit: "m³" },
    { material: "Béton", code: "GO-GRA", ratio: 0.8, unit: "m³" }
  ],
  "IfcColumn": [
    { material: "Béton", code: "GO-CIM", ratio: 8, unit: "Sac" },
    { material: "Béton", code: "GO-SAB", ratio: 0.45, unit: "m³" },
    { material: "Béton", code: "GO-GRA", ratio: 0.85, unit: "m³" }
  ],
  "IfcBeam": [
    { material: "Béton", code: "GO-CIM", ratio: 8, unit: "Sac" },
    { material: "Béton", code: "GO-SAB", ratio: 0.45, unit: "m³" },
    { material: "Béton", code: "GO-GRA", ratio: 0.85, unit: "m³" }
  ]
};

// Prix officiels MINMAP 2026 par défaut
const MINMAP_DEFAULT_PRICES: Record<string, { label: string; category: string; price: number }> = {
  "GO-PAR15": { label: "Parpaing 15x20x40 (Vibrant)", category: "Gros Œuvre", price: 680 },
  "GO-CIM":   { label: "Ciment CPJ 42.5 (Cimencam)", category: "Gros Œuvre", price: 4950 },
  "GO-SAB":   { label: "Sable Sanaga lavé", category: "Gros Œuvre", price: 13500 },
  "GO-GRA":   { label: "Gravier concassé 15/25", category: "Gros Œuvre", price: 19200 },
  "GO-ACIER": { label: "Fer à béton Ø12 High Yield", category: "Gros Œuvre", price: 850 }
};

export function mapIfcToEstimate(
  ifcData: any,
  options?: {
    dynamicPrices?: Record<string, { label: string; category: string; price: number }>;
    applyWasteFactor?: boolean;
    volatilityIndexSteel?: number;
  }
): EstimateLine[] {
  const lines: EstimateLine[] = [];
  const prices = options?.dynamicPrices || MINMAP_DEFAULT_PRICES;
  const useWaste = options?.applyWasteFactor !== false; // Par défaut true
  const kVolSteel = options?.volatilityIndexSteel || 1.04; // +4% indexation volatilité acier

  if (!ifcData || !ifcData.elements) return [];

  ifcData.elements.forEach((el: any) => {
    const mappings = BIM_PRICE_MAPPING[el.type as keyof typeof BIM_PRICE_MAPPING];
    if (!mappings) return;

    mappings.forEach((map) => {
      const matName = el.material || "";
      if (matName.toLowerCase().includes(map.material.toLowerCase()) || matName === "") {
        const volume = el.quantities?.volume || 0;
        let qtyNet = Math.round(volume * map.ratio * 100) / 100;

        if (qtyNet > 0) {
          const wasteObj = WASTE_FACTORS[map.code];
          const wastePct = useWaste && wasteObj ? wasteObj.pct : 0;
          const qtyGross = Math.round(qtyNet * (1 + wastePct) * 100) / 100;

          const priceInfo = prices[map.code] || MINMAP_DEFAULT_PRICES[map.code];

          if (priceInfo) {
            lines.push({
              code: map.code,
              category: priceInfo.category,
              label: `${priceInfo.label} [${el.name || el.type}]`,
              quantity: qtyGross,
              unit: map.unit,
              unitPrice: priceInfo.price,
              totalPrice: Math.round(qtyGross * priceInfo.price),
              justification: wasteObj ? `Qté brute avec ${wasteObj.label}` : undefined
            });
          }
        }
      }
    });

    // Gestion du ferraillage avec perte de découpe + indexation volatilité
    if (el.estimations?.ferraillage_kg && el.estimations.ferraillage_kg > 0) {
      const priceInfo = prices["GO-ACIER"] || MINMAP_DEFAULT_PRICES["GO-ACIER"];
      const wasteObj = WASTE_FACTORS["GO-ACIER"];
      const wastePct = useWaste && wasteObj ? wasteObj.pct : 0;
      
      const steelNet = el.estimations.ferraillage_kg;
      const steelGross = Math.round(steelNet * (1 + wastePct) * 100) / 100;
      const priceVolatile = Math.round(priceInfo.price * kVolSteel);

      lines.push({
        code: "GO-ACIER",
        category: "Gros Œuvre",
        label: `Acier HA (Ferraillage ${el.name || el.type})`,
        quantity: steelGross,
        unit: "kg",
        unitPrice: priceVolatile,
        totalPrice: Math.round(steelGross * priceVolatile),
        justification: `Inclus ${wasteObj?.label} et K_volatilité=${kVolSteel}`
      });
    }
  });

  return aggregateEstimateLines(lines);
}

function aggregateEstimateLines(lines: EstimateLine[]): EstimateLine[] {
  const aggregated: Record<string, EstimateLine> = {};

  lines.forEach((line) => {
    const key = `${line.code}-${line.category}`;
    if (aggregated[key]) {
      aggregated[key].quantity += line.quantity;
      aggregated[key].totalPrice += line.totalPrice;
      aggregated[key].label = aggregated[key].label.split(" [")[0];
    } else {
      aggregated[key] = { ...line };
      aggregated[key].label = aggregated[key].label.split(" [")[0];
    }
  });

  return Object.values(aggregated).map((l) => ({
    ...l,
    quantity: Math.round(l.quantity * 100) / 100,
  }));
}
