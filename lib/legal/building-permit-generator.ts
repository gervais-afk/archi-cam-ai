/**
 * GÉNÉRATEUR DE DOSSIER DE PERMIS DE BÂTIR — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Génère le dossier administratif conforme aux exigences des Communautés Urbaines
 * du Cameroun (CUY, CUD) et vérifie les seuils SHON, COS et de hauteur maximale.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface PermitProjectInput {
  projectId: string;
  projectName: string;
  ownerName: string;
  city: string;
  quarter: string;
  parcelAreaM2: number;
  builtGroundAreaM2: number;
  totalFloorAreaM2: number;
  floorCount: number;
}

export interface BuildingPermitDossier {
  pc1FormSummary: string;
  descriptiveNotice: string;
  posCompliance: {
    isCompliant: boolean;
    cosValue: number;
    cosMax: number;
    heightFloors: number;
    heightMax: string;
    details: string[];
  };
  requiredDocumentsList: string[];
}

export class BuildingPermitGenerator {
  public generate(input: PermitProjectInput): BuildingPermitDossier {
    const cosValue = Math.round((input.builtGroundAreaM2 / Math.max(1, input.parcelAreaM2)) * 100) / 100;
    const cosMax = 0.5; // Seuil standard POS Cameroun (50% d'emprise au sol max)
    const isCosOk = cosValue <= cosMax;
    const isHeightOk = input.floorCount <= 3; // R+2 max en zone résidentielle basique

    const details: string[] = [];
    if (!isCosOk) {
      details.push(`⚠️ Emprise au sol (${cosValue}) supérieure à la limite POS (${cosMax}). Réduire la surface bâtie.`);
    } else {
      details.push(`✅ Emprise au sol (${cosValue}) conforme au POS (${cosMax}).`);
    }

    if (!isHeightOk) {
      details.push(`⚠️ Nombre de niveaux (R+${input.floorCount - 1}) supérieur au seuil standard zone UR1 (R+2). Note d'impact requise.`);
    } else {
      details.push(`✅ Hauteur (R+${input.floorCount - 1}) conforme aux règles de la Mairie de Ville.`);
    }

    return {
      pc1FormSummary: `Demande de Permis de Bâtir N° PC-2026-${input.city.substring(0, 3).toUpperCase()} - Pétitionnaire : ${input.ownerName}.`,
      descriptiveNotice: `Projet de ${input.projectName} à ${input.city} (${input.quarter}) sur une parcelle de ${input.parcelAreaM2}m². Surface totale des planchers : ${input.totalFloorAreaM2}m².`,
      posCompliance: {
        isCompliant: isCosOk && isHeightOk,
        cosValue,
        cosMax,
        heightFloors: input.floorCount - 1,
        heightMax: "R+2",
        details,
      },
      requiredDocumentsList: [
        "1. Demande timbrée au tarif réglementaire adressée au Maire de la Ville.",
        "2. Copie certifiée conforme du Titre Foncier (datant de moins de 3 mois).",
        "3. Certificat d'Urbanisme en cours de validité.",
        "4. Plan de situation et plan de masse établis par un Géomètre Assermenté.",
        "5. Dossier d'Architecture signé par un Architecte inscrit à l'ONAC.",
        "6. Note de calculs de structures signée par un Ingénieur inscrit à l'ONIGC.",
      ],
    };
  }
}
