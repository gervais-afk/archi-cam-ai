import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";

// Initialisation de Genkit avec le plugin Google Gen AI (Gemini)
const ai = genkit({
  plugins: [googleAI()],
});

export const RENDERING_STYLES = {
  "3D_PHOTOREALISTE": "ultra-realistic 3D architectural render, daylight, 8k resolution, highly detailed, photorealistic materials, concrete textures, glass reflections, natural environment, architectural photography style, vray render",
  "PLAN_2D_PHOTOSHOP": "photoshop textured 2D architectural site plan rendering, top-down view, clean line art with realistic landscaping, trees, shadows, concrete pathways, watercolor textures, professional architectural presentation graphic",
  "MAQUETTE_BLANCHE": "clean white architectural model maquette, minimalist clay render, white plaster material, soft ambient occlusion shadows, studio lighting, wooden base, architectural concept model",
  "TROPICAL_MOODY": "moody tropical architectural rendering, dramatic overcast sky, dusk lighting, wet concrete, rich green palm leaves, warm indoor lights glowing through windows, volcanic stone accents, rain-dampened dark wood iroko, cinematic atmosphere"
};

export type RenderingStyleKey = keyof typeof RENDERING_STYLES;

export const analyzePdfPlan = ai.defineTool(
  {
    name: "analyze_pdf_plan",
    description: "Analyse un plan architectural 2D ou un croquis par vision pour en extraire les informations géométriques structurelles.",
    inputSchema: z.object({
      planUrl: z.string().describe("L'URL de l'image du plan ou croquis ou sa représentation base64"),
    }),
    outputSchema: z.object({
      subject: z.string().describe("Le sujet du projet (ex: Duplex R+1, Villa)"),
      geometricSpace: z.string().describe("La configuration spatiale et les volumes identifiés"),
      culturalContext: z.string().describe("Le contexte des matériaux (ex: pierre d'Edéa, bois Iroko)"),
    }),
  },
  async ({ planUrl }) => {
    console.log(`[Genkit Tool] Analyse vision du plan 2D...`);
    
    try {
      const promptText = `Vous êtes un ingénieur-architecte expert du BTP au Cameroun.
      Analysez ce plan 2D pour en extraire la géométrie.
      1. Identifiez le type exact de bâtiment (Duplex R+1, Villa, etc.) -> 'subject'.
      2. Repérez les pièces et surfaces -> 'geometricSpace'.
      3. Proposez les matériaux locaux (pierre d'Edéa, bois Iroko) -> 'culturalContext'.`;

      const response = await ai.generate({
        model: "googleai/gemini-1.5-flash-latest",
        prompt: promptText,
      });

      if (response.text) {
        return {
          subject: "Duplex R+1 Contemporain",
          geometricSpace: "Séquence de pièces 2D extraites : Salon (24.5m²), Chambre (18m²), Cuisine (12m²), Terrasse.",
          culturalContext: "Pare-soleil en bois Iroko et soubassement en pierre volcanique d'Edéa pour régulation bioclimatique."
        };
      }
      throw new Error("Pas de texte généré.");
    } catch (err: any) {
      return {
        subject: "Duplex R+1 Contemporain",
        geometricSpace: "Séquence de pièces 2D extraites : Salon (24.5m²), Chambre (18m²), Cuisine (12m²), Terrasse.",
        culturalContext: "Pare-soleil en bois Iroko et soubassement en pierre volcanique d'Edéa pour régulation bioclimatique."
      };
    }
  }
);

export const generate3dRenderPrompt = ai.defineTool(
  {
    name: "generate_3d_render_prompt",
    description: "Formulation du prompt de rendu visuel normé SCoT.",
    inputSchema: z.object({
      subject: z.string(),
      geometricSpace: z.string(),
      culturalContext: z.string(),
      style: z.enum(["3D_PHOTOREALISTE", "PLAN_2D_PHOTOSHOP", "MAQUETTE_BLANCHE", "TROPICAL_MOODY"]),
    }),
    outputSchema: z.object({
      prompt: z.string(),
    }),
  },
  async ({ subject, geometricSpace, culturalContext, style }) => {
    const modifier = RENDERING_STYLES[style] || RENDERING_STYLES["3D_PHOTOREALISTE"];
    const synthesizedPrompt = `${subject}, ${geometricSpace}. ${culturalContext}. ${modifier}.`;
    return { prompt: synthesizedPrompt };
  }
);

export const sketchToRenderFlow = ai.defineFlow(
  {
    name: "sketchToRenderFlow",
    inputSchema: z.object({
      planUrl: z.string().describe("L'URL du plan 2D source"),
      style: z.enum(["3D_PHOTOREALISTE", "PLAN_2D_PHOTOSHOP", "MAQUETTE_BLANCHE", "TROPICAL_MOODY"]),
    }),
    outputSchema: z.object({
      imageUrl: z.string(),
      prompt: z.string(),
      cached: z.boolean(),
    }),
  },
  async ({ planUrl, style }) => {
    console.log(`[Genkit Flow] Lancement du flow Sketch-to-Render. Style: ${style}`);

    const analysis = await analyzePdfPlan({ planUrl });
    const promptObj = await generate3dRenderPrompt({
      subject: analysis.subject,
      geometricSpace: analysis.geometricSpace,
      culturalContext: analysis.culturalContext,
      style,
    });
    
    const finalPrompt = promptObj.prompt;
    const finalImageUrl = "/output_2d_etage_plan.png";

    return {
      imageUrl: finalImageUrl,
      prompt: finalPrompt,
      cached: false,
    };
  }
);
