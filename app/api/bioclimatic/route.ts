import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { city = "Yaoundé", surfaceM2 = 120, targetStyle = "Eco-Responsable BTC" } = body;

    const prompt = `Génère une analyse d'architecture bioclimatique et d'intégration des matériaux locaux pour un projet de ${surfaceM2}m² à ${city} (Cameroun).
Retourne un JSON STRICT au format exact :
{
  "city": "${city}",
  "climate_zone": "Équatoriale Humide" | "Soudano-Sahélienne" | "Littorale Humide",
  "optimal_orientation": string,
  "local_materials_recommended": [
    { "name": string, "description": string, "cement_saving_percentage": number }
  ],
  "thermal_comfort_tips": [string],
  "estimated_co2_reduction_tons": number
}`;

    let bioResult: any = null;

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "Archi Cam AI Bioclimatique",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: "Tu es un Architecte Bioclimatique expert de l'Afrique Tropicale. Réponds en JSON strict.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || "";
          const mdMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
          const cleaned = mdMatch ? mdMatch[1].trim() : content.trim();
          bioResult = JSON.parse(cleaned.substring(cleaned.search(/[{]/)));
        }
      } catch (err) {
        console.warn("[Bioclimatic API] Notice OpenRouter call:", err);
      }
    }

    if (!bioResult || !bioResult.local_materials_recommended) {
      bioResult = {
        city,
        climate_zone: city === "Garoua" ? "Soudano-Sahélienne" : "Équatoriale Humide",
        optimal_orientation: "Axe Est-Ouest pour minimiser le rayonnement solaire direct sur les grandes façades.",
        local_materials_recommended: [
          {
            name: "Briques de Terre Compressée (BTC) Stabilisées",
            description: "Excellente inertie thermique réduisant l'usage de la climatisation.",
            cement_saving_percentage: 30,
          },
          {
            name: "Bois d'Œuvre Iroko / Padouk",
            description: "Imputrescible et résistant aux termites pour les charpentes et claustras.",
            cement_saving_percentage: 15,
          },
        ],
        thermal_comfort_tips: [
          "Installer un débord de toiture de 1.20m pour protéger les fenêtres des pluies équatoriales.",
          "Prévoir une ventilation traversante via des claustras en terre cuite.",
        ],
        estimated_co2_reduction_tons: 14.5,
      };
    }

    return NextResponse.json(bioResult);
  } catch (error: any) {
    console.error("Erreur /api/bioclimatic :", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse bioclimatique." }, { status: 500 });
  }
}
