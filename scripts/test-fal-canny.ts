// scripts/test-fal-canny.ts
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

async function testEndpoints() {
  const uploadedUrl = "https://v3b.fal.media/files/b/0aa582fa/vGiTinKbDEWVpFdxdbove_1786191125565.png";
  console.log("🔍 Test 1 : fal-ai/flux/dev/image-to-image...");

  /*
  try {
    const result: any = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: uploadedUrl,
        prompt: "Professional 2D architectural floor plan technical drawing, top-down view, clean black CAD lines, light wood floor texture, high resolution",
        strength: 0.65, // Garde 65% de fidélité structurelle
        guidance_scale: 4.5,
        num_inference_steps: 28,
      },
      logs: true,
    });

    console.log("🎉 SUCCÈS Flux Image-to-Image !");
    console.log(`🖼️ URL : ${result.data?.images?.[0]?.url}`);
    return;
  } catch (e: any) {
    console.log("⚠️ Image-to-image note :", e.body?.detail || e.message);
  }
  */

  console.log("\n🔍 Test 2 : fal-ai/flux-controlnet...");
  try {
    const result: any = await fal.subscribe("fal-ai/flux-controlnet", {
      input: {
        control_image_url: uploadedUrl,
        prompt: "Professional 2D architectural floor plan technical drawing, top-down view, clean black CAD lines, light wood floor texture",
        controlnet_name: "canny",
        conditioning_scale: 0.75,
      },
      logs: true,
    });
    console.log("🎉 SUCCÈS fal-ai/flux-controlnet !");
    console.log(`🖼️ URL : ${result.data?.images?.[0]?.url}`);
  } catch (e: any) {
    console.log("⚠️ Flux-controlnet note :", e.body?.detail || e.message);
  }
}

testEndpoints();
