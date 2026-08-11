/**
 * Test E2E du pipeline Gemini Vector SVG
 * Usage: npx tsx scripts/test_gemini_vector.ts
 */
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

// Charger les variables d'environnement manuellement
const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^#\s][^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, "$1");
});

import { generateGeminiVectorPlan } from "../lib/ai/gemini-vector-plan-generator";

async function main() {
  const debugDir = path.resolve(process.cwd(), "public/debug_emaleu_test");
  const extractionPath = path.join(debugDir, "extraction.json");

  if (!fs.existsSync(extractionPath)) {
    console.error("❌ extraction.json introuvable dans public/debug_emaleu_test");
    process.exit(1);
  }

  console.log("📖 Lecture de extraction.json...");
  const extractionData = JSON.parse(fs.readFileSync(extractionPath, "utf8"));
  console.log(`   → image_size: ${extractionData.image_size}, murs: ${extractionData.wall_count}`);

  console.log("\n🤖 Appel Gemini 2.5 Flash pour génération SVG...");
  const result = await generateGeminiVectorPlan(extractionData);

  if (!result.success) {
    console.error("❌ Échec Gemini:", result.error);
    process.exit(1);
  }

  console.log(`✅ SVG généré : ${result.svgCode.length} chars, ${result.roomCount} pièces, ${result.wallCount} murs`);

  // Sauvegarde du SVG
  const svgPath = path.join(debugDir, "gemini_vector_plan.svg");
  fs.writeFileSync(svgPath, result.svgCode, "utf8");
  console.log(`💾 SVG sauvegardé → ${svgPath}`);

  // Conversion SVG → PNG via @resvg/resvg-js (WebAssembly, zéro dépendance système)
  const { Resvg } = await import("@resvg/resvg-js");
  const [imgW] = extractionData.image_size || [1190, 1684];
  console.log("\n🖼️  Conversion SVG → PNG (resvg-js, scale=2)...");
  const resvg = new Resvg(result.svgCode, {
    fitTo: { mode: "width", value: imgW * 2 },
    background: "#F0EDE8",
  });
  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();
  const pngPath = path.join(debugDir, "gemini_vector_plan.png");
  fs.writeFileSync(pngPath, pngBuffer);

  if (fs.existsSync(pngPath)) {
    const size = fs.statSync(pngPath).size;
    console.log(`\n🎉 SUCCÈS ! PNG final : ${pngPath} (${(size/1024).toFixed(0)} Ko)`);
    console.log("   → Ouvrez http://localhost:3001/debug_emaleu_test/gemini_vector_plan.png pour voir le résultat !");
  } else {
    console.error("❌ La conversion PNG a échoué.");
    process.exit(1);
  }
}

main().catch(console.error);
