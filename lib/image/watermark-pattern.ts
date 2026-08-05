/**
 * WATERMARK DISTRIBUÉ ET PATTERN ANTI-VOL — ARCHI CAM AI
 * ════════════════════════════════════════════════════════════════════════════
 * Applique un motif semi-transparent répété à 45° sur toute la surface
 * pour les utilisateurs de la version GRATUITE / DÉMO (dissuasion anti-vol).
 * Pour les utilisateurs PRO / ENTERPRISE, applique un filigrane discret.
 * ════════════════════════════════════════════════════════════════════════════
 */

import sharp from "sharp";
import { PlanType } from "@/lib/image/watermark-variants";
import { getCachedWatermarkBuffer } from "@/lib/cache/watermark-cache";

export async function applyDistributedWatermark(
  imageBuffer: Buffer,
  licenseType: "FREE" | "PRO" | "ENTERPRISE",
  planType: PlanType = "2D",
  fingerprint: string = "DEMO-2026"
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  if (licenseType === "ENTERPRISE") {
    // Mode Enterprise : Aucun watermark visible
    return imageBuffer;
  }

  const cornerBuffer = await getCachedWatermarkBuffer(planType, licenseType, fingerprint, width, height);

  if (licenseType === "PRO") {
    // Mode Pro : Badge discret en coin uniquement
    return await sharp(imageBuffer)
      .composite([{ input: cornerBuffer, blend: "over" }])
      .toBuffer();
  }

  // Mode FREE : Pattern répété anti-vol semi-transparent + Badge
  const patternSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="wmPattern" x="0" y="0" width="320" height="220" patternUnits="userSpaceOnUse">
          <text x="20" y="110" transform="rotate(-35, 160, 110)" font-family="sans-serif" font-size="22" font-weight="900" fill="rgba(197, 160, 89, 0.16)">
            ARCHI CAM AI - VERSION DÉMO
          </text>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#wmPattern)" />
    </svg>
  `;

  return await sharp(imageBuffer)
    .composite([
      { input: Buffer.from(patternSvg), blend: "over" },
      { input: cornerBuffer, blend: "over" },
    ])
    .toBuffer();
}
