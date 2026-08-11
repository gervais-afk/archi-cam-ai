// scripts/test-fal-connection.ts
// Test de l'upscaler Fal.ai officiel (Clarity Upscaler / ESRGAN)

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

async function testUpscaler() {
  const testImageUrl = "https://v3b.fal.media/files/b/0aa581aa/ob-frEgsC7ogf3K7veQP1.jpg";
  console.log("🔍 Test Upscaling Haute Résolution sur Fal.ai...");

  try {
    const result: any = await fal.subscribe("fal-ai/clarity-upscaler" as any, {
      input: {
        image_url: testImageUrl,
        scale: 2,
        prompt: "masterpiece, 8k, architectural floor plan, crisp lines",
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          console.log("   ⏳ Clarity Upscaler en cours...");
        }
      },
    });

    console.log("\n✅ SUCCÈS Clarity Upscaler !");
    console.log(`🖼️ URL HD : ${result.data?.image?.url}`);
  } catch (err: any) {
    console.warn("⚠️ Clarity Upscaler info :", err.body?.detail || err.message);
  }
}

testUpscaler();
