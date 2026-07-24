import { sketchToRenderFlow } from "@/lib/genkit-render";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, style, planUrl } = body;

    // planUrl est requis pour le workflow Sketch-to-Render.
    // Si aucun n'est fourni, on utilise une image par défaut (mock sketch) pour les tests
    const defaultPlan = planUrl || "https://images.unsplash.com/photo-1506970135314-ee7f6986516d?w=500";

    if (!prompt) {
      return NextResponse.json(
        { error: "Le paramètre 'prompt' est requis." },
        { status: 400 }
      );
    }

    console.log(`[API Image] Appel du flow sketchToRenderFlow pour le style : ${style}`);
    
    // Validation du style (enum) pour Genkit
    let genkitStyle: "3D_PHOTOREALISTE" | "PLAN_2D_PHOTOSHOP" | "MAQUETTE_BLANCHE" | "TROPICAL_MOODY" = "3D_PHOTOREALISTE";
    if (style === "3D_PHOTOREALISTE" || style === "PLAN_2D_PHOTOSHOP" || style === "MAQUETTE_BLANCHE" || style === "TROPICAL_MOODY") {
      genkitStyle = style;
    } else {
      // Mapping des anciens styles vers les nouveaux styles pour rétrocompatibilité
      if (style === "luxe-tropical") genkitStyle = "TROPICAL_MOODY";
      else if (style === "moderne-minimaliste") genkitStyle = "MAQUETTE_BLANCHE";
      else if (style === "africain-contemporain") genkitStyle = "TROPICAL_MOODY";
    }

    const flowResult = await sketchToRenderFlow({
      planUrl: defaultPlan,
      style: genkitStyle,
    });

    return NextResponse.json({
      imageUrl: flowResult.imageUrl,
      prompt: flowResult.prompt,
      cached: flowResult.cached,
      similarity: flowResult.similarity
    });

  } catch (error: any) {
    console.error("Erreur API Render Image:", error);
    return NextResponse.json(
      { error: `Erreur lors de la génération : ${error.message || error}` },
      { status: 500 }
    );
  }
}
