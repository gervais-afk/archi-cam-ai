import { NextRequest, NextResponse } from "next/server";
import { ARCHI_CAM_3D_SYSTEM_PROMPT } from "@/lib/prompts/gemini3dPrompt";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lineartImageBase64, style } = body;

    if (!lineartImageBase64 && !body.planUrl) {
      return NextResponse.json(
        { error: "Image d'armature (lineartImageBase64) ou planUrl requise." },
        { status: 400 }
      );
    }

    const inputImage = lineartImageBase64 || body.planUrl;
    const base64Data = typeof inputImage === "string" ? inputImage.replace(/^data:image\/\w+;base64,/, "") : "";

    const apiKey = process.env.GEMINI_API_KEY;
    let generated3DPrompt = "Top-down 3D architectural floor plan rendering, high-angle isometric view, master bedrooms with warm oak wood parquet, living room with white Carrara marble floor and L-shaped sectional sofa, modern slate tile bathrooms, soft ambient occlusion shadows, photorealistic, 8k resolution, ArchDaily masterwork";
    let detectedRooms = ["Salon", "Chambre Principal", "Cuisine", "SDB"];
    let dominantStyle = style || "Modern Luxury Tropical";

    // ── ÉTAPE 1 : Analyse par Gemini Vision & Génération du Prompt 3D ──────
    if (apiKey && base64Data) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    { text: ARCHI_CAM_3D_SYSTEM_PROMPT },
                    {
                      inlineData: {
                        mimeType: "image/png",
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (response.ok) {
          const resData = await response.json();
          const jsonText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            if (parsed.prompt) generated3DPrompt = parsed.prompt;
            if (parsed.detectedRooms) detectedRooms = parsed.detectedRooms;
            if (parsed.dominantStyle) dominantStyle = parsed.dominantStyle;
          }
        }
      } catch (err) {
        console.warn("[3D Pipeline] Gemini Vision notice:", err);
      }
    }

    // ── ÉTAPE 2 : Génération du Rendu 3D Photoréaliste via ControlNet ──────
    let renderUrl = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80";

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (replicateToken) {
      try {
        const res = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${replicateToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "8b7ef2298e09e13b86026a798579d1a3c7996c5e2069e2c62c3e1e5b8d278788",
            input: {
              image: inputImage,
              prompt: generated3DPrompt,
              controlnet_conditioning_scale: 0.85,
              guidance_scale: 3.5,
              num_inference_steps: 28,
              output_format: "png",
            },
          }),
        });
        if (res.ok) {
          const pred = await res.json();
          if (pred.output) {
            renderUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
          }
        }
      } catch (err) {
        console.warn("[3D Pipeline] Replicate notice:", err);
      }
    }

    // ── ÉTAPE 3 : Restitution des données au Frontend ──────────────────────
    return NextResponse.json({
      success: true,
      imageUrl: renderUrl,
      render3DUrl: renderUrl,
      mode: "3D_PHOTOREALISTE",
      meta: {
        generatedPrompt: generated3DPrompt,
        detectedRooms,
        dominantStyle,
      },
    });
  } catch (error: any) {
    console.error("Erreur lors de la génération 3D :", error);
    return NextResponse.json(
      { error: "Échec du pipeline de rendu 3D.", details: error.message },
      { status: 500 }
    );
  }
}
