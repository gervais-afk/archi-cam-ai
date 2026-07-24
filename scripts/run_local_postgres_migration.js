const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Custom simple dotenv parser to avoid dependency issue
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

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:ArchiCamAI_2025_Secure_BIM!@127.0.0.1:5433/fdcdb";

const pool = new Pool({
  connectionString: connectionString
});

async function main() {
  console.log("🔌 Connecting to PostgreSQL local database on port", process.env.DB_PORT || 5433);
  const sqlPath = path.join(__dirname, 'migrations', 'create_devis_tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    const client = await pool.connect();
    console.log("🚀 Running create_devis_tables.sql...");
    await client.query(sql);
    console.log("✅ Tables created or verified successfully!");
    
    // Seed some initial data if empty
    const checkMerc = await client.query("SELECT COUNT(*) FROM mercuriale_prix");
    if (parseInt(checkMerc.rows[0].count, 10) === 0) {
      console.log("🌱 Seeding mercuriale_prix...");
      await client.query(`
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
      `);
      console.log("✅ Seed completed!");
    }

    client.release();
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await pool.end();
  }
}

main();
