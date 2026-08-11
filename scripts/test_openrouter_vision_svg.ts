/**
 * Test script: OpenRouter Vision SVG Generator
 * Uses Claude 3.5 Sonnet or Gemini 2.5 Flash via OpenRouter with the original plan image
 * to generate a pristine, professional CAD SVG without OpenCV noise.
 */
import fs from "fs";
import path from "path";

// Load .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^#\s][^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, "$1");
});

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("❌ OPENROUTER_API_KEY manquante dans .env.local");
    process.exit(1);
  }

  const debugDir = path.resolve(process.cwd(), "public/debug_emaleu_test");
  const originalImgPath = path.join(debugDir, "source_original.png");

  if (!fs.existsSync(originalImgPath)) {
    console.error("❌ source_original.png introuvable dans debug_emaleu_test");
    process.exit(1);
  }

  console.log("📖 Chargement et redimensionnement de l'image originale...");
  const sharp = (await import("sharp")).default;
  const resizedBuf = await sharp(originalImgPath)
    .resize(1024, 1024, { fit: "inside" })
    .jpeg({ quality: 85 })
    .toBuffer();
  const base64Img = `data:image/jpeg;base64,${resizedBuf.toString("base64")}`;

  // Modèle OpenRouter Vision : google/gemini-2.5-flash
  const modelName = "google/gemini-2.5-flash";
  console.log(`🤖 Envoi de l'image du plan à OpenRouter (${modelName})...`);

  const systemInstruction = `Tu es un Architecte CAO principal et Expert Projeteur 2D. 
Ta mission est d'analyser l'image du plan d'architecture fourni et de générer un code SVG 2D vectoriel de niveau professionnel "Grand Cabinet d'Architecture" (qualité publication ArchDaily / Planner 5D).`;

  const userPrompt = `Analyse ce plan d'architecture 2D et génère le code SVG vectoriel équivalent, propre et esthétique.

CONSIGNES STRICTES :
1. VUE : Top-down 2D plat strict (vue de dessus 90° orthographique).
2. GEOMETRIE : Reconstruis les pièces sous forme de rectangles et polygones orthogonaux propres (murs parallèles à 90°). Ignorer les lignes de cotes, les flèches de mesure ou les annotations périphériques — NE PAS les dessiner comme des murs !
3. MURS : Dessine les murs en lignes ou polygones sombres (#1C2434) avec une épaisseur régulière et propre (~15-20cm à l'échelle).
4. SOLS / COULEURS :
   - Séjour / Salon : fill="#FFF8E1" (jaune très doux)
   - Chambres : fill="#FFF3E0" (bois / beige pastel)
   - Dressing / Placards : fill="#FFE0B2"
   - Cuisine & SDB & WC : fill="#E3F2FD" (bleu clair)
   - Circulation / Couloirs : fill="#F5F5F5"
   - Balcon / Terrasse / Véranda : fill="#E8F5E9" (vert très doux)
5. MEUBLES : Ajoute des symboles vectoriels simples et élégants pour le mobilier principal (ex: lit dans la chambre, canapé/table dans le séjour, sanitaire dans SDB/WC).
6. TEXTES : Place au centre de chaque pièce son nom (ex: "Chambre 3", "Séjour Etage", "Chambre Parent", "Balcon") et sa surface exacte en m² ("12,44 m²", "15,96 m²", "18,17 m²", etc. telles que lues sur l'image).
7. CARTOUCHE : Ajoute en bas à droite un cartouche élégant avec le titre "ARCHI CAM AI — PROPOSITION AMÉNAGEMENT ÉTAGE", l'échelle "1:100" et la date.

Réponds UNIQUEMENT avec le code SVG brut valide, commençant directement par <svg> et finissant par </svg>.`;

  const requestBody = {
    model: modelName,
    messages: [
      {
        role: "system",
        content: systemInstruction,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: userPrompt,
          },
          {
            type: "image_url",
            image_url: {
              url: base64Img,
            },
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 16000,
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Archi Cam AI",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`❌ Erreur OpenRouter (${response.status}):`, errText);
    process.exit(1);
  }

  const data = await response.json();
  let svgCode = data.choices?.[0]?.message?.content || "";

  // Nettoyage Markdown SVG
  const svgMatch = svgCode.match(/(<svg[\s\S]*?<\/svg>)/i);
  if (svgMatch) svgCode = svgMatch[1];

  console.log(`✅ SVG généré via OpenRouter (${modelName}) : ${svgCode.length} caractères`);

  const svgOutputPath = path.join(debugDir, "openrouter_vision_plan.svg");
  fs.writeFileSync(svgOutputPath, svgCode, "utf8");
  console.log(`💾 SVG sauvegardé → ${svgOutputPath}`);

  // Conversion PNG via @resvg/resvg-js
  const { Resvg } = await import("@resvg/resvg-js");
  const viewBoxMatch = svgCode.match(/viewBox="0 0 (\d+) (\d+)"/);
  const targetWidth = viewBoxMatch ? parseInt(viewBoxMatch[1]) * 2 : 2380;

  const resvg = new Resvg(svgCode, {
    fitTo: { mode: "width", value: targetWidth },
    background: "#F8F6F0",
  });
  const rendered = resvg.render();
  const pngBuffer = rendered.asPng();

  const pngOutputPath = path.join(debugDir, "openrouter_vision_plan.png");
  fs.writeFileSync(pngOutputPath, pngBuffer);
  console.log(`🎉 PNG généré : ${pngOutputPath} (${(pngBuffer.length / 1024).toFixed(0)} Ko)`);
}

main().catch(console.error);
