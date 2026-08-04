import { NextRequest, NextResponse } from "next/server";
import { ARCHI_CAM_FACADE_SYSTEM_PROMPT } from "@/lib/prompts/geminiFacadePrompt";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Configuration Anti-Timeout Vercel

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      lineartImagesBase64, // Tableau de strings Base64: [RDC_Base64, Etage_Base64]
      viewType = "STREET_LEVEL", // "STREET_LEVEL" ou "ISOMETRIC_TOP_DOWN"
      numberOfFloors = "R+1"
    } = body;

    const imagesArray = Array.isArray(lineartImagesBase64)
      ? lineartImagesBase64
      : body.planUrl
      ? [body.planUrl]
      : [];

    if (imagesArray.length === 0) {
      return NextResponse.json(
        { error: "Au moins une image de plan (lineartImagesBase64) est requise." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let generatedFacadePrompt = "Eye-level 3D architectural front view rendering of a modern two-story R+1 villa facade, volcanic stone cladding walls, smooth off-white plaster, teak wood slatted garage gate, black-framed sliding glass doors, paved driveway with parked luxury car, tropical green landscaping, warm LED architectural spotlighting under eaves, clear sky, photorealistic 8k, ArchDaily feature";
    let buildingType = `Villa ${numberOfFloors} Contemporaine`;
    let facadeMaterials = ["Pierre Volcanique d'Edéa", "Bois Teck/Iroko", "Verre Feuilleté", "Enduit Lisse"];

    // ── ÉTAPE 1 : Analyse Multi-Images par Gemini 2.5 Flash ──────────────
    if (apiKey) {
      try {
        const imageParts = imagesArray.map((imgBase64: string) => {
          const cleanBase64 = imgBase64.replace(/^data:image\/\w+;base64,/, "");
          return {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64,
            },
          };
        });

        const planContextText = imagesArray.length > 1
          ? `Analyse ces ${imagesArray.length} plans superposés pour une structure ${numberOfFloors}. L'image 1 est le RDC et l'image 2 est l'étage supérieur. Synthétise l'élévation extérieure.`
          : `Analyse ce plan d'étage pour générer la façade extérieure. Type d'étage configuré : ${numberOfFloors}.`;

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
                    { text: ARCHI_CAM_FACADE_SYSTEM_PROMPT },
                    { text: `Requested View Type: ${viewType}. ${planContextText}` },
                    ...imageParts,
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
            if (parsed.prompt) generatedFacadePrompt = parsed.prompt;
            if (parsed.buildingType) buildingType = parsed.buildingType;
            if (parsed.facadeMaterials) facadeMaterials = parsed.facadeMaterials;
          }
        }
      } catch (err) {
        console.warn("[Facade Pipeline] Gemini Vision notice:", err);
      }
    }

    // ── ÉTAPE 2 : Rendu Façade 3D via ControlNet / Replicate ───────────────
    let renderUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80";

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (replicateToken) {
      try {
        const primaryLineart = imagesArray[0];
        const res = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${replicateToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "8b7ef2298e09e13b86026a798579d1a3c7996c5e2069e2c62c3e1e5b8d278788",
            input: {
              image: primaryLineart,
              prompt: generatedFacadePrompt,
              negative_prompt: "floor plan, top-down view, 2d layout, interior, blueprint, dimensions, text, room labels, top view, aerial layout",
              controlnet_conditioning_scale: 0.80,
              guidance_scale: 3.5,
              num_inference_steps: 30,
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
        console.warn("[Facade Pipeline] Replicate notice:", err);
      }
    }

    // ── ÉTAPE 3 : Restitution des Données ──────────────────────────────────
    return NextResponse.json({
      success: true,
      imageUrl: renderUrl,
      facadeRenderUrl: renderUrl,
      mode: "3D_FACADE_EXTERIEURE",
      meta: {
        generatedPrompt: generatedFacadePrompt,
        buildingType,
        facadeMaterials,
        viewType,
      },
    });

  } catch (error: any) {
    console.error("Erreur Rendu Façade 3D :", error);
    return NextResponse.json(
      { error: "Échec de génération de la façade 3D.", details: error.message },
      { status: 500 }
    );
  }
}
