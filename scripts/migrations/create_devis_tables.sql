-- Activer l'extension uuid-ossp et vector si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- TABLE: projets
CREATE TABLE IF NOT EXISTS projets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom_projet TEXT NOT NULL,
  localisation TEXT,
  description TEXT,
  frais_generaux_pct NUMERIC DEFAULT 20.0,
  marge_aleas_pct NUMERIC DEFAULT 3.0,
  date_creation TIMESTAMP DEFAULT NOW()
);

-- TABLE: mercuriale_prix
CREATE TABLE IF NOT EXISTS mercuriale_prix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_article TEXT UNIQUE NOT NULL,
  designation TEXT NOT NULL,
  unite TEXT NOT NULL,
  prix_unitaire_fourniture NUMERIC DEFAULT 0,
  prix_unitaire_main_oeuvre NUMERIC DEFAULT 0,
  derniere_maj TIMESTAMP DEFAULT NOW()
);

-- TABLE: devis
CREATE TABLE IF NOT EXISTS devis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_ht NUMERIC DEFAULT 0,
  total_ttc NUMERIC DEFAULT 0,
  margin_bet_pct NUMERIC DEFAULT 0,
  margin_hazards_pct NUMERIC DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TABLE: devis_phases
CREATE TABLE IF NOT EXISTS devis_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  devis_id UUID REFERENCES devis(id) ON DELETE CASCADE,
  numero INT,
  nom TEXT,
  montant_total NUMERIC DEFAULT 0
);

-- TABLE: devis_sections
CREATE TABLE IF NOT EXISTS devis_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID REFERENCES devis_phases(id) ON DELETE CASCADE,
  code TEXT,
  nom TEXT,
  montant_total NUMERIC DEFAULT 0
);

-- TABLE: devis_items
CREATE TABLE IF NOT EXISTS devis_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES devis_sections(id) ON DELETE CASCADE,
  quantite NUMERIC DEFAULT 0,
  prix_unitaire NUMERIC DEFAULT 0,
  prix_total NUMERIC DEFAULT 0,
  designation TEXT
);

-- TABLE: devis_echeancier
CREATE TABLE IF NOT EXISTS devis_echeancier (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  devis_id UUID REFERENCES devis(id) ON DELETE CASCADE,
  mois TEXT,
  execution_pct NUMERIC DEFAULT 0,
  montant_mensuel NUMERIC DEFAULT 0,
  montant_cumule NUMERIC DEFAULT 0
);

-- TABLE: devis_dqe
CREATE TABLE IF NOT EXISTS devis_dqe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  projet_id UUID REFERENCES projets(id) ON DELETE CASCADE,
  ifc_id TEXT,
  niveau_spatial TEXT,
  code_article TEXT,
  quantite_ifc_brute NUMERIC DEFAULT 0,
  quantite_facturable NUMERIC DEFAULT 0,
  quantite_executee NUMERIC DEFAULT 0,
  prix_total_ht NUMERIC DEFAULT 0,
  statut_prix TEXT DEFAULT 'À CHIFFRER',
  element_constructif TEXT,
  nom_materiau TEXT,
  quantite_majoree NUMERIC DEFAULT 0,
  parent_ifc_id TEXT,
  source TEXT DEFAULT 'parent_element'
);

-- Assurer la présence des colonnes analytiques DQE si la table a été pré-créée par Data Connect
ALTER TABLE devis_dqe ADD COLUMN IF NOT EXISTS code_article TEXT;
ALTER TABLE devis_dqe ADD COLUMN IF NOT EXISTS element_constructif TEXT;
ALTER TABLE devis_dqe ADD COLUMN IF NOT EXISTS nom_materiau TEXT;
ALTER TABLE devis_dqe ADD COLUMN IF NOT EXISTS quantite_majoree NUMERIC DEFAULT 0;
ALTER TABLE devis_dqe ADD COLUMN IF NOT EXISTS parent_ifc_id TEXT;
ALTER TABLE devis_dqe ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'parent_element';

-- TABLE: knowledge_base (RAG)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536)
);

-- TABLE: render_jobs
CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT,
  media_type TEXT,
  prompt TEXT,
  style TEXT,
  status TEXT,
  media_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- VIEW: v_dqe_lod400
CREATE OR REPLACE VIEW v_dqe_lod400 AS
SELECT
    d.projet_id,
    d.niveau_spatial,
    d.element_constructif,
    d.source,
    d.nom_materiau,
    d.code_article,
    mp.designation,
    mp.unite,
    mp.prix_unitaire_fourniture,
    mp.prix_unitaire_main_oeuvre,
    SUM(d.quantite_ifc_brute)  AS quantite_brute_totale,
    SUM(d.quantite_majoree)    AS quantite_majoree_totale,
    SUM(d.quantite_executee)   AS quantite_executee_totale,
    ROUND((SUM(d.quantite_majoree) * COALESCE(mp.prix_unitaire_fourniture, 0))::numeric, 2) AS montant_fourniture_ht,
    ROUND((SUM(d.quantite_majoree) * COALESCE(mp.prix_unitaire_main_oeuvre, 0))::numeric, 2) AS montant_mo_ht,
    ROUND((SUM(d.quantite_executee) * COALESCE(mp.prix_unitaire_fourniture, 0))::numeric, 2) AS montant_execute_fourniture_ht,
    ROUND((SUM(d.quantite_executee) * COALESCE(mp.prix_unitaire_main_oeuvre, 0))::numeric, 2) AS montant_execute_mo_ht
FROM devis_dqe d
LEFT JOIN mercuriale_prix mp ON mp.code_article = d.code_article
GROUP BY
    d.projet_id, d.niveau_spatial, d.element_constructif, d.source,
    d.nom_materiau, d.code_article,
    mp.designation, mp.unite,
    mp.prix_unitaire_fourniture, mp.prix_unitaire_main_oeuvre;
