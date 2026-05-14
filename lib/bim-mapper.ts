import { EstimateLine } from "@/types";

/**
 * SERVICE DE MAPPING BIM -> PRIX
 * Ce service transforme les données extraites d'un fichier IFC en lignes de devis (DQE)
 * en utilisant des ratios de construction standards au Cameroun.
 */

// Mapping statique pour le MVP (à terme remplacé par la table mapping_bim_prix en base)
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

// Simulation des prix de la mercuriale (Normalement récupérés via Supabase)
const MOCK_PRICES = {
  "GO-PAR15": { label: "Parpaing 15x20x40 (Vibrant)", category: "Gros Œuvre", price: 350 },
  "GO-CIM":   { label: "Ciment CPJ 42.5", category: "Gros Œuvre", price: 4950 },
  "GO-SAB":   { label: "Sable Sanaga", category: "Gros Œuvre", price: 18000 },
  "GO-GRA":   { label: "Gravier concassé 15/25", category: "Gros Œuvre", price: 22000 },
  "GO-ACIER": { label: "Acier Haute Adhérence (HA)", category: "Gros Œuvre", price: 850 }
};

export function mapIfcToEstimate(ifcData: any): EstimateLine[] {
  const lines: EstimateLine[] = [];
  
  if (!ifcData || !ifcData.elements) return [];

  ifcData.elements.forEach((el: any) => {
    const mappings = BIM_PRICE_MAPPING[el.type as keyof typeof BIM_PRICE_MAPPING];
    if (!mappings) return;

    mappings.forEach(map => {
      // Vérification du matériau (ex: 'Béton' ou 'Parpaing')
      if (el.material.toLowerCase().includes(map.material.toLowerCase())) {
        const volume = el.quantities.volume || 0;
        const qty = Math.round(volume * map.ratio * 100) / 100;
        const priceInfo = MOCK_PRICES[map.code as keyof typeof MOCK_PRICES];
        
        if (priceInfo && qty > 0) {
          lines.push({
            code: map.code,
            category: priceInfo.category,
            label: `${priceInfo.label} [${el.name || el.type}]`,
            quantity: qty,
            unit: map.unit,
            unitPrice: priceInfo.price,
            totalPrice: Math.round(qty * priceInfo.price)
          });
        }
      }
    });

    // Gestion automatique du ferraillage si estimé par le script Python
    if (el.estimations?.ferraillage_kg && el.estimations.ferraillage_kg > 0) {
      const priceInfo = MOCK_PRICES["GO-ACIER"];
      lines.push({
        code: "GO-ACIER",
        category: "Gros Œuvre",
        label: `Acier HA (Ferraillage ${el.name || el.type})`,
        quantity: el.estimations.ferraillage_kg,
        unit: "kg",
        unitPrice: priceInfo.price,
        totalPrice: Math.round(el.estimations.ferraillage_kg * priceInfo.price)
      });
    }
  });

  // Agrégation des lignes identiques (optionnel pour la clarté)
  return aggregateEstimateLines(lines);
}

function aggregateEstimateLines(lines: EstimateLine[]): EstimateLine[] {
  const aggregated: Record<string, EstimateLine> = {};

  lines.forEach(line => {
    const key = `${line.code}-${line.category}`;
    if (aggregated[key]) {
      aggregated[key].quantity += line.quantity;
      aggregated[key].totalPrice += line.totalPrice;
      // On garde le label le plus générique
      aggregated[key].label = aggregated[key].label.split(' [')[0];
    } else {
      aggregated[key] = { ...line };
      aggregated[key].label = aggregated[key].label.split(' [')[0];
    }
  });

  return Object.values(aggregated).map(l => ({
    ...l,
    quantity: Math.round(l.quantity * 100) / 100
  }));
}
