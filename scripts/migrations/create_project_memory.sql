-- Activation des extensions nécessaires
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS project_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_name TEXT NOT NULL,
    summary TEXT NOT NULL,
    zone_climatique TEXT,
    type_de_sol TEXT,
    accessibilite TEXT,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour accélérer la recherche par similarité (Cosinus)
CREATE INDEX IF NOT EXISTS idx_project_memory_embedding ON project_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Fonction de recherche sémantique de projets similaires
CREATE OR REPLACE FUNCTION search_similar_projects(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id UUID,
    project_name TEXT,
    summary TEXT,
    zone_climatique TEXT,
    type_de_sol TEXT,
    accessibilite TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pm.id,
        pm.project_name,
        pm.summary,
        pm.zone_climatique,
        pm.type_de_sol,
        pm.accessibilite,
        (1 - (pm.embedding <=> query_embedding))::float AS similarity
    FROM project_memory pm
    WHERE (1 - (pm.embedding <=> query_embedding)) >= match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;
