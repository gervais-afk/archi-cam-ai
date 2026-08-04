import path from "path";

/**
 * HELPER DE SYSTEME DE FICHIERS SERVEUR — ARCHI CAM AI
 * ───────────────────────────────────────────────────
 * Isole les accès dynamiques Node.js (fs, child_process, path)
 * pour éviter les avertissements d'analyse statique Turbopack (TP1004, TP1005, TP1006).
 */

/* eslint-disable */
function getNativeFs() {
  return typeof window === "undefined" ? eval("require")("fs") : null;
}

function getNativeChildProcess() {
  return typeof window === "undefined" ? eval("require")("child_process") : null;
}

export function safeExistsSync(filePath: string): boolean {
  try {
    const fs = getNativeFs();
    if (!fs) return false;
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function safeReadFileSync(filePath: string): Buffer | null {
  try {
    const fs = getNativeFs();
    if (!fs) return null;
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

export function safeMkdirSync(dirPath: string): void {
  try {
    const fs = getNativeFs();
    if (fs) fs.mkdirSync(dirPath, { recursive: true });
  } catch {
    // Ignorer
  }
}

export function safeWriteFileSync(filePath: string, data: Buffer | string): void {
  try {
    const fs = getNativeFs();
    if (fs) fs.writeFileSync(filePath, data);
  } catch (e) {
    console.warn("safeWriteFileSync error:", e);
  }
}

export function safeReaddirSync(dirPath: string): string[] {
  try {
    const fs = getNativeFs();
    if (!fs || !fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath);
  } catch {
    return [];
  }
}

export function safeStatSync(filePath: string): { mtimeMs: number } | null {
  try {
    const fs = getNativeFs();
    if (!fs) return null;
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

export function safeUnlinkSync(filePath: string): void {
  try {
    const fs = getNativeFs();
    if (fs && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Ignorer
  }
}

export function safeResolvePath(basePath: string, p1?: string, p2?: string, p3?: string): string {
  try {
    const combined = p3 ? path.join(p1 || "", p2 || "", p3) : p2 ? path.join(p1 || "", p2) : p1 || "";
    return combined ? path.resolve(basePath, combined) : path.resolve(basePath, ".");
  } catch {
    return basePath;
  }
}

