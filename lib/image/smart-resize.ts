/**
 * SMART RESIZE — Archi Cam AI
 * ════════════════════════════════════════════════════════════════════════════
 * Redimensionnement intelligent avec préservation des détails fins via Lanczos3.
 * RISQUE 3 — Correctif : préserve les cotations architecturales sur plans A3
 * haute résolution (4000×3000px) via kernel Lanczos3 + accentuation légère.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface SmartResizeOptions {
  /** Dimension maximale (width ou height). Par défaut: 1024 */
  maxDimension?: number;
  /** Préserver les détails textuels (Lanczos3 + sharpen). Par défaut: true */
  preserveText?: boolean;
  /** Qualité JPEG 0–100. Par défaut: 85 */
  quality?: number;
}

export interface SmartResizeResult {
  buffer: Buffer;
  wasResized: boolean;
  originalSize: { width: number; height: number };
  finalSize: { width: number; height: number };
  reductionRatio: number;
}

/**
 * Redimensionne un Buffer d'image avec Lanczos3 pour préserver les détails fins.
 */
export async function smartResizeBuffer(
  imageBuffer: Buffer,
  options: SmartResizeOptions = {}
): Promise<SmartResizeResult> {
  const { maxDimension = 1024, preserveText = true, quality = 85 } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sharpFactory: ((input: Buffer) => any) | null = null;
  try {
    const sharpModule = await import("sharp");
    sharpFactory = sharpModule.default as unknown as (input: Buffer) => any;
  } catch {
    return {
      buffer: imageBuffer,
      wasResized: false,
      originalSize: { width: 0, height: 0 },
      finalSize: { width: 0, height: 0 },
      reductionRatio: 1,
    };
  }

  const meta = await sharpFactory(imageBuffer).metadata();
  const srcWidth = meta.width ?? 0;
  const srcHeight = meta.height ?? 0;
  const maxDim = Math.max(srcWidth, srcHeight);

  // Si l'image est déjà petite, ne pas resizer
  if (maxDim <= maxDimension) {
    return {
      buffer: imageBuffer,
      wasResized: false,
      originalSize: { width: srcWidth, height: srcHeight },
      finalSize: { width: srcWidth, height: srcHeight },
      reductionRatio: 1,
    };
  }

  // Fallback 1536px automatique pour les images > 3000px (réduction > 85%)
  let targetDim = maxDimension;
  if (maxDim > 3000 && maxDimension <= 1024) {
    targetDim = 1536;
    console.log(`[SmartResize] Image très grande (${maxDim}px) → cible augmentée à ${targetDim}px`);
  }

  // Resize Lanczos3 + accentuation légère pour compenser le flou de réduction
  let pipeline = sharpFactory(imageBuffer).resize(targetDim, targetDim, {
    fit: "inside",
    withoutEnlargement: true,
    kernel: "lanczos3",
  });

  if (preserveText) {
    pipeline = pipeline.sharpen({ sigma: 0.5 });
  }

  const resizedBuffer: Buffer = await pipeline.jpeg({ quality, progressive: true }).toBuffer();

  const finalMeta = await sharpFactory(resizedBuffer).metadata();
  const finalWidth = finalMeta.width ?? targetDim;
  const finalHeight = finalMeta.height ?? targetDim;
  const reductionRatio = (finalWidth * finalHeight) / Math.max(srcWidth * srcHeight, 1);

  if (reductionRatio < 0.15) {
    console.warn(
      `[SmartResize] ⚠️ Forte réduction : ${srcWidth}×${srcHeight} → ${finalWidth}×${finalHeight} (${(reductionRatio * 100).toFixed(1)}%)`
    );
  } else {
    console.log(
      `[SmartResize] ✅ ${srcWidth}×${srcHeight} → ${finalWidth}×${finalHeight} (${(reductionRatio * 100).toFixed(1)}%)`
    );
  }

  return {
    buffer: resizedBuffer,
    wasResized: true,
    originalSize: { width: srcWidth, height: srcHeight },
    finalSize: { width: finalWidth, height: finalHeight },
    reductionRatio,
  };
}

/**
 * Variante Base64 : wrapper pour les pipelines Base64 (openrouter-bridge, etc.)
 */
export async function smartResizeBase64(
  base64Input: string,
  options: SmartResizeOptions = {}
): Promise<string> {
  try {
    const match = base64Input.match(/^data:([a-zA-Z0-9/+]+);base64,(.+)$/);
    const rawB64 = match?.[2] || base64Input;
    const buffer = Buffer.from(rawB64, "base64");
    const result = await smartResizeBuffer(buffer, options);
    return `data:image/jpeg;base64,${result.buffer.toString("base64")}`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[SmartResize] smartResizeBase64 non-fatal:", msg);
    return base64Input.startsWith("data:") ? base64Input : `data:image/png;base64,${base64Input}`;
  }
}
