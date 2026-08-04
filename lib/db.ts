import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connectionString,
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "archi_cam_db",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
});

export async function query(text: string, params?: any[]) {
  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("[Cloud SQL Query]", { text, duration, rows: res.rowCount });
    return res;
  } catch (err: any) {
    console.warn("[PostgreSQL Query Bypass]", err.message);
    return { rows: [], rowCount: 0 };
  }
}
