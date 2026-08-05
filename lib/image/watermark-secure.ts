/**
 * WATERMARK SÉCURISÉ & INJECTION EXIF CRYPTOGRAPHIQUE — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Injecte des métadonnées EXIF invisibles et incoupables (Copyright, Artist,
 * Software, Fingerprint SHA-256, Verification URL) directement dans le buffer d'image.
 * ════════════════════════════════════════════════════════════════════════════
 */

import sharp from "sharp";
import { createHash } from "crypto";
import { PlanType } from "@/lib/image/watermark-variants";
import { applyDistributedWatermark } from "@/lib/image/watermark-pattern";

export interface SecureWatermarkOptions {
  userId: string;
  projectId: string;
  licenseType: "FREE" | "PRO" | "ENTERPRISE";
  planType?: PlanType;
  generatedAt?: Date;
}

export function generateFingerprint(imageBuffer: Buffer, userId: string, projectId: string): string {
  return createHash("sha256")
    .update(imageBuffer)
    .update(userId)
    .update(projectId)
    .digest("hex")
    .substring(0, 16)
    .toUpperCase();
}

export async function applySecureWatermark(
  imageBuffer: Buffer,
  options: SecureWatermarkOptions
): Promise<Buffer> {
  const { userId, projectId, licenseType, planType = "2D", generatedAt = new Date() } = options;
  const fingerprint = generateFingerprint(imageBuffer, userId, projectId);

  // Appliquer le filigrane visuel selon le type de licence
  const watermarkedBuffer = await applyDistributedWatermark(imageBuffer, licenseType, planType, fingerprint);

  // Données EXIF invisibles
  const exifMetadata = {
    IFD0: {
      Copyright: `© ${new Date().getFullYear()} Archi Cam AI — Tous droits réservés`,
      Artist: `User ${userId}`,
      Software: "Archi Cam AI v2.0 - Sovereign & Cloud Engine",
      ImageDescription: `Project: ${projectId} | Fingerprint: ${fingerprint} | License: ${licenseType}`,
      XPComment: JSON.stringify({
        generatedBy: "ArchiCamAI",
        userId,
        projectId,
        timestamp: generatedAt.toISOString(),
        license: licenseType,
        fingerprint,
        verified: true,
        verificationUrl: `https://archicam.cm/verify/${projectId}?hash=${fingerprint}`,
      }),
    },
  };

  try {
    return await sharp(watermarkedBuffer)
      .withMetadata({
        exif: exifMetadata as any,
      })
      .sharpen()
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();
  } catch (err) {
    console.warn("[Secure Watermark] Notice EXIF metadata injection fallback:", err);
    return watermarkedBuffer;
  }
}
