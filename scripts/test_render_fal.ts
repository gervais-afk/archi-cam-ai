import { generateFalControlNetRender } from "../lib/bridges/fal-controlnet-bridge";
import path from "path";
import fs from "fs";

const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^#\s][^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim().replace(/^['"](.*)['"]$/, "$1");
});

function fileToDataUri(filePath: string, mimeType = "image/png"): string {
  if (!fs.existsSync(filePath)) return "";
  const buf = fs.readFileSync(filePath);
  if (!buf) return "";
  return `data:${mimeType};base64,${buf.toString("base64")}`;
}

async function main() {
  const debugDir = path.resolve(process.cwd(), "public/debug_emaleu_test");
  const cannyPath = path.join(debugDir, "canny_edges.png");
  const colorPlanPath = path.join(debugDir, "semantic_rooms_map.png");

  if (!fs.existsSync(cannyPath) || !fs.existsSync(colorPlanPath)) {
    console.error("Missing canny or color plan images in debug_emaleu_test.");
    process.exit(1);
  }

  const cannyImageUrl = fileToDataUri(cannyPath);
  const colorPlanImageUrl = fileToDataUri(colorPlanPath);

  console.log("Calling Fal.ai...");
  
  const resultUrl = await generateFalControlNetRender({
    cannyImageUrl,
    colorPlanImageUrl,
    positivePrompt: "Clean professional architectural presentation board, Scandinavian minimalist style. Crisp white background (RGB 250,250,248), precise line weights. Indoor spaces: light oak flooring, soft gray walls, minimal modern furniture.",
    imageSize: { width: 1190, height: 1684 } // Same as the Emaleu plan
  });

  if (resultUrl) {
    console.log("Success! Rendered image URL:", resultUrl);
    
    // Download it
    const res = await fetch(resultUrl);
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(path.join(debugDir, "fal_final_render.png"), Buffer.from(buffer));
    console.log("Saved to public/debug_emaleu_test/fal_final_render.png");
  } else {
    console.error("Fal.ai rendering failed.");
  }
}

main().catch(console.error);
