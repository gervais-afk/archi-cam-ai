// Script de migration : exécute create_project_memory.sql sur PostgreSQL local.
// Connexion : port 5433, user postgres / postgres (détecté automatiquement)
// Usage : node scripts/run_project_memory_migration.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Charger les variables depuis .env.local manuellement (sans dotenv)
const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const clean = line.trim();
    if (clean && !clean.startsWith('#')) {
      const idx = clean.indexOf('=');
      if (idx > 0) {
        const key = clean.slice(0, idx).trim();
        const val = clean.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  });
}

// Connexion détectée automatiquement : port 5433, password postgres
const pool = new Pool({
  host: '127.0.0.1',
  port: 5433,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

async function main() {
  const sqlPath = path.resolve(__dirname, 'migrations', 'create_project_memory.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('🔌 Connexion à PostgreSQL sur 127.0.0.1:5433...');
  const client = await pool.connect();

  try {
    // Vérifier si fdcdb existe, sinon créer
    const dbCheck = await client.query(
      "SELECT datname FROM pg_database WHERE datname = 'fdcdb'"
    );
    if (dbCheck.rows.length === 0) {
      console.log('📦 Base fdcdb absente. Création en cours...');
      await client.query('CREATE DATABASE fdcdb');
      console.log('✅ Base fdcdb créée.');
    } else {
      console.log('✅ Base fdcdb déjà présente.');
    }
  } finally {
    client.release();
    await pool.end();
  }

  // Se connecter à fdcdb pour la migration
  const fdcdbPool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    user: 'postgres',
    password: 'postgres',
    database: 'fdcdb',
  });
  const fdcdbClient = await fdcdbPool.connect();

  try {
    console.log('⚡ Exécution de la migration create_project_memory.sql sur fdcdb...');
    await fdcdbClient.query(sql);
    console.log('✅ Migration réussie ! Table project_memory, index ivfflat et fonction search_similar_projects créés.');

    // Vérification
    const check = await fdcdbClient.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'project_memory'"
    );
    if (check.rows.length > 0) {
      console.log('✅ Vérification OK : la table project_memory existe en base fdcdb.');
    } else {
      console.warn('⚠️  La table project_memory est introuvable après migration.');
    }
  } finally {
    fdcdbClient.release();
    await fdcdbPool.end();
  }
}

main().catch((err) => {
  console.error('❌ Erreur lors de la migration :', err.message);
  process.exit(1);
});
