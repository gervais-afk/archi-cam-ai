import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { city = "Yaoundé", quarter = "Bastos", latitude = 3.848, longitude = 11.5021 } = body;

    const prompt = `Donne la fiche de zonage POS et les règles d'urbanisme pour un terrain situé à ${city} (Quartier ${quarter}), Coordonnées : (${latitude}, ${longitude}).
Retourne un JSON STRICT au format exact :
{
  "city": "${city}",
  "quarter": "${quarter}",
  "pos_zone": string,
  "max_height_floors": "R+2" | "R+4" | "R+6" | "R+10",
  "ces_coefficient": number, // ex: 0.5
  "min_road_setback_meters": number,
  "soil_bearing_capacity_mpa": number,
  "building_permit_required": boolean
}`;

    let resultJson: any = null;

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
            "X-Title": "Archi Cam AI Zoning",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek/deepseek-v4-flash",
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: "Tu es un Juriste Urbaniste expert du Plan d'Occupation des Sols (POS) des villes du Cameroun. Réponds en JSON strict.",
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
          resultJson = JSON.parse(cleaned.substring(cleaned.search(/[{]/)));
        }
      } catch (err) {
        console.warn("[Zoning API] Notice OpenRouter call:", err);
      }
    }

    if (!resultJson || !resultJson.pos_zone) {
      resultJson = {
        city,
        quarter,
        pos_zone: "Zone UR1 - Résidentielle Basse Densité",
        max_height_floors: "R+2",
        ces_coefficient: 0.5,
        min_road_setback_meters: 5,
        soil_bearing_capacity_mpa: 0.25,
        building_permit_required: true,
      };
    }

    return NextResponse.json(resultJson);
  } catch (error: any) {
    console.error("Erreur /api/geo/zoning-info :", error);
    return NextResponse.json({ error: "Erreur fiche zonage." }, { status: 500 });
  }
}
