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
fal.config({ credentials: apiKey });

async function testWorkingFalModels() {
  const sampleUrl = "https://v3b.fal.media/files/b/0aa582fa/vGiTinKbDEWVpFdxdbove_1786191125565.png";
  
  const endpoints = [
    "fal-ai/flux/dev/image-to-image",
    "fal-ai/flux-pro/v1.1-ultra",
    "fal-ai/flux-general",
    "fal-ai/civitai/controlnet"
  ];

  for (const ep of endpoints) {
    console.log(`\n🔍 Test de '${ep}'...`);
    try {
      const result: any = await fal.subscribe(ep, {
        input: {
          image_url: sampleUrl,
          prompt: "Professional 2D architectural floor plan technical drawing, top-down view, clean CAD lines, light oak wood floor, 8k",
          strength: 0.75,
          guidance_scale: 4.0,
          num_inference_steps: 28
        },
        logs: false
      });
      const url = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
      console.log(`✅ SUCCÈS sur '${ep}' ! Image URL: ${url}`);
    } catch (e: any) {
      console.log(`❌ Erreur sur '${ep}' : ${e.status || e.message || e}`);
    }
  }
}

testWorkingFalModels();
