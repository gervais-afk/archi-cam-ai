const fs = require('fs');
const { Pool } = require('pg');

// Charger les variables d'environnement manuellement depuis .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) acc[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    return acc;
}, {});

const GEMINI_API_KEY = envVars.GEMINI_API_KEY;
const DATABASE_URL = envVars.DATABASE_URL || 'postgresql://postgres:ArchiCamAI_2025_Secure_BIM!@127.0.0.1:5432/fdcdb';


if (!GEMINI_API_KEY) {
    console.error("❌ Veuillez configurer GEMINI_API_KEY dans .env.local");
    process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function getGeminiEmbedding(text) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text }] },
            outputDimensionality: 1536
        })
    });
    
    if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.embedding.values;
}

async function main() {
    const ifcFile = "duplex_r+1.ifc";
    console.log(`📖 Analyse de base de : ${ifcFile}...`);
    
    // Synthèse descriptive du projet
    const projectName = "Duplex R+1 NDA FAMILY";
    const summary = `Projet de construction de type Duplex R+1, conçu pour un environnement tropical. Il comprend des fondations renforcées, une structure en béton armé (poteaux, poutres, dalles), et des murs en agglos de ciment. Le bâtiment présente plusieurs ouvertures vitrées pour une bonne ventilation et luminosité naturelle. Surface estimée de plus de 200m².`;
    
    const zoneClimatique = "Tropicale Humide";
    const typeDeSol = "Marécageux";
    const accessibilite = "Difficile";
    
    const textToEmbed = `Projet: ${projectName}\nZone: ${zoneClimatique}\nSol: ${typeDeSol}\nAccessibilité: ${accessibilite}\nDescription: ${summary}`;
    
    console.log(`   -> Vectorisation de la synthèse projet (${textToEmbed.length} caractères)...`);
    
    try {
        const embedding = await getGeminiEmbedding(textToEmbed);
        
        if (!embedding || embedding.length !== 1536) {
            console.error("   ⚠️ Embedding invalide, annulation.");
            return;
        }
        
        console.log("   -> Insertion dans PostgreSQL (Firebase Data Connect)...");
        
        // Formater le vecteur pour l'insertion PostgreSQL (format '[v1, v2, ...]')
        const vectorString = `[${embedding.join(',')}]`;
        
        const query = `
            INSERT INTO project_memory (project_name, summary, zone_climatique, type_de_sol, accessibilite, embedding)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id;
        `;
        const values = [projectName, summary, zoneClimatique, typeDeSol, accessibilite, vectorString];
        
        const res = await pool.query(query, values);
        console.log(`✅ Ingestion de ${ifcFile} terminée avec succès ! ID = ${res.rows[0].id}`);
        
    } catch (e) {
        console.error(`❌ Erreur :`, e);
    } finally {
        await pool.end();
    }
}

main();
