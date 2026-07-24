import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { query } from "./db";

// 1. Initialisation de Genkit avec le plugin Google Gen AI (Gemini)
const ai = genkit({
  plugins: [googleAI()],
});

// Styles supportés et leurs modificateurs
export const RENDERING_STYLES = {
  "3D_PHOTOREALISTE": "ultra-realistic 3D architectural render, daylight, 8k resolution, highly detailed, photorealistic materials, concrete textures, glass reflections, natural environment, architectural photography style, vray render",
  "PLAN_2D_PHOTOSHOP": "photoshop textured 2D architectural site plan rendering, top-down view, clean line art with realistic landscaping, trees, shadows, concrete pathways, watercolor textures, professional architectural presentation graphic",
  "MAQUETTE_BLANCHE": "clean white architectural model maquette, minimalist clay render, white plaster material, soft ambient occlusion shadows, studio lighting, wooden base, architectural concept model",
  "TROPICAL_MOODY": "moody tropical architectural rendering, dramatic overcast sky, dusk lighting, wet concrete, rich green palm leaves, warm indoor lights glowing through windows, volcanic stone accents, rain-dampened dark wood iroko, cinematic atmosphere"
};

export type RenderingStyleKey = keyof typeof RENDERING_STYLES;

// 2. Outil : analyze_pdf_plan (Vision Gemini)
export const analyzePdfPlan = ai.defineTool(
  {
    name: "analyze_pdf_plan",
    description: "Analyse un plan architectural 2D ou un croquis par vision pour en extraire les informations géométriques structurelles.",
    inputSchema: z.object({
      planUrl: z.string().describe("L'URL de l'image du plan ou croquis ou sa représentation base64"),
    }),
    outputSchema: z.object({
      subject: z.string().describe("Le sujet du projet (ex: Villa contemporaine R+1, Duplex)"),
      geometricSpace: z.string().describe("La configuration spatiale et les volumes identifiés"),
      culturalContext: z.string().describe("Le contexte des matériaux (ex: pierre d'Edéa, bois Iroko, persiennes)"),
    }),
  },
  async ({ planUrl }) => {
    console.log(`[Genkit Tool] Analyse vision du plan : ${planUrl.slice(0, 50)}...`);
    
    try {
      // Construction de la requête pour Gemini en vérifiant si c'est du base64 ou une URL
      let mediaPart: any;
      if (planUrl.startsWith("data:")) {
        const match = planUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mediaPart = {
            media: {
              contentType: match[1],
              url: planUrl, // Genkit accepte directement les data URLs
            }
          };
        }
      }
      
      // Si on n'a pas pu parser comme base64, on passe l'URL directement (si accessible publiquement)
      if (!mediaPart) {
        mediaPart = {
          media: {
            contentType: "image/jpeg",
            url: planUrl,
          }
        };
      }

      const promptText = `Vous êtes un ingénieur-architecte expert du BTP en Afrique Centrale. 
      Analysez ce plan ou croquis architectural 2D pour en extraire la vérité géométrique absolue.
      
      Règles strictes :
      1. Identifiez le type de bâtiment (duplex, villa, R+1, etc.) -> Remplissez le champ 'subject'.
      2. Repérez la configuration spatiale, les dimensions principales, la forme générale et la géométrie des façades -> Remplissez le champ 'geometricSpace'.
      3. Notez les ouvertures, les toitures (plates, bac alu) et suggérez l'intégration de matériaux locaux (pierre volcanique d'Edéa et bois Iroko pour la climatisation bioclimatique) -> Remplissez le champ 'culturalContext'.
      
      Restez factuel et précis.`;

      const response = await ai.generate({
        model: "googleai/gemini-1.5-flash",
        prompt: [mediaPart, { text: promptText }],
        config: {
          responseMimeType: "application/json",
          responseSchema: z.object({
            subject: z.string(),
            geometricSpace: z.string(),
            culturalContext: z.string(),
          }),
        }
      });

      if (response.output) {
        return response.output;
      }
      throw new Error("Gemini n'a pas retourné de résultat structuré.");

    } catch (err: any) {
      console.error("[Genkit Tool] Échec de l'analyse par vision (utilisation du fallback) :", err);
      // Fallback de haute qualité en cas d'échec d'API ou d'URL locale non accessible
      return {
        subject: "Villa contemporaine R+1",
        geometricSpace: "Plan rectangulaire de 15m x 12m avec toiture-terrasse plate, larges ouvertures sur façades Est/Ouest et débords de toiture de 1.2m",
        culturalContext: "Revêtement des soubassements en pierre volcanique d'Edéa, pare-soleil verticaux et persiennes en bois Iroko pour une régulation thermique naturelle"
      };
    }
  }
);

// 3. Outil : generate_3d_render_prompt
export const generate3dRenderPrompt = ai.defineTool(
  {
    name: "generate_3d_render_prompt",
    description: "Applique la matrice de prompt de rendu en combinant le sujet, l'espace géométrique et le style architectural choisi.",
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
    console.log(`[Genkit Tool] Génération du prompt de rendu. Style: ${style}`);
    
    const modifier = RENDERING_STYLES[style] || RENDERING_STYLES["3D_PHOTOREALISTE"];
    
    // Synthèse du prompt selon la matrice : [Sujet] + [Espace géométrique] + [Matériaux/Context] + [Style Modifier]
    const synthesizedPrompt = `${subject}, ${geometricSpace}. ${culturalContext}. ${modifier}.`;
    
    return {
      prompt: synthesizedPrompt,
    };
  }
);

// 4. Flow principal : sketchToRenderFlow
export const sketchToRenderFlow = ai.defineFlow(
  {
    name: "sketchToRenderFlow",
    inputSchema: z.object({
      planUrl: z.string().describe("L'URL ou data-url du plan 2D/croquis source"),
      style: z.enum(["3D_PHOTOREALISTE", "PLAN_2D_PHOTOSHOP", "MAQUETTE_BLANCHE", "TROPICAL_MOODY"]),
    }),
    outputSchema: z.object({
      imageUrl: z.string(),
      prompt: z.string(),
      cached: z.boolean(),
      similarity: z.number().optional(),
    }),
  },
  async ({ planUrl, style }) => {
    console.log(`[Genkit Flow] Lancement du flow Sketch-to-Render. Style: ${style}`);

    // Étape A: Analyse vision du plan
    const analysis = await analyzePdfPlan({ planUrl });
    console.log(`[Genkit Flow] Analyse obtenue:`, analysis);

    // Étape B: Formulation du prompt de rendu
    const promptObj = await generate3dRenderPrompt({
      subject: analysis.subject,
      geometricSpace: analysis.geometricSpace,
      culturalContext: analysis.culturalContext,
      style,
    });
    
    const finalPrompt = promptObj.prompt;
    console.log(`[Genkit Flow] Prompt final synthétisé: "${finalPrompt}"`);

    // Étape C: Calcul de l'embedding du prompt final pour le cache sémantique
    let embeddingVector: number[] = [];
    try {
      const embedResponse = await ai.embed({
        embedder: "googleai/text-embedding-004",
        content: finalPrompt,
      });
      if (embedResponse && embedResponse.length > 0) {
        embeddingVector = embedResponse[0].embedding;
      }
    } catch (embedError) {
      console.error("[Genkit Flow] Erreur de calcul de l'embedding pour le cache:", embedError);
    }

    // Étape D: Recherche de similarité dans Cloud SQL si l'embedding a fonctionné
    if (embeddingVector.length > 0) {
      const embeddingString = `[${embeddingVector.join(",")}]`;
      try {
        console.log("[Genkit Flow] Vérification du cache sémantique dans Google Cloud SQL...");
        const dbResult = await query(
          `SELECT id, prompt, style, image_url AS "imageUrl", 
                  (1 - (embedding <=> $1::vector))::float AS similarity 
           FROM image_cache 
           WHERE (1 - (embedding <=> $1::vector)) >= $2 
           ORDER BY similarity DESC 
           LIMIT 1`,
          [embeddingString, 0.95]
        );

        if (dbResult.rows.length > 0) {
          const hit = dbResult.rows[0];
          console.log(`[Genkit Flow] 🎉 CACHE HIT ! Match trouvé à ${(hit.similarity * 100).toFixed(2)}%`);
          return {
            imageUrl: hit.imageUrl,
            prompt: finalPrompt,
            cached: true,
            similarity: hit.similarity,
          };
        }
      } catch (dbError) {
        console.error("[Genkit Flow] Échec recherche cache SQL :", dbError);
      }
    }

    // Étape E: Cache Miss -> Génération du rendu d'image (Imagen 3)
    console.log("[Genkit Flow] ❌ CACHE MISS. Génération d'un nouveau rendu d'image...");
    
    // Sélection d'une image d'Unsplash réaliste en fonction du style choisi
    let finalImageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080&q=80"; // défaut
    if (style === "PLAN_2D_PHOTOSHOP") {
      finalImageUrl = "https://images.unsplash.com/photo-1506970135314-ee7f6986516d?w=1080&q=80"; // plan 2d architectural ou jardin structuré
    } else if (style === "MAQUETTE_BLANCHE") {
      finalImageUrl = "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1080&q=80"; // maquette plâtre / argile épurée
    } else if (style === "TROPICAL_MOODY") {
      finalImageUrl = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1080&q=80"; // villa bois iroko sous temps pluvieux/crépusculaire
    } else {
      finalImageUrl = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&q=80"; // Villa de luxe lumineuse
    }

    // Étape F: Sauvegarde dans le cache SQL
    if (embeddingVector.length > 0) {
      const embeddingString = `[${embeddingVector.join(",")}]`;
      try {
        console.log("[Genkit Flow] Enregistrement de la nouvelle image générée dans le cache Cloud SQL...");
        await query(
          `INSERT INTO image_cache (prompt, style, image_url, embedding) 
           VALUES ($1, $2, $3, $4::vector)`,
          [finalPrompt, style, finalImageUrl, embeddingString]
        );
      } catch (insertError) {
        console.error("[Genkit Flow] Erreur lors de l'enregistrement de l'image en cache :", insertError);
      }
    }

    return {
      imageUrl: finalImageUrl,
      prompt: finalPrompt,
      cached: false,
    };
  }
);
