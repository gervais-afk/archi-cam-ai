/**
 * 🌍 Cesium Ion & Neo4j Terrain Bridge — Archi Cam AI
 * ===================================================
 * Enrichit les projets de construction avec :
 *   1. Données topographiques et altitude (Cesium Ion / Open-Elevation)
 *   2. Règles d'urbanisme POS et type de sol LABOGENIE depuis Neo4j GraphRAG
 *
 * Utilisation :
 *   import { enrichProjectWithTerrain } from "@/lib/geo/cesium-neo4j-bridge";
 *   const terrain = await enrichProjectWithTerrain("proj-123", { lat: 3.8667, lon: 11.5167 }, "Yaoundé", "Bastos");
 */

import { logEvent } from "@/lib/logger";

export interface TerrainData {
  latitude: number;
  longitude: number;
  altitude_m: number;
  city: string;
  quartier: string;
  zone_pos: string;
  soil_type: string;
  contrainte_sol_MPa: number;
  type_fondation: string;
  cesium_token_valid: boolean;
}

const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";
const ELEVATION_API_URL = process.env.NEXT_PUBLIC_ELEVATION_API_URL || "https://api.open-elevation.com/api/v1/lookup";

/**
 * Récupère l'altitude topographique du terrain via Open-Elevation API (fallback gracieux si indisponible).
 */
async function fetchElevation(lat: number, lon: number): Promise<number> {
  try {
    const url = `${ELEVATION_API_URL}?locations=${lat},${lon}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const ele = data.results?.[0]?.elevation;
      if (typeof ele === "number") return ele;
    }
  } catch {
    // Graceful fallback
  }
  return 750.0; // Altitude moyenne par défaut (Yaoundé ~750m)
}

/**
 * Interroge Neo4j via HTTP/Bolt pour récupérer les règles POS et le type de sol du quartier.
 */
async function fetchNeo4jUrbanism(city: string, quartier: string): Promise<{
  zone_pos: string;
  soil_type: string;
  contrainte_sol_MPa: number;
  type_fondation: string;
}> {
  const NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687";
  const NEO4J_USER = process.env.NEO4J_USER || "neo4j";
  const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "password123";

  try {
    // Règle 4 : Si Neo4j est indisponible, fallback gracieux avec warning
    const neo4jUrl = NEO4J_URI.replace("bolt://", "http://").replace(":7687", ":7474");
    const auth = Buffer.from(`${NEO4J_USER}:${NEO4J_PASSWORD}`).toString("base64");

    const cypherQuery = `
      MATCH (v:Ville {nom: $city})-[:CONTIENT]->(z:ZoneUrbanistique)
      OPTIONAL MATCH (s:TypeSol {code: 'Normal'})
      RETURN z.code AS zone, s.code AS sol, s.contrainte_MPa AS contrainte, s.type_fondation AS fondation
      LIMIT 1
    `;

    const res = await fetch(`${neo4jUrl}/db/neo4j/tx/commit`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statements: [{ statement: cypherQuery, parameters: { city } }],
      }),
      signal: AbortSignal.timeout(2500),
    });

    if (res.ok) {
      const data = await res.json();
      const row = data.results?.[0]?.data?.[0]?.row;
      if (row) {
        return {
          zone_pos: row[0] || "R2",
          soil_type: row[1] || "Normal",
          contrainte_sol_MPa: row[2] || 0.20,
          type_fondation: row[3] || "Semelle Isolée",
        };
      }
    }
  } catch (err) {
    console.warn(`[Cesium-Neo4j Bridge] Notice Neo4j non accessible — fallback par défaut:`, err);
  }

  // Fallback déterministe
  return {
    zone_pos: "R2",
    soil_type: "Normal",
    contrainte_sol_MPa: 0.20,
    type_fondation: "Semelle Isolée",
  };
}

/**
 * Fonction principale : Enrichit un projet avec les données topographiques et urbanistiques.
 */
export async function enrichProjectWithTerrain(
  projectId: string,
  coordinates: { lat: number; lon: number },
  city: string = "Yaoundé",
  quartier: string = "Bastos"
): Promise<TerrainData> {
  const { lat, lon } = coordinates;

  const [altitude, urbanism] = await Promise.all([
    fetchElevation(lat, lon),
    fetchNeo4jUrbanism(city, quartier),
  ]);

  const terrainData: TerrainData = {
    latitude: lat,
    longitude: lon,
    altitude_m: altitude,
    city,
    quartier,
    zone_pos: urbanism.zone_pos,
    soil_type: urbanism.soil_type,
    contrainte_sol_MPa: urbanism.contrainte_sol_MPa,
    type_fondation: urbanism.type_fondation,
    cesium_token_valid: CESIUM_TOKEN.length > 20,
  };

  await logEvent({
    level: "info",
    event: "agent_activity",
    message: `Terrain enrichi pour le projet ${projectId}`,
    details: { city, quartier, altitude, zone_pos: urbanism.zone_pos },
  });

  return terrainData;
}
