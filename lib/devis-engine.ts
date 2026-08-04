import { EstimateLine, ProjectEstimate } from "@/types";
import { logEvent } from "./logger";

export interface B2CParams {
  surfaceSol: number;
  niveaux: number; // RDC = 1, R+1 = 2, R+2 = 3...
  hauteurPlafond: number;
  standing: "eco" | "moyen" | "prestige";
  ville: string;
  margeBetPct: number;
  margeAleasPct: number;
}

// Standing Multipliers for finishing quality
const STANDING_FACTORS = {
  eco: { factor: 1.0, tilePrice: 7500, label: "Finition Standard Éco" },
  moyen: { factor: 1.4, tilePrice: 11500, label: "Finition Standing Moyen" },
  prestige: { factor: 2.2, tilePrice: 26000, label: "Finition Premium Prestige (Marbre/Grès)" }
};

// City transport & enrobage factors
const CITY_COEFFICIENTS: Record<string, number> = {
  Yaounde: 1.0,
  Douala: 1.05, // High urban congestion
  Kribi: 1.15,   // Marine enrobage compliance (corrosion resistance)
  Autre: 0.95
};

/**
 * MOTEUR DE CALCUL DE DEVIS DQE (ARHI CAM AI)
 * Calcule un devis complet en Gros Œuvre et Second Œuvre basé sur des ratios réels du BTP au Cameroun.
 */
export function calculateB2Cestimate(params: B2CParams): ProjectEstimate {
  const {
    surfaceSol,
    niveaux,
    hauteurPlafond,
    standing,
    ville,
    margeBetPct,
    margeAleasPct
  } = params;

  // 1. Fetch multipliers
  const standingConf = STANDING_FACTORS[standing] || STANDING_FACTORS.moyen;
  const cityFactor = CITY_COEFFICIENTS[ville] || CITY_COEFFICIENTS.Yaounde;

  // Total floor area
  const totalHabitableArea = surfaceSol * niveaux;

  // 2. Core structural calculations (Eurocode 2 / DTU equivalents for Central Africa)
  
  // A. Columns (Poteaux): 1 column per 15 m2 (as validated by the user)
  const columnsCount = Math.ceil(surfaceSol / 15);
  const totalColumnHeight = columnsCount * hauteurPlafond * niveaux;
  // Volume concrete columns = section (0.2 x 0.2 = 0.04m2) * total height
  const concretePoteaux = totalColumnHeight * 0.04;

  // B. Slabs (Dalles)
  // Ground floor slab = 12cm, upper floors = 15cm
  const concreteSlabGround = surfaceSol * 0.12;
  const concreteSlabUpper = surfaceSol * 0.15 * (niveaux - 1);
  const concreteSlabsTotal = concreteSlabGround + concreteSlabUpper;

  // C. Beams (Poutres) & Foundations (estimated ratios)
  const concreteBeams = concreteSlabsTotal * 0.08;
  const concreteFoundations = surfaceSol * 0.15; // clean thickness average

  // Total concrete volume
  const totalConcreteVolume = concretePoteaux + concreteSlabsTotal + concreteBeams + concreteFoundations;

  // D. HA Steel (Acier Haute Adhérence)
  // kg per m3 of concrete: poteaux (100kg), slabs (80kg), beams (90kg), foundations (70kg)
  const steelWeight = 
    (concretePoteaux * 100) + 
    (concreteSlabsTotal * 80) + 
    (concreteBeams * 90) + 
    (concreteFoundations * 70);

  // E. Masonry Walls (Murs en parpaings)
  const perimeter = 4 * Math.sqrt(surfaceSol);
  // Estimate internal partitions using a multiplier factor of 1.25x the perimeter
  const wallArea = perimeter * hauteurPlafond * niveaux * 1.25;
  const parpaingsCount = Math.ceil(wallArea * 12.5); // 12.5 blocks per m2 of wall

  // 3. Mercuriale Prices (calibrated Cameroun market price list adjusted by city factors)
  const basePrices = {
    cimentBag: 4950,    // CPJ 42.5 bag
    sableM3: 18000,     // Sable Sanaga
    gravierM3: 22000,   // Gravier concassé
    acierKg: 850,       // HA steel
    parpaingUnit: 350,  // Parpaing 15
    enduitM2: 3000,     // Plaster & application
    peintureM2: 2500    // Paint & application
  };

  // Adjust base prices with city coefficient
  const cimentPrice = Math.round(basePrices.cimentBag * cityFactor);
  const sablePrice = Math.round(basePrices.sableM3 * cityFactor);
  const gravierPrice = Math.round(basePrices.gravierM3 * cityFactor);
  const steelPrice = Math.round(basePrices.acierKg * cityFactor);
  const parpaingPrice = Math.round(basePrices.parpaingUnit * cityFactor);

  // 4. Build Estimate Lines

  const lines: EstimateLine[] = [];

  // Line 1: Ciment (7 bags per m3 of concrete average dosage 350kg/m3)
  const cimentBagsNeeded = Math.ceil(totalConcreteVolume * 7);
  lines.push({
    code: "GO-CIM",
    category: "Gros Œuvre",
    label: `Ciment CPJ 42.5 (dosage 350kg/m³ pour bétons structuraux)`,
    quantity: cimentBagsNeeded,
    unit: "Sac",
    unitPrice: cimentPrice,
    totalPrice: cimentBagsNeeded * cimentPrice
  });

  // Line 2: Sable Sanaga (0.4m3 per m3 of concrete)
  const sableM3Needed = Math.round(totalConcreteVolume * 0.4 * 100) / 100;
  lines.push({
    code: "GO-SAB",
    category: "Gros Œuvre",
    label: "Sable fin de la Sanaga (bétons & mortiers)",
    quantity: sableM3Needed,
    unit: "m³",
    unitPrice: sablePrice,
    totalPrice: Math.round(sableM3Needed * sablePrice)
  });

  // Line 3: Gravier 15/25 (0.8m3 per m3 of concrete)
  const gravierM3Needed = Math.round(totalConcreteVolume * 0.8 * 100) / 100;
  lines.push({
    code: "GO-GRA",
    category: "Gros Œuvre",
    label: "Gravier concassé 15/25 (béton d'ouvrage)",
    quantity: gravierM3Needed,
    unit: "m³",
    unitPrice: gravierPrice,
    totalPrice: Math.round(gravierM3Needed * gravierPrice)
  });

  // Line 4: Acier HA (structural reinforcement)
  const steelWeightRounded = Math.ceil(steelWeight);
  lines.push({
    code: "GO-ACIER",
    category: "Gros Œuvre",
    label: `Acier de ferraillage Haute Adhérence (HA)`,
    quantity: steelWeightRounded,
    unit: "kg",
    unitPrice: steelPrice,
    totalPrice: steelWeightRounded * steelPrice
  });

  // Line 5: Masonry walls (Parpaings)
  lines.push({
    code: "GO-PAR15",
    category: "Gros Œuvre",
    label: `Parpaing de 15x20x40 (montage murs extérieurs et cloisons)`,
    quantity: parpaingsCount,
    unit: "U",
    unitPrice: parpaingPrice,
    totalPrice: parpaingsCount * parpaingPrice
  });

  // Line 6: Tiles (Carrelage Grès/Marbre based on standing)
  const tilePrice = Math.round(standingConf.tilePrice * cityFactor);
  const tilesQty = Math.round(totalHabitableArea * 0.95);
  lines.push({
    code: "SO-CAR",
    category: "Second Œuvre",
    label: `${standingConf.label} (pose carrelage sol habitable)`,
    quantity: tilesQty,
    unit: "m²",
    unitPrice: tilePrice,
    totalPrice: tilesQty * tilePrice
  });

  // Line 7: Plaster (Enduits extérieurs & intérieurs double face)
  const plasterM2 = Math.round(wallArea * 2);
  const plasterUnitPrice = Math.round(basePrices.enduitM2 * cityFactor * standingConf.factor);
  lines.push({
    code: "SO-END",
    category: "Second Œuvre",
    label: "Enduit ciment lissé sur parois (façades & intérieur)",
    quantity: plasterM2,
    unit: "m²",
    unitPrice: plasterUnitPrice,
    totalPrice: plasterM2 * plasterUnitPrice
  });

  // Line 8: Paint (Peinture)
  const paintM2 = Math.round(wallArea * 2 + totalHabitableArea);
  const paintUnitPrice = Math.round(basePrices.peintureM2 * cityFactor * standingConf.factor);
  lines.push({
    code: "SO-PEI",
    category: "Second Œuvre",
    label: "Mise en peinture multicouches (Pantex de qualité)",
    quantity: paintM2,
    unit: "m²",
    unitPrice: paintUnitPrice,
    totalPrice: paintM2 * paintUnitPrice
  });

  // Calculate sum of core works (HT amount)
  const sumHt = lines.reduce((acc, l) => acc + l.totalPrice, 0);

  // Apply BET and Aleas multipliers dynamically
  const betAmount = Math.round(sumHt * (margeBetPct / 100));
  const aleasAmount = Math.round(sumHt * (margeAleasPct / 100));
  
  // Calculate HT with margins
  const totalHtMarges = sumHt + betAmount + aleasAmount;
  
  // Calculate TVA (19.25% in Cameroon)
  const tvaAmount = Math.round(totalHtMarges * 0.1925);
  
  const finalTtc = totalHtMarges + tvaAmount;

  const estimateResult = {
    totalAmount: finalTtc,
    currency: "FCFA",
    lines: lines,
    generatedAt: new Date(),
    totalHT: sumHt,
    margeBET: betAmount,
    margeAleas: aleasAmount,
    tva: tvaAmount,
    totalTTC: finalTtc
  };

  // Log in background
  logEvent({
    level: "info",
    event: "estimate_generated",
    message: `Devis B2C généré pour ${ville} (${standing})`,
    details: {
      params,
      totalTTC: finalTtc
    }
  }).catch(e => console.error("Logger error:", e));

  return estimateResult;
}

export function calculateDevisFromQuantities(quantities: {
  wallVolumeM3?: number;
  slabAreaM2?: number;
  doorCount?: number;
  windowCount?: number;
}): ProjectEstimate {
  const surfaceSol = quantities.slabAreaM2 || 120.0;
  return calculateB2Cestimate({
    surfaceSol: surfaceSol,
    niveaux: 1,
    hauteurPlafond: 3.0,
    standing: "moyen",
    ville: "Yaounde",
    margeBetPct: 5,
    margeAleasPct: 5,
  });
}
