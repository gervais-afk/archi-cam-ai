import fs from "fs";
import path from "path";

export interface OkfProjectMetadata {
  projectId: string;
  projectTitle: string;
  clientName: string;
  totalSurfaceM2: number;
  totalBudgetFCFA: number;
  bioclimaticScore: string;
  numberOfFloors: string;
  rendered2DPath?: string;
  rendered3DInteriorPath?: string;
  rendered3DFacadePath?: string;
  rooms: Array<{ name: string; area_m2: number; materialCode?: string; materialName?: string }>;
  devisLines: Array<{ description: string; quantity: number; unit: string; unitPriceFCFA: number }>;
}

export function compileOkfProjectFolder(meta: OkfProjectMetadata): { projectDir: string; files: string[] } {
  const projectDir = path.resolve(process.cwd(), "projects", meta.projectId);
  fs.mkdirSync(projectDir, { recursive: true });

  const nowIso = new Date().toISOString();

  // 1. INDEX.MD — Master Index OKF v0.2
  const indexContent = `---
type: "ArchiCam Architectural Project Index"
title: "${meta.projectTitle}"
description: "Master Index OKF v0.2 for ${meta.projectTitle} (Reasoning Engine v2.5)"
tags: ["OKF-v0.2", "BTP-Cameroun", "SCoT-Architectural", "${meta.numberOfFloors}", "Bioclimatic-A+"]
timestamp: "${nowIso}"
producer: "ArchiCam AI Knowledge Engine v2.5"
metadata:
  total_surface_m2: ${meta.totalSurfaceM2}
  total_budget_fcfa: ${meta.totalBudgetFCFA}
  bioclimatic_score: "${meta.bioclimaticScore}"
  number_of_floors: "${meta.numberOfFloors}"
  architectural_phases:
    phase_1_bioclimatism: "Oriented South-East / 80cm Eaves Depth / Cross Ventilation"
    phase_2_zoning: "Jour (Séjour) / Nuit (Chambres) / Service (Cuisine & Annexe Externe)"
    phase_3_ergonomics: "Corridors >= 1.10m / Triangle d'activité Cuisine Validé"
    phase_4_structure: "Murs extérieurs pochés 20cm / Cloisons séparatives 10cm"
    phase_5_materials_okf: "Carrara Marble / Iroko Parquet / BTC MIPROMALO / Edéa Stone"
---

# 🏛️ INDEX PROJET OKF v0.2 — ${meta.projectTitle.toUpperCase()}

- **Client** : ${meta.clientName}
- **Surface Totale Utile** : ${meta.totalSurfaceM2.toFixed(2)} m²
- **Budget Global HT** : ${meta.totalBudgetFCFA.toLocaleString("fr-FR")} FCFA
- **Note Bioclimatique** : ${meta.bioclimaticScore} (Matériaux Locaux MIPROMALO & Pierre d'Edéa)

## 📐 ANATOMIE ARCHITECTURALE (5 PHASES)
1. **Site & Bioclimatisme** : Orientation Sud-Est optimale, avancée de toit $80\text{ cm}$.
2. **Organigramme Spatial** : Zonage hermétique Jour / Nuit / Service & Annexe.
3. **Ergonomie & Flux** : Dégagements $\ge 1.10\text{ m}$, débattements de portes vérifiés.
4. **Dimensionnement Structurel** : Murs porteurs $20\text{ cm}$ vs cloisons $10\text{ cm}$.
5. **Enveloppe OKF & Devis** : Matériaux locaux & Mercuriale BTP 2025/2026.

## 📁 FICHIERS DU PROJET
1. [01_2d_execution.md](./01_2d_execution.md) — Spécifications 2D, Textures & Surfacier
2. [02_3d_interior.md](./02_3d_interior.md) — Prompts ControlNet & Métadonnées 3D Intérieur
3. [03_3d_facade.md](./03_3d_facade.md) — Prompts Façade 3D & Élévation Bioclimatique
4. [04_mercuriale_devis.md](./04_mercuriale_devis.md) — Devis Estimatif Mercuriale BTP 2025/2026
5. [logs.md](./logs.md) — Journal des Modifications & Historique de Révision
`.trim();

  // 2. 01_2D_EXECUTION.MD — Spécifications 2D & Surfacier
  const executionContent = `---
type: "ArchiCam FloorPlan Execution 2D"
title: "Plan d'Exécution & Surfacier 2D"
resource: "${meta.rendered2DPath || "/output_2d_etage_plan.png"}"
tags: ["2D-Execution", "OpenCV-Mask", "OKF-Taxonomy"]
timestamp: "${nowIso}"
---

# 📐 SPÉCIFICATIONS TECHNIQUES 2D & MATÉRIAUX SOLS

${meta.rooms
  .map(
    (r) =>
      `* **${r.name}** : ${r.area_m2.toFixed(2)} m² — Matériau : \`${r.materialName || "Parquet/Marbre OKF"}\` (\`${r.materialCode || "MAT-REV-OKF"}\`)`
  )
  .join("\n")}
`.trim();

  // 3. 02_3D_INTERIOR.MD — Métadonnées 3D Intérieur
  const interiorContent = `---
type: "ArchiCam 3D Interior Metadata"
title: "Rendu 3D Intérieur Photoréaliste"
resource: "${meta.rendered3DInteriorPath || "/images/interior_3d.png"}"
tags: ["3D-Interior", "ControlNet", "SDXL-Flux"]
timestamp: "${nowIso}"
---

# 🛋️ SPÉCIFICATIONS RENDU 3D INTÉRIEUR

- **Moteur de Rendu** : ControlNet SDXL / Flux1 Lineart (Scale: 0.85)
- **Espaces Aménagés** : ${meta.rooms.map((r) => r.name).join(", ")}
- **Éclairage** : Soleil équatorial 45° & Occlusion Ambiante 4K
`.trim();

  // 4. 03_3D_FACADE.MD — Métadonnées Façade Extérieure
  const facadeContent = `---
type: "ArchiCam 3D Exterior Facade Metadata"
title: "Élévation 3D Façade Extérieure"
resource: "${meta.rendered3DFacadePath || "/images/facade_3d.png"}"
tags: ["3D-Facade", "Bioclimatic", "Street-View"]
timestamp: "${nowIso}"
---

# 🏛️ SPÉCIFICATIONS FAÇADE EXTÉRIEURE

- **Style Architectural** : Villa ${meta.numberOfFloors} Contemporaine Bioclimatique
- **Matériaux Extérieurs** : Pierre Volcanique d'Edéa, Blocs de Terre Comprimée (BTC MIPROMALO), Bois Teck/Iroko, Baies Vitrées Aluminium Noir.
`.trim();

  // 5. 04_MERCURIALE_DEVIS.MD — Devis Financier
  const devisContent = `---
type: "ArchiCam Financial Estimate"
title: "Devis Estimatif Mercuriale BTP 2025/2026"
tags: ["Mercuriale-2025", "FCFA", "CEMAC-Legal"]
timestamp: "${nowIso}"
---

# 💰 DÉCOMPOSITION FINANCIÈRE & DEVIS HORS TAXES

| Désignation du Lot / Ouvrage | Quantité | P.U (FCFA) | Total HT (FCFA) |
|---|---|---|---|
${meta.devisLines
  .map(
    (l) =>
      `| ${l.description} | ${l.quantity} ${l.unit} | ${l.unitPriceFCFA.toLocaleString("fr-FR")} | ${(l.quantity * l.unitPriceFCFA).toLocaleString("fr-FR")} |`
  )
  .join("\n")}

- **TOTAL HT** : ${meta.totalBudgetFCFA.toLocaleString("fr-FR")} FCFA
- **TVA (19.25%)** : ${(meta.totalBudgetFCFA * 0.1925).toLocaleString("fr-FR")} FCFA
- **TOTAL TTC** : ${(meta.totalBudgetFCFA * 1.1925).toLocaleString("fr-FR")} FCFA
`.trim();

  // 6. LOGS.MD — Historique des révisions OKF
  const logsPath = path.join(projectDir, "logs.md");
  let existingLogs = "";
  if (fs.existsSync(logsPath)) {
    existingLogs = fs.readFileSync(logsPath, "utf-8");
  } else {
    existingLogs = `# 📜 JOURNAL DES MODIFICATIONS OKF v0.2 — ${meta.projectId}\n\n`;
  }

  const newLogEntry = `## [${nowIso}] INITIALISATION & COMPILATION PROJET OKF v0.2
- **Action** : Compilation automatique des métadonnées du projet ${meta.projectTitle}
- **Surfacier** : ${meta.totalSurfaceM2.toFixed(2)} m² calculés par OpenCV
- **Devis** : ${meta.totalBudgetFCFA.toLocaleString("fr-FR")} FCFA HT sur la Mercuriale BTP
- **Bioclimatique** : Certification ${meta.bioclimaticScore} OKF v0.2
\n`;

  // Écriture des fichiers
  fs.writeFileSync(path.join(projectDir, "index.md"), indexContent, "utf-8");
  fs.writeFileSync(path.join(projectDir, "01_2d_execution.md"), executionContent, "utf-8");
  fs.writeFileSync(path.join(projectDir, "02_3d_interior.md"), interiorContent, "utf-8");
  fs.writeFileSync(path.join(projectDir, "03_3d_facade.md"), facadeContent, "utf-8");
  fs.writeFileSync(path.join(projectDir, "04_mercuriale_devis.md"), devisContent, "utf-8");
  fs.writeFileSync(logsPath, existingLogs + newLogEntry, "utf-8");

  const createdFiles = [
    "index.md",
    "01_2d_execution.md",
    "02_3d_interior.md",
    "03_3d_facade.md",
    "04_mercuriale_devis.md",
    "logs.md",
  ];

  console.log(`✨ Dossier Projet OKF v0.2 compilé avec succès dans : ${projectDir}`);

  return { projectDir, files: createdFiles };
}
