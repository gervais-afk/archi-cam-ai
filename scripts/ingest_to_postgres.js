const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Parse .env.local manually
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
  console.log("📝 Loaded .env.local variables manually.");
} catch (e) {
  console.warn("⚠️ Warning: Could not read .env.local manually:", e.message);
}

const geminiApiKey = process.env.GEMINI_API_KEY || "";
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:ArchiCamAI_2025_Secure_BIM!@127.0.0.1:5433/fdcdb";

if (!geminiApiKey) {
  console.error("❌ GEMINI_API_KEY is not defined in .env.local.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString
});

async function getGeminiEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiApiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: {
        parts: [{ text: text }]
      },
      outputDimensionality: 1536
    })
  });
  
  if (!response.ok) {
    throw new Error(`Embedding API returned status ${response.status}`);
  }
  const json = await response.json();
  return json.embedding.values;
}

function chunkText(text, maxWords = 150, overlap = 30) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < len(words)) {
    const chunk = words.slice(i, i + maxWords);
    chunks.push(chunk.join(' '));
    i += maxWords - overlap;
  }
  return chunks;
}

// Helper to avoid len function of Python
function len(arr) {
  return arr.length;
}

async function main() {
  const kbDir = path.join(__dirname, '..', 'knowledge_base');
  const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md'));
  
  if (files.length === 0) {
    console.log("ℹ️ No markdown files found in knowledge_base");
    process.exit(0);
  }
  
  console.log(`🔌 Connecting to local PostgreSQL at ${connectionString.split('@')[1] || connectionString}`);
  const client = await pool.connect();
  
  try {
    // Clear old knowledge base to avoid duplicates
    console.log("🗑️ Clearing old knowledge base data...");
    await client.query("DELETE FROM knowledge_base");
    
    for (const filename of files) {
      console.log(`📖 Processing file: ${filename}`);
      const filePath = path.join(kbDir, filename);
      const text = fs.readFileSync(filePath, 'utf8');
      
      const chunks = chunkText(text, 250, 40);
      console.log(`   -> Split into ${chunks.length} chunks.`);
      
      for (let idx = 0; idx < chunks.length; idx++) {
        const chunk = chunks[idx];
        if (!chunk.trim()) continue;
        
        console.log(`   -> Embedding chunk ${idx + 1}/${chunks.length}...`);
        const embedding = await getGeminiEmbedding(chunk);
        
        const embeddingStr = `[${embedding.join(',')}]`;
        const metadata = {
          source: filename,
          document_name: filename,
          chunk_index: idx,
          length: chunk.length
        };
        
        await client.query(
          "INSERT INTO knowledge_base (content, metadata, embedding) VALUES ($1, $2, $3::vector)",
          [chunk, JSON.stringify(metadata), embeddingStr]
        );
      }
      console.log(`✅ Completed: ${filename}`);
    }
    
    console.log("🎉 All files ingested to PostgreSQL knowledge_base table successfully!");
  } catch (error) {
    console.error("❌ Ingestion failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
