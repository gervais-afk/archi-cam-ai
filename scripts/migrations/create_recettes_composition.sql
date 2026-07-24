CREATE TABLE recettes_composition (
    id SERIAL PRIMARY KEY,
    projet_id INTEGER NOT NULL REFERENCES projets(id),
    code_article TEXT NOT NULL,
    ratio NUMERIC NOT NULL,
    unite TEXT NOT NULL,
    prix_unitaire_fourniture NUMERIC DEFAULT 0.0,
    prix_unitaire_main_oeuvre NUMERIC DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster look‑ups
CREATE INDEX idx_recettes_composition_projet ON recettes_composition(projet_id);
CREATE INDEX idx_recettes_composition_code ON recettes_composition(code_article);
