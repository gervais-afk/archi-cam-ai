// lib/quote/geometry-to-quote.ts
// ═══════════════════════════════════════════════════════════════
// CONVERSION GÉOMÉTRIE → DEVIS FCFA (MERCURIALE BTP CAMEROUN 2025/2026)
// ═══════════════════════════════════════════════════════════════

export interface RoomGeometry {
  id: string;
  name: string;
  area_m2: number;
  perimeter_m: number;
}

export interface WallSegment {
  id: string;
  length_m: number;
  thickness_px: number;
  orientation: string;
}

export interface QuoteGeometry {
  scale_px_per_m: number;
  total_wall_length_m: number;
  total_floor_area_m2: number;
  rooms: RoomGeometry[];
  walls: WallSegment[];
  plan_type: string;
}

export interface QuoteLine {
  poste: string;
  detail: string;
  unite: string;
  quantite: number;
  prix_unitaire_fcfa: number;
  total_fcfa: number;
}

// Prix unitaires Cameroun 2025/2026 (FCFA)
export const PRIX_UNITAIRES = {
  // Gros œuvre
  mur_parpaing_15cm_m2   : 45_000,
  mur_parpaing_20cm_m2   : 52_000,
  enduit_ciment_m2       : 8_500,
  fondation_lineaire_ml  : 85_000,

  // Sols
  carrelage_pose_m2      : 22_000,
  parquet_stratifie_m2   : 35_000,
  chape_ciment_m2        : 12_000,

  // Menuiserie
  porte_bois_standard    : 185_000,
  porte_bois_chambre     : 145_000,
  fenetre_aluminium_m2   : 95_000,

  // Plomberie
  point_eau_complet      : 180_000,
  wc_complet             : 320_000,
  douche_complete        : 280_000,

  // Électricité
  point_electrique       : 35_000,
  tableau_electrique     : 450_000,

  // Toiture
  charpente_m2           : 38_000,
  couverture_tole_m2     : 22_000,
};

export function geometryToQuote(
  geometry: QuoteGeometry,
  lmJson?: any
): QuoteLine[] {

  const lines: QuoteLine[] = [];
  const rooms  = geometry.rooms || [];
  const walls  = geometry.walls || [];

  // ── 1. Fondations ──
  lines.push({
    poste     : "Fondations",
    detail    : "Fouilles + béton de propreté + fondations filantes",
    unite     : "ml",
    quantite  : Math.round(geometry.total_wall_length_m),
    prix_unitaire_fcfa: PRIX_UNITAIRES.fondation_lineaire_ml,
    total_fcfa: Math.round(
      geometry.total_wall_length_m * PRIX_UNITAIRES.fondation_lineaire_ml
    ),
  });

  // ── 2. Murs par type ──
  const murs_porteurs = walls.filter(w => w.thickness_px > 15);
  const murs_cloisons = walls.filter(w => w.thickness_px <= 15);

  if (murs_porteurs.length > 0) {
    const total_ml = murs_porteurs.reduce((s, w) => s + w.length_m, 0);
    const hauteur_mur = 3.0; // m standard Cameroun

    lines.push({
      poste     : "Maçonnerie — Murs Porteurs",
      detail    : "Parpaings 20cm, hourdis, chaînages verticaux BAEL 91",
      unite     : "m²",
      quantite  : Math.round(total_ml * hauteur_mur),
      prix_unitaire_fcfa: PRIX_UNITAIRES.mur_parpaing_20cm_m2,
      total_fcfa: Math.round(
        total_ml * hauteur_mur * PRIX_UNITAIRES.mur_parpaing_20cm_m2
      ),
    });
  } else if (geometry.total_wall_length_m > 0) {
    const hauteur_mur = 3.0;
    lines.push({
      poste     : "Maçonnerie — Murs Élévation",
      detail    : "Parpaings 20cm creux et chaînages armés",
      unite     : "m²",
      quantite  : Math.round(geometry.total_wall_length_m * hauteur_mur),
      prix_unitaire_fcfa: PRIX_UNITAIRES.mur_parpaing_20cm_m2,
      total_fcfa: Math.round(
        geometry.total_wall_length_m * hauteur_mur * PRIX_UNITAIRES.mur_parpaing_20cm_m2
      ),
    });
  }

  if (murs_cloisons.length > 0) {
    const total_ml = murs_cloisons.reduce((s, w) => s + w.length_m, 0);
    const hauteur_mur = 3.0;

    lines.push({
      poste     : "Maçonnerie — Cloisons",
      detail    : "Parpaings 15cm, cloisons séparatives",
      unite     : "m²",
      quantite  : Math.round(total_ml * hauteur_mur),
      prix_unitaire_fcfa: PRIX_UNITAIRES.mur_parpaing_15cm_m2,
      total_fcfa: Math.round(
        total_ml * hauteur_mur * PRIX_UNITAIRES.mur_parpaing_15cm_m2
      ),
    });
  }

  // ── 3. Sols par pièce ──
  for (const room of rooms) {
    let prix_m2  = PRIX_UNITAIRES.carrelage_pose_m2;
    let materiau = "Carrelage grès cérame";

    const nameLower = (room.name || "").toLowerCase();
    if (nameLower.includes("chambre") ||
        nameLower.includes("séjour") ||
        nameLower.includes("salon")  ||
        nameLower.includes("bureau")) {
      prix_m2  = PRIX_UNITAIRES.parquet_stratifie_m2;
      materiau = "Parquet stratifié teck";
    }

    lines.push({
      poste     : `Sol — ${room.name || "Pièce"}`,
      detail    : `${materiau} + chape (${room.area_m2} m²)`,
      unite     : "m²",
      quantite  : room.area_m2,
      prix_unitaire_fcfa: prix_m2,
      total_fcfa: Math.round(room.area_m2 * prix_m2),
    });
  }

  // ── 4. Sanitaires ──
  const nb_wc = rooms.filter(
    r => (r.name || "").toLowerCase().includes("toil") ||
         (r.name || "").toLowerCase().includes("wc")
  ).length;

  const nb_sdb = rooms.filter(
    r => (r.name || "").toLowerCase().includes("bain") ||
         (r.name || "").toLowerCase().includes("douche") ||
         (r.name || "").toLowerCase().includes("sdb")
  ).length;

  if (nb_wc > 0) {
    lines.push({
      poste     : "Plomberie — WC",
      detail    : "Cuvette WC + robinetterie + évacuation",
      unite     : "u",
      quantite  : nb_wc,
      prix_unitaire_fcfa: PRIX_UNITAIRES.wc_complet,
      total_fcfa: nb_wc * PRIX_UNITAIRES.wc_complet,
    });
  }

  if (nb_sdb > 0) {
    lines.push({
      poste     : "Plomberie — Douches/SDB",
      detail    : "Receveur + robinetterie + carrelage mural",
      unite     : "u",
      quantite  : nb_sdb,
      prix_unitaire_fcfa: PRIX_UNITAIRES.douche_complete,
      total_fcfa: nb_sdb * PRIX_UNITAIRES.douche_complete,
    });
  }

  // ── 5. Toiture ──
  const totalArea = geometry.total_floor_area_m2 > 0 ? geometry.total_floor_area_m2 : 120;
  lines.push({
    poste     : "Toiture",
    detail    : "Charpente bois + tôle bac acier galvanisé",
    unite     : "m²",
    quantite  : Math.round(totalArea * 1.15),
    prix_unitaire_fcfa:
      PRIX_UNITAIRES.charpente_m2 + PRIX_UNITAIRES.couverture_tole_m2,
    total_fcfa: Math.round(
      totalArea * 1.15 *
      (PRIX_UNITAIRES.charpente_m2 + PRIX_UNITAIRES.couverture_tole_m2)
    ),
  });

  return lines;
}

export function computeQuoteTotals(lines: QuoteLine[]) {
  const ht     = lines.reduce((s, l) => s + l.total_fcfa, 0);
  const tva    = Math.round(ht * 0.1925); // TVA Cameroun 19.25%
  const imprevu = Math.round(ht * 0.05);  // Imprévus 5%
  const ttc    = ht + tva + imprevu;

  return {
    total_ht_fcfa    : ht,
    tva_fcfa         : tva,
    imprevus_fcfa    : imprevu,
    total_ttc_fcfa   : ttc,
    total_ttc_format : new Intl.NumberFormat("fr-CM").format(ttc) + " FCFA",
  };
}
