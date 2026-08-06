import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export interface RenderVersionData {
  imageUrl: string;
  renderMode: string;
  stylePreset: string;
  geometryHash: string;
}

export class RenderVersionManager {
  /**
   * Enregistre une nouvelle version de rendu et met à jour le travail de rendu actuel.
   */
  static async saveVersion(projectId: string, renderData: RenderVersionData) {
    const nextNumber = await this.getNextVersionNumber(projectId);
    const id = randomUUID();

    // 1. Insérer la version dans PostgreSQL
    await prisma.$executeRawUnsafe(
      `INSERT INTO "render_versions" ("id", "project_id", "version_number", "image_url", "render_mode", "style_preset", "geometry_hash", "created_at")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      id,
      projectId,
      nextNumber,
      renderData.imageUrl,
      renderData.renderMode,
      renderData.stylePreset,
      renderData.geometryHash
    );

    // 2. Mettre à jour le dernier RenderJob pour ce projet
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "render_jobs" SET "media_url" = $1, "updated_at" = NOW() 
         WHERE "project_id" = $2`,
        renderData.imageUrl,
        projectId
      );
    } catch (dbErr: any) {
      console.warn("[RenderVersionManager] Impossible de mettre à jour le RenderJob :", dbErr.message);
    }

    return {
      id,
      projectId,
      versionNumber: nextNumber,
      imageUrl: renderData.imageUrl,
      renderMode: renderData.renderMode,
      stylePreset: renderData.stylePreset,
      geometryHash: renderData.geometryHash,
      createdAt: new Date()
    };
  }

  /**
   * Récupère l'historique complet pour un projet.
   */
  static async getVersionHistory(projectId: string) {
    try {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, "project_id" as "projectId", "version_number" as "versionNumber", "image_url" as "imageUrl", 
                "render_mode" as "renderMode", "style_preset" as "stylePreset", "geometry_hash" as "geometryHash", 
                "created_at" as "createdAt"
         FROM "render_versions" 
         WHERE "project_id" = $1 
         ORDER BY "version_number" DESC`,
        projectId
      );
      return rows;
    } catch (err: any) {
      console.error("[RenderVersionManager] Erreur historique versions :", err.message);
      return [];
    }
  }

  /**
   * Effectue un rollback vers une version spécifique.
   */
  static async rollbackToVersion(projectId: string, versionId: string) {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "project_id", "version_number", "image_url", "render_mode", "style_preset", "geometry_hash", "created_at"
       FROM "render_versions" WHERE id = $1 LIMIT 1`,
      versionId
    );

    if (!rows || rows.length === 0) {
      throw new Error("Version introuvable");
    }

    const version = rows[0];

    // Mettre à jour le RenderJob actuel
    await prisma.$executeRawUnsafe(
      `UPDATE "render_jobs" SET "media_url" = $1, "updated_at" = NOW() 
       WHERE "project_id" = $2`,
      version.image_url,
      projectId
    );

    console.log(`✅ [RenderVersionManager] Projet ${projectId} restauré à la version ${version.version_number}`);

    return {
      id: version.id,
      projectId: version.project_id,
      versionNumber: version.version_number,
      imageUrl: version.image_url,
      renderMode: version.render_mode,
      stylePreset: version.style_preset,
      geometryHash: version.geometry_hash,
      createdAt: version.created_at
    };
  }

  private static async getNextVersionNumber(projectId: string): Promise<number> {
    try {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT MAX("version_number") as max_val FROM "render_versions" WHERE "project_id" = $1`,
        projectId
      );
      if (rows && rows.length > 0 && rows[0].max_val !== null) {
        return Number(rows[0].max_val) + 1;
      }
    } catch {}
    return 1;
  }
}
