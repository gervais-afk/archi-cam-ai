import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { extractPlanMetadata } from "@/lib/bridges/openrouter-bridge";

export interface CachedGeometry {
  rooms: Array<{
    name: string;
    surface_m2: number;
    type: string;
  }>;
  totalSurface: number;
  roomCount: number;
}

export class GeometryCache {
  /**
   * Extrait la géométrie et la met en cache par SHA-256 de l'image.
   * Utilise des requêtes SQL brutes pour contourner les verrouillages d'écriture du client Prisma sur Windows.
   */
  static async extractAndCache(
    imageBuffer: Buffer,
    maskDataUri: string,
    projectId?: string
  ): Promise<CachedGeometry> {
    // 1. Calculer le hash SHA-256 de l'image
    const imageHash = createHash("sha256").update(imageBuffer).digest("hex");

    // 2. Tenter de lire dans le cache SQL
    try {
      const cachedRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT geometry FROM "geometry_caches" WHERE "image_hash" = $1 LIMIT 1`,
        imageHash
      );

      if (cachedRows && cachedRows.length > 0) {
        console.log("✅ [GeometryCache] Hit ! Géométrie lue du cache SQL.");
        return JSON.parse(cachedRows[0].geometry) as CachedGeometry;
      }
    } catch (dbErr: any) {
      console.warn("[GeometryCache] Erreur lecture cache SQL :", dbErr.message);
    }

    // 3. Extraire avec le VLM d'OpenRouter si absent du cache
    console.log("[GeometryCache] 🔍 Cache Miss. Extraction géométrie par VLM...");
    const metadata = await extractPlanMetadata(maskDataUri);

    const result: CachedGeometry = {
      rooms: metadata.rooms.map((r) => ({
        name: r.name,
        surface_m2: r.surface_m2 || 0,
        type: r.type || "room"
      })),
      totalSurface: metadata.totalSurface || 0,
      roomCount: metadata.roomCount || 0
    };

    // 4. Écrire le résultat dans le cache SQL
    try {
      const id = randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "geometry_caches" ("id", "image_hash", "project_id", "geometry", "extracted_at") 
         VALUES ($1, $2, $3, $4, NOW())`,
        id,
        imageHash,
        projectId || null,
        JSON.stringify(result)
      );
      console.log("💾 [GeometryCache] Nouvelle géométrie stockée avec succès.");
    } catch (saveErr: any) {
      console.warn("[GeometryCache] Impossible de sauvegarder en BDD :", saveErr.message);
    }

    return result;
  }
}
