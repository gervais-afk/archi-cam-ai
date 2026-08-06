import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export class ConversionCache {
  /**
   * Récupère le chemin d'un fichier IFC converti à partir du hash du fichier original
   */
  async getCachedIFC(originalFilePath: string): Promise<string | null> {
    try {
      const fileBuffer = fs.readFileSync(originalFilePath);
      const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "ifc_path", "created_at" FROM "ifc_conversion_caches" WHERE "original_file_hash" = $1 LIMIT 1`,
        fileHash
      );

      if (rows && rows.length > 0) {
        const cached = rows[0];
        const ageMs = Date.now() - new Date(cached.created_at).getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        if (ageMs < sevenDaysMs && fs.existsSync(cached.ifc_path)) {
          console.log("✅ [ConversionCache] Hit trouvé en cache :", cached.ifc_path);
          return cached.ifc_path;
        }
      }
    } catch (err: any) {
      console.warn("[ConversionCache] Erreur lors de la lecture du cache :", err.message);
    }
    return null;
  }

  /**
   * Enregistre une conversion réussie en cache
   */
  async cacheConversion(originalFilePath: string, ifcPath: string): Promise<void> {
    try {
      const fileBuffer = fs.readFileSync(originalFilePath);
      const fileHash = createHash("sha256").update(fileBuffer).digest("hex");
      const fileName = path.basename(originalFilePath);

      // Générer UUID
      const id = require("crypto").randomUUID();

      await prisma.$executeRawUnsafe(
        `INSERT INTO "ifc_conversion_caches" ("id", "original_file_hash", "original_file_name", "ifc_path", "created_at")
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT ("original_file_hash") DO UPDATE SET "ifc_path" = $4, "created_at" = NOW()`,
        id,
        fileHash,
        fileName,
        ifcPath
      );
      console.log("💾 [ConversionCache] Enregistré en cache :", ifcPath);
    } catch (err: any) {
      console.warn("[ConversionCache] Échec de l'enregistrement en cache :", err.message);
    }
  }
}
