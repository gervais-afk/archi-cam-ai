// =============================================================================
// 🕸️  Neo4j GraphRAG — Ontologie BTP & Urbanisme Cameroun
// =============================================================================
// Inspiré du graphe de connaissances MLOps de cam_data_sov_solutions.
// Ce script initialise le graphe ontologique de règles métier BTP pour
// Archi Cam AI : POS Cameroun, BAEL 91 / Eurocode 2, Mercuriale MINMAP,
// contraintes géotechniques et réglementations urbaines locales.
//
// Exécuter avec : python scripts/seed_neo4j_btp.py
// Ou via Neo4j Browser : http://localhost:7474
// =============================================================================


// --- 1. CONTRAINTES D'UNICITÉ (Idempotence) ---

CREATE CONSTRAINT IF NOT EXISTS FOR (v:Ville) REQUIRE v.nom IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (z:ZoneUrbanistique) REQUIRE z.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (r:ReglePOS) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (m:Materiau) REQUIRE m.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:NormeBAEL) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (s:TypeSol) REQUIRE s.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (p:PrixMercuriale) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (prj:Projet) REQUIRE prj.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (rr:RenderResult) REQUIRE rr.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (qr:QuoteResult) REQUIRE qr.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (okf:OKFDossier) REQUIRE okf.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (pa:PlanAnalysis) REQUIRE pa.id IS UNIQUE;



// =============================================================================
// 2. VILLES (Nœuds Géographiques de Référence)
// =============================================================================

MERGE (yaounde:Ville {nom: "Yaoundé"})
SET yaounde.region = "Centre", yaounde.pays = "Cameroun",
    yaounde.latitude = 3.86667, yaounde.longitude = 11.51667,
    yaounde.zone_climatique = "Tropicale", yaounde.altitude_m = 760;

MERGE (douala:Ville {nom: "Douala"})
SET douala.region = "Littoral", douala.pays = "Cameroun",
    douala.latitude = 4.04827, douala.longitude = 9.70428,
    douala.zone_climatique = "Équatoriale", douala.altitude_m = 13;

MERGE (kribi:Ville {nom: "Kribi"})
SET kribi.region = "Sud", kribi.pays = "Cameroun",
    kribi.latitude = 2.94, kribi.longitude = 9.91,
    kribi.zone_climatique = "Côtière", kribi.altitude_m = 20;

MERGE (garoua:Ville {nom: "Garoua"})
SET garoua.region = "Nord", garoua.pays = "Cameroun",
    garoua.latitude = 9.3, garoua.longitude = 13.4,
    garoua.zone_climatique = "Sahélienne", garoua.altitude_m = 234;

MERGE (bafoussam:Ville {nom: "Bafoussam"})
SET bafoussam.region = "Ouest", bafoussam.pays = "Cameroun",
    bafoussam.latitude = 5.47829, bafoussam.longitude = 10.41786,
    bafoussam.zone_climatique = "Tropicale Montagnard", bafoussam.altitude_m = 1460;

MERGE (bertoua:Ville {nom: "Bertoua"})
SET bertoua.region = "Est", bertoua.pays = "Cameroun",
    bertoua.latitude = 4.58, bertoua.longitude = 13.68,
    bertoua.zone_climatique = "Tropicale Humide", bertoua.altitude_m = 610;


// =============================================================================
// 3. ZONES URBANISTIQUES & RÈGLES POS (Yaoundé)
// =============================================================================

// Zones résidentielles de Yaoundé
MERGE (r1:ZoneUrbanistique {code: "R1"})
SET r1.libelle = "Zone Résidentielle Faible Densité (Villas)",
    r1.description = "Zones huppées : Bastos, Omnisports, Nlongkak";

MERGE (r2:ZoneUrbanistique {code: "R2"})
SET r2.libelle = "Zone Résidentielle Moyenne Densité",
    r2.description = "Zones mixtes résidentielles";

MERGE (r3:ZoneUrbanistique {code: "R3"})
SET r3.libelle = "Zone Résidentielle Haute Densité",
    r3.description = "Quartiers populaires : Mokolo, Briqueterie";

MERGE (c1:ZoneUrbanistique {code: "C1"})
SET c1.libelle = "Zone Commerciale Centrale",
    c1.description = "CBD Yaoundé, Avenue Kennedy";

MERGE (i1:ZoneUrbanistique {code: "I1"})
SET i1.libelle = "Zone Industrielle",
    i1.description = "Zone industrielle de Biyem-Assi";


// Relations Yaoundé → Zones
MATCH (v:Ville {nom: "Yaoundé"}), (z:ZoneUrbanistique {code: "R1"}) MERGE (v)-[:CONTIENT]->(z);
MATCH (v:Ville {nom: "Yaoundé"}), (z:ZoneUrbanistique {code: "R2"}) MERGE (v)-[:CONTIENT]->(z);
MATCH (v:Ville {nom: "Yaoundé"}), (z:ZoneUrbanistique {code: "R3"}) MERGE (v)-[:CONTIENT]->(z);
MATCH (v:Ville {nom: "Yaoundé"}), (z:ZoneUrbanistique {code: "C1"}) MERGE (v)-[:CONTIENT]->(z);


// --- Règles POS Zone R1 (Yaoundé) ---
MERGE (pos_r1_recul:ReglePOS {id: "R1_RECUL_FACADE"})
SET pos_r1_recul.parametre = "Recul Façade", pos_r1_recul.valeur = 5.0,
    pos_r1_recul.unite = "mètres", pos_r1_recul.obligatoire = true,
    pos_r1_recul.source = "POS Yaoundé 2008 Art.12";
MATCH (z:ZoneUrbanistique {code: "R1"}), (r:ReglePOS {id: "R1_RECUL_FACADE"}) MERGE (z)-[:APPLIQUE]->(r);

MERGE (pos_r1_emprise:ReglePOS {id: "R1_EMPRISE_SOL"})
SET pos_r1_emprise.parametre = "Emprise au Sol Maximum", pos_r1_emprise.valeur = 40.0,
    pos_r1_emprise.unite = "%", pos_r1_emprise.obligatoire = true,
    pos_r1_emprise.source = "POS Yaoundé 2008 Art.14";
MATCH (z:ZoneUrbanistique {code: "R1"}), (r:ReglePOS {id: "R1_EMPRISE_SOL"}) MERGE (z)-[:APPLIQUE]->(r);

MERGE (pos_r1_hauteur:ReglePOS {id: "R1_HAUTEUR_MAX"})
SET pos_r1_hauteur.parametre = "Hauteur Maximale Bâtiment", pos_r1_hauteur.valeur = 12.0,
    pos_r1_hauteur.unite = "mètres", pos_r1_hauteur.obligatoire = true,
    pos_r1_hauteur.source = "POS Yaoundé 2008 Art.15";
MATCH (z:ZoneUrbanistique {code: "R1"}), (r:ReglePOS {id: "R1_HAUTEUR_MAX"}) MERGE (z)-[:APPLIQUE]->(r);

// --- Règles POS Zone R2 (Yaoundé) ---
MERGE (pos_r2_recul:ReglePOS {id: "R2_RECUL_FACADE"})
SET pos_r2_recul.parametre = "Recul Façade", pos_r2_recul.valeur = 3.0,
    pos_r2_recul.unite = "mètres", pos_r2_recul.obligatoire = true,
    pos_r2_recul.source = "POS Yaoundé 2008 Art.18";
MATCH (z:ZoneUrbanistique {code: "R2"}), (r:ReglePOS {id: "R2_RECUL_FACADE"}) MERGE (z)-[:APPLIQUE]->(r);

MERGE (pos_r2_emprise:ReglePOS {id: "R2_EMPRISE_SOL"})
SET pos_r2_emprise.parametre = "Emprise au Sol Maximum", pos_r2_emprise.valeur = 60.0,
    pos_r2_emprise.unite = "%", pos_r2_emprise.obligatoire = true,
    pos_r2_emprise.source = "POS Yaoundé 2008 Art.19";
MATCH (z:ZoneUrbanistique {code: "R2"}), (r:ReglePOS {id: "R2_EMPRISE_SOL"}) MERGE (z)-[:APPLIQUE]->(r);

MERGE (pos_r2_hsp:ReglePOS {id: "HAUTEUR_LIBRE_MIN"})
SET pos_r2_hsp.parametre = "Hauteur Libre Sous Plafond Minimale", pos_r2_hsp.valeur = 2.80,
    pos_r2_hsp.unite = "mètres", pos_r2_hsp.obligatoire = true,
    pos_r2_hsp.source = "Décret Habitat Cameroun 2010";
MATCH (z:ZoneUrbanistique {code: "R2"}), (r:ReglePOS {id: "HAUTEUR_LIBRE_MIN"}) MERGE (z)-[:APPLIQUE]->(r);

MERGE (pos_superficie:ReglePOS {id: "SUPERFICIE_PIECE_MIN"})
SET pos_superficie.parametre = "Superficie Minimale Pièce Habitable", pos_superficie.valeur = 9.0,
    pos_superficie.unite = "m²", pos_superficie.obligatoire = true,
    pos_superficie.source = "Code Hygiène Cameroun Art.23";
MATCH (z:ZoneUrbanistique {code: "R2"}), (r:ReglePOS {id: "SUPERFICIE_PIECE_MIN"}) MERGE (z)-[:APPLIQUE]->(r);
MATCH (z:ZoneUrbanistique {code: "R3"}), (r:ReglePOS {id: "SUPERFICIE_PIECE_MIN"}) MERGE (z)-[:APPLIQUE]->(r);


// =============================================================================
// 4. NORMES BAEL 91 / EUROCODE 2 (Éléments structuraux)
// =============================================================================

// --- Fondations ---
MERGE (bael_fond_std:NormeBAEL {id: "BAEL_FONDATION_SOL_NORMAL"})
SET bael_fond_std.element_type = "FONDATION",
    bael_fond_std.regle = "Contrainte admissible sol normal",
    bael_fond_std.valeur_min = 0.15, bael_fond_std.valeur_max = 0.25,
    bael_fond_std.unite = "MPa", bael_fond_std.zone_climatique = "Tropicale",
    bael_fond_std.source = "BAEL 91 Révisé 99 — Art. B.6.1";

MERGE (bael_fond_mar:NormeBAEL {id: "BAEL_FONDATION_SOL_MARECAGEUX"})
SET bael_fond_mar.element_type = "FONDATION",
    bael_fond_mar.regle = "Contrainte admissible sol marécageux",
    bael_fond_mar.valeur_min = 0.05, bael_fond_mar.valeur_max = 0.10,
    bael_fond_mar.unite = "MPa", bael_fond_mar.zone_climatique = "Tropicale",
    bael_fond_mar.source = "BAEL 91 Révisé 99 — Art. B.6.2 + DTU 13.1";

MERGE (bael_ferraillage:NormeBAEL {id: "BAEL_FERRAILLAGE_MIN"})
SET bael_ferraillage.element_type = "GLOBAL",
    bael_ferraillage.regle = "Ratio minimum d'acier pour béton armé",
    bael_ferraillage.valeur_min = 50.0, bael_ferraillage.valeur_max = 120.0,
    bael_ferraillage.unite = "kg/m³", bael_ferraillage.zone_climatique = "Tropicale",
    bael_ferraillage.source = "BAEL 91 Art. A.8.1 — Dosage minimal en armatures";

// --- Poteaux ---
MERGE (bael_poteau:NormeBAEL {id: "BAEL_POTEAU_SECTION_MIN"})
SET bael_poteau.element_type = "IfcColumn",
    bael_poteau.regle = "Section minimale poteau béton armé",
    bael_poteau.valeur_min = 25.0, bael_poteau.valeur_max = null,
    bael_poteau.unite = "cm", bael_poteau.zone_climatique = "Tropicale",
    bael_poteau.source = "BAEL 91 Art. B.8.4";

// --- Enrobage ---
MERGE (bael_enrobage_trop:NormeBAEL {id: "BAEL_ENROBAGE_TROPICAL"})
SET bael_enrobage_trop.element_type = "GLOBAL",
    bael_enrobage_trop.regle = "Enrobage minimal armatures (zone tropicale humide)",
    bael_enrobage_trop.valeur_min = 40.0, bael_enrobage_trop.valeur_max = 50.0,
    bael_enrobage_trop.unite = "mm", bael_enrobage_trop.zone_climatique = "Côtière",
    bael_enrobage_trop.source = "BAEL 91 Art. A.7.2.4 — Exposition XS/XC";

MERGE (bael_enrobage_std:NormeBAEL {id: "BAEL_ENROBAGE_STANDARD"})
SET bael_enrobage_std.element_type = "GLOBAL",
    bael_enrobage_std.regle = "Enrobage minimal armatures (zone standard)",
    bael_enrobage_std.valeur_min = 30.0, bael_enrobage_std.valeur_max = 40.0,
    bael_enrobage_std.unite = "mm", bael_enrobage_std.zone_climatique = "Tropicale",
    bael_enrobage_std.source = "BAEL 91 Art. A.7.2.4 — Exposition XC2";


// =============================================================================
// 5. TYPES DE SOL (Géotechnique Cameroun — LABOGENIE)
// =============================================================================

MERGE (sol_normal:TypeSol {code: "Normal"})
SET sol_normal.libelle = "Sol Ferme Standard", sol_normal.contrainte_MPa = 0.20,
    sol_normal.ancrage_cm = 80, sol_normal.type_fondation = "Semelle Isolée",
    sol_normal.majoration_acier_pct = 0.0, sol_normal.source = "LABOGENIE — Catégorie A";

MERGE (sol_argileux:TypeSol {code: "Argileux"})
SET sol_argileux.libelle = "Sol Argileux Compressible", sol_argileux.contrainte_MPa = 0.12,
    sol_argileux.ancrage_cm = 120, sol_argileux.type_fondation = "Semelle Filante",
    sol_argileux.majoration_acier_pct = 15.0, sol_argileux.source = "LABOGENIE — Catégorie B";

MERGE (sol_marecageux:TypeSol {code: "Marécageux"})
SET sol_marecageux.libelle = "Sol Marécageux ou Remblai Instable", sol_marecageux.contrainte_MPa = 0.07,
    sol_marecageux.ancrage_cm = 200, sol_marecageux.type_fondation = "Radier Général",
    sol_marecageux.majoration_acier_pct = 20.0, sol_marecageux.source = "LABOGENIE — Catégorie C";

MERGE (sol_rocheux:TypeSol {code: "Rocheux"})
SET sol_rocheux.libelle = "Sol Rocheux ou Latéritique Dur", sol_rocheux.contrainte_MPa = 0.40,
    sol_rocheux.ancrage_cm = 60, sol_rocheux.type_fondation = "Semelle Isolée Courte",
    sol_rocheux.majoration_acier_pct = -5.0, sol_rocheux.source = "LABOGENIE — Catégorie D";


// =============================================================================
// 6. MATÉRIAUX & MERCURIALE MINMAP (Prix réels 2025 Cameroun)
// =============================================================================

// --- Liants ---
MERGE (ciment:Materiau {code: "CIM-CPJ42"})
SET ciment.libelle = "Ciment Portland CPJ 42.5 (sac 50kg)",
    ciment.categorie = "Liant", ciment.unite = "Sac 50kg",
    ciment.fournisseurs = ["Cimencam", "Dangote Cement", "Cimaf"],
    ciment.norme = "NF EN 197-1";

MERGE (pm_cim_yaounde:PrixMercuriale {id: "PRIX_CIM_YAOUNDE_2025"})
SET pm_cim_yaounde.date_reference = "2025-01",
    pm_cim_yaounde.prix_FCFA = 5500, pm_cim_yaounde.unite = "Sac 50kg",
    pm_cim_yaounde.source = "MINMAP Cameroun — Mercuriale Jan 2025";
MATCH (m:Materiau {code: "CIM-CPJ42"}), (p:PrixMercuriale {id: "PRIX_CIM_YAOUNDE_2025"}) MERGE (m)-[:A_PRIX {ville: "Yaoundé"}]->(p);

MERGE (pm_cim_grand_nord:PrixMercuriale {id: "PRIX_CIM_GRANDNORD_2025"})
SET pm_cim_grand_nord.date_reference = "2025-01",
    pm_cim_grand_nord.prix_FCFA = 6800, pm_cim_grand_nord.unite = "Sac 50kg",
    pm_cim_grand_nord.source = "MINMAP Cameroun — Mercuriale Jan 2025 (Grand-Nord)";
MATCH (m:Materiau {code: "CIM-CPJ42"}), (p:PrixMercuriale {id: "PRIX_CIM_GRANDNORD_2025"}) MERGE (m)-[:A_PRIX {ville: "Garoua"}]->(p);

// --- Granulats ---
MERGE (sable:Materiau {code: "GRA-SABLE-SANAGA"})
SET sable.libelle = "Sable de Rivière (Sanaga) lavé 0/4",
    sable.categorie = "Granulat", sable.unite = "m³",
    sable.fournisseurs = ["Carriers de la Sanaga"];

MERGE (pm_sable:PrixMercuriale {id: "PRIX_SABLE_YAOUNDE_2025"})
SET pm_sable.date_reference = "2025-01",
    pm_sable.prix_FCFA = 23000, pm_sable.unite = "m³",
    pm_sable.source = "MINMAP Cameroun — Mercuriale Jan 2025";
MATCH (m:Materiau {code: "GRA-SABLE-SANAGA"}), (p:PrixMercuriale {id: "PRIX_SABLE_YAOUNDE_2025"}) MERGE (m)-[:A_PRIX {ville: "Yaoundé"}]->(p);

MERGE (gravier:Materiau {code: "GRA-GRAVIER-CARRIERE"})
SET gravier.libelle = "Gravier de Carrière concassé 10/20",
    gravier.categorie = "Granulat", gravier.unite = "Tonne",
    gravier.fournisseurs = ["Carrières Nguila", "SATOM"];

MERGE (pm_gravier:PrixMercuriale {id: "PRIX_GRAVIER_YAOUNDE_2025"})
SET pm_gravier.date_reference = "2025-01",
    pm_gravier.prix_FCFA = 13000, pm_gravier.unite = "Tonne",
    pm_gravier.source = "MINMAP Cameroun — Mercuriale Jan 2025";
MATCH (m:Materiau {code: "GRA-GRAVIER-CARRIERE"}), (p:PrixMercuriale {id: "PRIX_GRAVIER_YAOUNDE_2025"}) MERGE (m)-[:A_PRIX {ville: "Yaoundé"}]->(p);

// --- Acier ---
MERGE (acier:Materiau {code: "ACR-HA-FE500"})
SET acier.libelle = "Acier HA Fe 500 (toutes nuances)",
    acier.categorie = "Métal", acier.unite = "kg",
    acier.norme = "NF EN 10080 / BAEL 91";

MERGE (pm_acier:PrixMercuriale {id: "PRIX_ACIER_YAOUNDE_2025"})
SET pm_acier.date_reference = "2025-01",
    pm_acier.prix_FCFA = 700, pm_acier.unite = "kg",
    pm_acier.source = "MINMAP Cameroun — Mercuriale Jan 2025";
MATCH (m:Materiau {code: "ACR-HA-FE500"}), (p:PrixMercuriale {id: "PRIX_ACIER_YAOUNDE_2025"}) MERGE (m)-[:A_PRIX {ville: "Yaoundé"}]->(p);

// --- Agglos ---
MERGE (agglo:Materiau {code: "MAC-AGGLO15"})
SET agglo.libelle = "Agglos Creux 15x20x40 cm (parpaing)",
    agglo.categorie = "Maçonnerie", agglo.unite = "Unité",
    agglo.fournisseurs = ["SCIE", "Producteurs locaux Cameroun"];

MERGE (pm_agglo:PrixMercuriale {id: "PRIX_AGGLO15_YAOUNDE_2025"})
SET pm_agglo.date_reference = "2025-01",
    pm_agglo.prix_FCFA = 300, pm_agglo.unite = "Unité",
    pm_agglo.source = "MINMAP Cameroun — Mercuriale Jan 2025";
MATCH (m:Materiau {code: "MAC-AGGLO15"}), (p:PrixMercuriale {id: "PRIX_AGGLO15_YAOUNDE_2025"}) MERGE (m)-[:A_PRIX {ville: "Yaoundé"}]->(p);

// --- Matériaux Biosourcés Locaux (BTC) ---
MERGE (btc:Materiau {code: "BIO-BTC-LATERITE"})
SET btc.libelle = "Brique en Terre Compressée (BTC) — Latérite",
    btc.categorie = "Biosourcé / Local", btc.unite = "Unité",
    btc.avantage = "Réduction carbone 60%, ressource locale abondante, isolation thermique",
    btc.fournisseurs = ["ESDAC Cameroun", "Producteurs locaux"],
    btc.norme = "XP P13-901";

MERGE (pm_btc:PrixMercuriale {id: "PRIX_BTC_YAOUNDE_2025"})
SET pm_btc.date_reference = "2025-01",
    pm_btc.prix_FCFA = 150, pm_btc.unite = "Unité",
    pm_btc.reduction_vs_agglo_pct = 50.0,
    pm_btc.source = "MINMAP Cameroun / ESDAC 2025";
MATCH (m:Materiau {code: "BIO-BTC-LATERITE"}), (p:PrixMercuriale {id: "PRIX_BTC_YAOUNDE_2025"}) MERGE (m)-[:A_PRIX {ville: "Yaoundé"}]->(p);


// =============================================================================
// 7. RÈGLES D'INTERPRÉTATION & DÉMARCHE ADMINISTRATIVE
// =============================================================================

// Permis de Bâtir (ONAC Cameroun)
MERGE (permis:ReglePOS {id: "PERMIS_BATIR_SEUIL"})
SET permis.parametre = "Seuil Permis de Bâtir Obligatoire",
    permis.valeur = 20.0, permis.unite = "m²",
    permis.description = "Toute construction >= 20 m² nécessite un Permis de Bâtir ONAC",
    permis.source = "Loi 2004/003 du Cameroun — Urbanisme et Habitat";

MERGE (assainissement:ReglePOS {id: "ASSAINISSEMENT_MIN"})
SET assainissement.parametre = "Assainissement Minimum (Fosse Septique)",
    assainissement.valeur = 1.0, assainissement.unite = "Unité",
    assainissement.description = "Toute habitation doit disposer d'un dispositif d'assainissement conforme",
    assainissement.source = "Code Hygiène Cameroun 2010 Art.45";

// Coefficient de perte des matériaux (Guide Cameroun)
MERGE (perte_beton:ReglePOS {id: "COEFF_PERTE_BETON"})
SET perte_beton.parametre = "Coefficient de Perte Béton / Agrégats",
    perte_beton.valeur = 1.05, perte_beton.unite = "Multiplicateur",
    perte_beton.description = "5% de perte standard sur le béton et agrégats",
    perte_beton.source = "Guide de l'Ingénierie de l'Estimation — Cameroun";

MERGE (perte_acier:ReglePOS {id: "COEFF_PERTE_ACIER"})
SET perte_acier.parametre = "Coefficient de Perte Acier (Façonnage)",
    perte_acier.valeur = 1.10, perte_acier.unite = "Multiplicateur",
    perte_acier.description = "10% de perte lors du façonnage du ferraillage",
    perte_acier.source = "Guide de l'Ingénierie de l'Estimation — Cameroun";

// Retenues financières réglementaires
MERGE (retenue_garantie:ReglePOS {id: "RETENUE_GARANTIE_10PCT"})
SET retenue_garantie.parametre = "Retenue de Garantie Tâcheron",
    retenue_garantie.valeur = 10.0, retenue_garantie.unite = "%",
    retenue_garantie.description = "10% retenus sur les acomptes jusqu'à réception des travaux",
    retenue_garantie.source = "Réglementation marchés privés Cameroun";

MERGE (air:ReglePOS {id: "AIR_TACHERON"})
SET air.parametre = "Acompte sur Impôt sur le Revenu (AIR)",
    air.valeur = 2.2, air.unite = "%",
    air.valeur_non_enregistre = 5.5,
    air.description = "2.2% si tâcheron enregistré fiscalement, 5.5% sinon",
    air.source = "Code Général des Impôts Cameroun — Art.42";


// =============================================================================
// 8.5 TRAÇABILITÉ PROJET & PIPELINE AGENTIQUE (Partie 3.D)
// =============================================================================

// Moteurs IA répertoriés
MERGE (m_gemini:MoteurIA {nom: "Gemini 2.5 Flash/Pro"}) SET m_gemini.type = "VLM Cloud";
MERGE (m_replicate:MoteurIA {nom: "Replicate ControlNet SDXL"}) SET m_replicate.type = "Diffusion Cloud";
MERGE (m_openai:MoteurIA {nom: "OpenAI DALL-E 3"}) SET m_openai.type = "Image Cloud";
MERGE (m_opencv:MoteurIA {nom: "OpenCV Local 2.5D"}) SET m_opencv.type = "Local Souverain";

// Index pour la traçabilité
CREATE INDEX IF NOT EXISTS FOR (prj:Projet) ON (prj.ville, prj.created_at);
CREATE INDEX IF NOT EXISTS FOR (rr:RenderResult) ON (rr.engine, rr.created_at);


// =============================================================================
// 9. INDEX DE PERFORMANCE & VÉRIFICATION
// =============================================================================

CREATE INDEX IF NOT EXISTS FOR (v:Ville) ON (v.zone_climatique);
CREATE INDEX IF NOT EXISTS FOR (n:NormeBAEL) ON (n.element_type, n.zone_climatique);
CREATE INDEX IF NOT EXISTS FOR (p:PrixMercuriale) ON (p.date_reference);
CREATE INDEX IF NOT EXISTS FOR (s:TypeSol) ON (s.code);


// =============================================================================
// ✅ VÉRIFICATION FINALE
// =============================================================================

MATCH (v:Ville) RETURN "Villes" AS type, count(v) AS count
UNION ALL
MATCH (z:ZoneUrbanistique) RETURN "Zones Urbanistiques" AS type, count(z) AS count
UNION ALL
MATCH (r:ReglePOS) RETURN "Règles POS" AS type, count(r) AS count
UNION ALL
MATCH (n:NormeBAEL) RETURN "Normes BAEL" AS type, count(n) AS count
UNION ALL
MATCH (m:Materiau) RETURN "Matériaux" AS type, count(m) AS count
UNION ALL
MATCH (p:PrixMercuriale) RETURN "Prix Mercuriale" AS type, count(p) AS count
UNION ALL
MATCH (s:TypeSol) RETURN "Types de Sol" AS type, count(s) AS count;

