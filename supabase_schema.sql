-- TABLE: mercuriale_prix
-- Cette table stocke les prix unitaires standards du BTP au Cameroun.

CREATE TABLE IF NOT EXISTS mercuriale_prix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- ex: 'GO-CIM'
  categorie TEXT NOT NULL,   -- ex: 'Gros Œuvre'
  designation TEXT NOT NULL, -- ex: 'Ciment CPJ 42.5'
  unite TEXT NOT NULL,       -- ex: 'Sac 50kg'
  prix_unitaire NUMERIC NOT NULL, -- ex: 4900
  derniere_maj TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB             -- Pour stocker la région (Yaoundé, Douala, etc.)
);

-- INDEX pour recherche rapide par code ou catégorie
CREATE INDEX IF NOT EXISTS idx_mercuriale_code ON mercuriale_prix(code);
CREATE INDEX IF NOT EXISTS idx_mercuriale_categorie ON mercuriale_prix(categorie);

-- INSERTION de données exemples (Prix moyens Yaoundé 2024)
INSERT INTO mercuriale_prix (code, categorie, designation, unite, prix_unitaire, metadata) VALUES
('GO-CIM', 'Gros Œuvre', 'Ciment CPJ 42.5', 'Sac 50kg', 4950, '{"region": "Centre"}'),
('GO-SAB', 'Gros Œuvre', 'Sable Sanaga', 'm³', 18000, '{"region": "Centre"}'),
('GO-GRA', 'Gros Œuvre', 'Gravier concassé 15/25', 'm³', 22000, '{"region": "Centre"}'),
('GO-PAR15', 'Gros Œuvre', 'Parpaing 15x20x40 (Vibrant)', 'U', 350, '{"region": "Centre"}'),
('SO-CAR60', 'Second Œuvre', 'Carrelage Grès 60x60 (Import)', 'm²', 11500, '{"region": "National"}'),
('EL-CAB25', 'Électricité', 'Câble TH 2.5mm²', 'ML', 450, '{"region": "National"}');

-- TABLE: mapping_bim_prix
-- Relie les éléments IFC aux codes de prix de la mercuriale
CREATE TABLE IF NOT EXISTS mapping_bim_prix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ifc_class TEXT NOT NULL,       -- ex: 'IfcWall'
  mot_cle_materiau TEXT,         -- ex: 'Parpaing'
  code_prix TEXT REFERENCES mercuriale_prix(code),
  ratio NUMERIC NOT NULL,        -- Multiplicateur (ex: 66 parpaings par m3 de mur)
  unite_ifc TEXT NOT NULL,       -- 'm3', 'm2', 'u'
  description TEXT
);

-- Données de mapping exemples (Ratios Cameroun)
INSERT INTO mapping_bim_prix (ifc_class, mot_cle_materiau, code_prix, ratio, unite_ifc, description) VALUES
('IfcWall', 'Parpaing', 'GO-PAR15', 66.0, 'm3', 'Murs en parpaings de 15'),
('IfcSlab', 'Béton', 'GO-CIM', 7.0, 'm3', 'Ciment pour dalle (dosage 350kg/m3 -> 7 sacs)'),
('IfcSlab', 'Béton', 'GO-SAB', 0.4, 'm3', 'Sable pour dalle (0.4m3 par m3 de béton)'),
('IfcSlab', 'Béton', 'GO-GRA', 0.8, 'm3', 'Gravier pour dalle (0.8m3 par m3 de béton)'),
('IfcColumn', 'Béton', 'GO-CIM', 8.0, 'm3', 'Ciment pour poteaux (dosage 400kg/m3 -> 8 sacs)');
