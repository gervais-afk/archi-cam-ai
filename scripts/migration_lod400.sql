-- =============================================================================
-- Migration LOD 400 – Ajout des colonnes IfcBuildingElementPart
-- À exécuter dans le SQL Editor de Supabase (une seule fois)
-- =============================================================================

-- 1. Nouvelles colonnes dans devis_dqe
-- -----------------------------------------------------------------------------
ALTER TABLE devis_dqe
    ADD COLUMN IF NOT EXISTS element_constructif VARCHAR(255),          -- Nom du parent (ex: Poteau, Mur)
    ADD COLUMN IF NOT EXISTS nom_materiau    VARCHAR(255),          -- Nom du matériau IFC (IfcBuildingElementPart)
    ADD COLUMN IF NOT EXISTS quantite_majoree DECIMAL(12,4),        -- Quantité après +20% MO +3% Imprévus
    ADD COLUMN IF NOT EXISTS parent_ifc_id  VARCHAR(100),           -- GlobalId de l'élément parent
    ADD COLUMN IF NOT EXISTS source         VARCHAR(50)             -- 'parent_element' | 'lod400_part'
        DEFAULT 'parent_element';

-- 2. Table mercuriale (mapping nom_materiau → code_article)
-- -----------------------------------------------------------------------------
-- La table 'mercuriale_prix' existante reste inchangée.
-- On crée une vue de mapping simplifiée pour le script Python.
CREATE TABLE IF NOT EXISTS mercuriale (
    id              SERIAL PRIMARY KEY,
    nom_materiau    VARCHAR(255) NOT NULL UNIQUE,  -- ex: "Béton Armé", "Enduit ciment"
    code_article    VARCHAR(50)  REFERENCES mercuriale_prix(code_article),
    unite           VARCHAR(10)  NOT NULL DEFAULT 'm3',  -- m3, m2, t, u, ml
    facteur_conversion DECIMAL(10,4) DEFAULT 1.0000,     -- ex: densité pour volume→tonnes
    notes           TEXT
);

-- 3. Données initiales de la mercuriale (à adapter selon votre bordereau)
-- -----------------------------------------------------------------------------
-- Insérer d'abord dans mercuriale_prix pour respecter la clé étrangère
INSERT INTO mercuriale_prix (code_article, designation, unite, prix_unitaire_fourniture, prix_unitaire_main_oeuvre) VALUES
    ('GO-BETON-C25', 'Béton C25/30', 'm3', 85000, 15000),
    ('GO-BETON-C20', 'Béton C20/25', 'm3', 75000, 15000),
    ('GO-AGLO-15', 'Agglos de 15 pleins', 'u', 450, 200),
    ('GO-AGLO-20', 'Agglos de 20 creux', 'u', 550, 250),
    ('END-CIMENT', 'Enduit ciment au mortier', 'm2', 2500, 1500),
    ('FO-SABLE', 'Sable sanaga', 'm3', 15000, 2000),
    ('FO-GRAVIER', 'Gravier concassé', 'm3', 22000, 3000),
    ('GO-TERRE', 'Terre de remblai', 'm3', 5000, 2000),
    ('GO-ACIER-HA', 'Acier Haute Adhérence', 't', 650000, 150000),
    ('GO-COFFRAGE', 'Bois de coffrage complet', 'm2', 4500, 2500)
ON CONFLICT (code_article) DO NOTHING;

INSERT INTO mercuriale (nom_materiau, code_article, unite) VALUES
    ('Béton Armé',        'GO-BETON-C25',    'm3'),
    ('Béton',             'GO-BETON-C20',    'm3'),
    ('Agglos 15',         'GO-AGLO-15',      'u'),
    ('Agglos 20',         'GO-AGLO-20',      'u'),
    ('Enduit ciment',     'END-CIMENT',      'm2'),
    ('Sable',             'FO-SABLE',        'm3'),
    ('Gravier',           'FO-GRAVIER',      'm3'),
    ('Terre',             'GO-TERRE',        'm3'),
    ('Acier HA',          'GO-ACIER-HA',     't'),
    ('Bois de coffrage',  'GO-COFFRAGE',     'm2')
ON CONFLICT (nom_materiau) DO NOTHING;

-- 4. Index pour accélérer les jointures
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_devis_dqe_nom_materiau  ON devis_dqe (nom_materiau);
CREATE INDEX IF NOT EXISTS idx_devis_dqe_source        ON devis_dqe (source);
CREATE INDEX IF NOT EXISTS idx_devis_dqe_parent_ifc_id ON devis_dqe (parent_ifc_id);

-- 5. Vue récapitulative DQE LOD 400
-- -----------------------------------------------------------------------------
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
    ROUND(SUM(d.quantite_majoree) * mp.prix_unitaire_fourniture, 2) AS montant_fourniture_ht,
    ROUND(SUM(d.quantite_majoree) * mp.prix_unitaire_main_oeuvre, 2) AS montant_mo_ht,
    ROUND(SUM(d.quantite_executee) * mp.prix_unitaire_fourniture, 2) AS montant_execute_fourniture_ht,
    ROUND(SUM(d.quantite_executee) * mp.prix_unitaire_main_oeuvre, 2) AS montant_execute_mo_ht
FROM devis_dqe d
LEFT JOIN mercuriale_prix mp ON mp.code_article = d.code_article
GROUP BY
    d.projet_id, d.niveau_spatial, d.element_constructif, d.source,
    d.nom_materiau, d.code_article,
    mp.designation, mp.unite,
    mp.prix_unitaire_fourniture, mp.prix_unitaire_main_oeuvre;
