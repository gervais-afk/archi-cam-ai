import fs from "fs";
import path from "path";

/**
 * CACHE CLEANUP MAINTENANCE SCRIPT — ARCHI CAM AI
 * ───────────────────────────────────────────────
 * Purge les fichiers temporaires (.png, .jpg, .pdf) dans public/uploads/ et public/renders/
 * qui datent de plus de 7 jours (ou 24 heures pour les uploads temporaires).
 */

const CWD = process.cwd();
const UPLOADS_DIR = path.join(CWD, "public", "uploads");
const RENDERS_DIR = path.join(CWD, "public", "renders");

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function purgeExpiredCacheFiles(): { deletedCount: number; freedSpaceBytes: number } {
  let deletedCount = 0;
  let freedSpaceBytes = 0;
  const now = Date.now();

  const cleanupDir = (dirPath: string, maxAgeMs: number) => {
    if (!fs.existsSync(dirPath)) return;
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          const ageMs = now - stats.mtimeMs;
          if (ageMs > maxAgeMs) {
            freedSpaceBytes += stats.size;
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`[Cache Cleanup] 🗑️ Fichier expiré supprimé (${Math.round(ageMs / (1000 * 3600 * 24))} jours) : ${file}`);
          }
        }
      } catch (err) {
        console.warn(`[Cache Cleanup] Notice lors de la suppression de ${file}:`, err);
      }
    }
  };

  // Uploads : purge après 24 heures
  cleanupDir(UPLOADS_DIR, ONE_DAY_MS);

  // Renders : purge après 7 jours
  cleanupDir(RENDERS_DIR, SEVEN_DAYS_MS);

  console.log(`[Cache Cleanup] ✨ Purge terminée : ${deletedCount} fichiers supprimés (${(freedSpaceBytes / (1024 * 1024)).toFixed(2)} Mo libérés).`);
  return { deletedCount, freedSpaceBytes };
}

// Exécution directe si invoqué via CLI
if (process.argv[1] && process.argv[1].endsWith("clean_cache.ts")) {
  purgeExpiredCacheFiles();
}
