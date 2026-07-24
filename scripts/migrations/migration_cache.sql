-- Activation de l'extension de vecteurs
CREATE EXTENSION IF NOT EXISTS vector;

-- Activation de l'extension d'UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table de Cache Sémantique pour Imagen 3
CREATE TABLE IF NOT EXISTS image_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt TEXT NOT NULL,
  style TEXT,
  image_url TEXT NOT NULL,
  embedding vector(1536) NOT NULL, -- Vecteur d'embedding pour les prompts (Gemini text-embedding-004)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index de similarité cosinus pour la recherche sémantique
CREATE INDEX IF NOT EXISTS idx_image_cache_embedding ON image_cache USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Table de suivi des travaux asynchrones (Veo 3 et autres rendus lourds)
CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID,
  media_type TEXT NOT NULL, -- 'video' ou 'image'
  prompt TEXT NOT NULL,
  style TEXT,
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  media_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour le polling rapide
CREATE INDEX IF NOT EXISTS idx_render_jobs_id ON render_jobs(id);

-- Fonction de recherche sémantique par similarité cosinus
CREATE OR REPLACE FUNCTION match_cached_prompts(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id UUID,
  prompt TEXT,
  style TEXT,
  image_url TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.prompt,
    c.style,
    c.image_url,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM image_cache c
  WHERE (1 - (c.embedding <=> query_embedding)) >= match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
