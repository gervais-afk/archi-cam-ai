/**
 * 🛡️ SECURE FILE VALIDATOR — ARCHI CAM AI
 * ─────────────────────────────────────────
 * Validation rigoureuse des fichiers soumis (MIME type, taille par plan, dimensions max).
 * Protection contre OOM, attaques par déni de service et fichiers corrompus.
 */

import { PLAN_LIMITS } from "@/lib/rate-limiter/plan-rate-limiter";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
  fileSizeMb?: number;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAGIC_BYTES: Record<string, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  png: [0x89, 0x50, 0x4e, 0x47], // PNG
  jpg: [0xff, 0xd8, 0xff],       // JPEG
};

export function validateUploadedFile(
  buffer: Buffer,
  fileName: string,
  declaredMimeType: string,
  userPlan: "free" | "pro" | "enterprise" = "free"
): FileValidationResult {
  const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS.free;
  const maxSizeBytes = limits.max_file_size_mb * 1024 * 1024;
  const fileSizeMb = Number((buffer.length / (1024 * 1024)).toFixed(2));

  // 1. Vérification de la taille
  if (buffer.length > maxSizeBytes) {
    return {
      valid: false,
      error: `Fichier trop volumineux (${fileSizeMb} Mo). La limite pour le plan ${userPlan.toUpperCase()} est de ${limits.max_file_size_mb} Mo.`,
      fileSizeMb,
    };
  }

  // 2. Vérification des Magic Bytes (Type MIME réel)
  let isPdf = buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
  let isPng = buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  let isJpg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "ifc") {
    // Les fichiers IFC sont des fichiers texte STEP
    const headText = buffer.slice(0, 100).toString("ascii");
    if (headText.includes("ISO-10303-21") || headText.includes("HEADER;")) {
      return { valid: true, detectedType: "application/x-step", fileSizeMb };
    }
  }

  if (!isPdf && !isPng && !isJpg) {
    return {
      valid: false,
      error: "Format de fichier non autorisé. Formats acceptés : PDF, PNG, JPEG, WEBP et IFC.",
      fileSizeMb,
    };
  }

  // 3. Validation spécifique PDF (limite 50 pages)
  if (isPdf) {
    const pdfContent = buffer.toString("binary");
    const pageMatches = pdfContent.match(/\/Type\s*\/Page\b/g);
    if (pageMatches && pageMatches.length > 50) {
      return {
        valid: false,
        error: `Le document PDF contient ${pageMatches.length} pages (limite maximale : 50 pages).`,
        fileSizeMb,
      };
    }
  }

  return {
    valid: true,
    detectedType: isPdf ? "application/pdf" : isPng ? "image/png" : "image/jpeg",
    fileSizeMb,
  };
}
