import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

function getApiKey(): string {
  try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed.startsWith("FAL_KEY=") || trimmed.startsWith("FAL_AI_KEY=")) {
          return trimmed.split("=")[1].trim();
        }
      }
    }
  } catch (e) {}
  return process.env.FAL_KEY || process.env.FAL_AI_KEY || "";
}

const apiKey = getApiKey();
console.log(`[Fal Test] Clé API trouvée (longueur=${apiKey.length})`);
fal.config({ credentials: apiKey });

async function testFalEndpoints() {
  const sampleUrl = "https://v3b.fal.media/files/b/0aa582fa/vGiTinKbDEWVpFdxdbove_1786191125565.png";
  
  const candidateEndpoints = [
    "fal-ai/flux-general/controlnet",
    "fal-ai/flux-controlnet",
    "fal-ai/flux/dev/controlnet",
    "fal-ai/flux/dev/image-to-image"
  ];

  for (const endpoint of candidateEndpoints) {
    console.log(`\n🔍 Test de l'endpoint : '${endpoint}'...`);
    try {
      const result: any = await fal.subscribe(endpoint, {
        input: {
          image_url: sampleUrl,
          control_image_url: sampleUrl,
          prompt: "Professional 2D architectural floorplan",
          strength: 0.65,
          controlnet_name: "canny",
          conditioning_scale: 0.85
        },
        logs: false
      });
      console.log(`✅ SUCCÈS sur '${endpoint}' ! Image URL:`, result?.data?.images?.[0]?.url || result?.images?.[0]?.url);
      break;
    } catch (e: any) {
      console.log(`❌ Nom/Status : ${e.status || e.message || e}`);
    }
  }
}

testFalEndpoints();
