import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connectionString,
  // Options de connexion individuelles si la connectionString n'est pas définie
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "ArchiCamAI_2025_Secure_BIM!",
  database: process.env.DB_NAME || "fdcdb",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log("[Cloud SQL Query]", { text, duration, rows: res.rowCount });
  return res;
}
