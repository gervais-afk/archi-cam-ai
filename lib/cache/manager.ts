import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export class GeometryCacheManager {
  /**
   * UPSERT CORRIGÉ (Correction Bug V8 Code 23505)
   * Crée une entrée si elle n'existe pas, la met à jour si elle existe.
   * Encapsule le JSON de métadonnées, la version et l'expiration dans le champ string unique "geometry".
   */
  static async upsertMetadata(params: {
    imageHash: string;
    metadata: any;
    version: string;
    ttlDays?: number;
    projectId?: string;
  }): Promise<void> {
    const { imageHash, metadata, version, ttlDays = 7, projectId } = params;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const payload = {
      version,
      expiresAt: expiresAt.toISOString(),
      data: metadata,
    };

    const geometryString = JSON.stringify(payload);

    try {
      await prisma.geometryCache.upsert({
        where: {
          imageHash: imageHash,
        },
        update: {
          geometry: geometryString,
          projectId: projectId || null,
          extractedAt: new Date(),
        },
        create: {
          id: randomUUID(),
          imageHash: imageHash,
          geometry: geometryString,
          projectId: projectId || null,
          extractedAt: new Date(),
        },
      });

      console.log(`[CACHE] Upserted cache entry for hash ${imageHash.substring(0, 12)}...`);
    } catch (error: any) {
      console.error("[CACHE ERROR]", error.message);
      throw error;
    }
  }

  /**
   * Lit les métadonnées de cache si elles existent et ne sont pas expirées.
   */
  static async getMetadata(imageHash: string): Promise<any | null> {
    try {
      const entry = await prisma.geometryCache.findUnique({
        where: { imageHash: imageHash },
      });

      if (!entry) return null;

      const payload = JSON.parse(entry.geometry);
      
      // Si c'est un format de cache V8 ou brut n'ayant pas d'expiration en dur
      if (!payload || typeof payload !== "object" || !payload.expiresAt) {
        return payload;
      }

      // Vérification d'expiration
      const expiresAt = new Date(payload.expiresAt);
      if (expiresAt.getTime() < Date.now()) {
        console.log(`[CACHE] Entry for hash ${imageHash.substring(0, 12)} has expired.`);
        return null;
      }

      return payload.data;
    } catch (err: any) {
      console.warn("[CACHE ERROR] Impossible de lire le cache géométrique :", err.message);
      return null;
    }
  }

  /**
   * Supprime une entrée de cache.
   */
  static async invalidate(imageHash: string): Promise<void> {
    try {
      await prisma.geometryCache.deleteMany({
        where: { imageHash: imageHash },
      });
      console.log(`[CACHE] Invalidated entry for hash ${imageHash.substring(0, 12)}`);
    } catch (err: any) {
      console.error("[CACHE ERROR] Impossible d'invalider le cache :", err.message);
    }
  }

  /**
   * Nettoie toutes les entrées expirées du cache géométrique.
   */
  static async clearExpired(): Promise<number> {
    try {
      const entries = await prisma.geometryCache.findMany();
      let deleteCount = 0;

      for (const entry of entries) {
        try {
          const payload = JSON.parse(entry.geometry);
          if (payload && payload.expiresAt) {
            const expiresAt = new Date(payload.expiresAt);
            if (expiresAt.getTime() < Date.now()) {
              await prisma.geometryCache.delete({
                where: { id: entry.id },
              });
              deleteCount++;
            }
          }
        } catch {
          // Si le JSON est corrompu, on le supprime également
          await prisma.geometryCache.delete({
            where: { id: entry.id },
          });
          deleteCount++;
        }
      }
      return deleteCount;
    } catch (err: any) {
      console.error("[CACHE ERROR] Erreur lors du nettoyage du cache :", err.message);
      return 0;
    }
  }
}
