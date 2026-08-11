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

async function runTest() {
  const cannyUrl = "https://v3b.fal.media/files/b/0aa5a022/mwcbzuPO1oXQhF4-iR6S1_color_plan_1786265943374.png";
  
  console.log("🚀 Testing fal-ai/flux-general with strength=0.95...");
  try {
    const result: any = await fal.subscribe("fal-ai/flux-general", {
      input: {
        image_url: cannyUrl,
        control_image_url: cannyUrl,
        controlnet_name: "canny",
        prompt: "Professional 2D architectural floor plan technical drawing, top-down view, bird's eye view, light oak wood floor, colorful decorated rooms, furniture visible from above, clean white walls, 8k",
        negative_prompt: "3d, perspective, isometric, distorted, dark background, draft",
        strength: 0.95, // High strength to allow model to draw colored rooms and textures!
        conditioning_scale: 0.95,
        guidance_scale: 7.5,
        num_inference_steps: 30,
        image_size: { width: 768, height: 1088 }
      } as any,
      logs: true,
    });
    
    const url = result?.data?.images?.[0]?.url || result?.images?.[0]?.url;
    console.log(`✅ Success! Output URL: ${url}`);
  } catch (e: any) {
    console.error("❌ Error:", e.status || e.message || e);
  }
}

runTest();
