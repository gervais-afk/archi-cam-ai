/**
 * svg-to-png.ts — ARCHI CAM AI
 * ──────────────────────────────
 * Convertit un SVG en PNG HD via @resvg/resvg-js (WebAssembly, zéro dépendance système).
 * Compatible Windows sans installer Cairo/Inkscape.
 *
 * Usage: npx tsx scripts/svg-to-png.ts <input.svg> <output.png> [scale=2]
 */

import fs from "fs";
import path from "path";

async function svgToPng(svgPath: string, pngPath: string, scale: number = 2): Promise<void> {
  // Charger @resvg/resvg-js dynamiquement
  const { Resvg } = await import("@resvg/resvg-js");

  const svgContent = fs.readFileSync(svgPath, "utf8");

  // Extraire width/height du viewBox
  const viewBoxMatch = svgContent.match(/viewBox="0 0 (\d+) (\d+)"/);
  const widthMatch = svgContent.match(/width="(\d+)"/);
  const heightMatch = svgContent.match(/height="(\d+)"/);

  let targetWidth = 2380;
  if (viewBoxMatch) {
    targetWidth = parseInt(viewBoxMatch[1]) * scale;
  } else if (widthMatch) {
    targetWidth = parseInt(widthMatch[1]) * scale;
  }

  console.log(`[svg-to-png] 🔄 Rendu SVG → PNG (width=${targetWidth}px, scale=${scale})...`);

  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: "width",
      value: targetWidth,
    },
    background: "#F0EDE8",
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  fs.writeFileSync(pngPath, pngBuffer);
  console.log(`[svg-to-png] ✅ PNG sauvegardé : ${pngPath} (${(pngBuffer.length / 1024).toFixed(0)} Ko)`);
}

// Entry point CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: npx tsx scripts/svg-to-png.ts <input.svg> <output.png> [scale]");
  process.exit(1);
}

const [inputSvg, outputPng, scaleArg] = args;
const scale = scaleArg ? parseFloat(scaleArg) : 2;

svgToPng(
  path.resolve(inputSvg),
  path.resolve(outputPng),
  scale
).catch((err) => {
  console.error("[svg-to-png] ❌ Erreur :", err.message);
  process.exit(1);
});
