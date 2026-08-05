import { NextResponse } from "next/server";
import { deductCredits } from "@/lib/credits/credit-manager";

export const dynamic = "force-dynamic";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

function getOpenRouterHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  return {
    "Authorization": `Bearer ${apiKey}`,
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "Archi Cam AI",
    "Content-Type": "application/json",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { rooms = [], city = "Yaoundé", standing = "moyen", userId = "demo-user" } = body;

    // Contrôle du solde de crédits
    const creditCheck = await deductCredits(userId, "BTP_ESTIMATE");
    if (!creditCheck.success) {
      return NextResponse.json({ error: creditCheck.error, code: "PAYMENT_REQUIRED" }, { status: 402 });
    }

    const totalM2 = Array.isArray(rooms)
      ? rooms.reduce((sum: number, r: any) => sum + Number(r.surface_m2 || r.area_m2 || 0), 0)
      : 120;

    const effectiveM2 = totalM2 > 0 ? totalM2 : 120;

    const prompt = `Génère un devis estimatif BTP détaillé en Francs CFA (XAF) pour un projet à ${city} (Cameroun), standing ${standing}.
Superficie totale: ${effectiveM2} m².
Pièces: ${JSON.stringify(rooms)}

Retourne un JSON STRICT avec exactement ce schéma:
{
  "currency": "FCFA",
  "total_estimated_xaf": number,
  "breakdown": [
    {
      "category": "Gros Œuvre" | "Revêtements" | "Menuiserie" | "Électricité" | "Plomberie",
      "description": string,
      "cost_xaf": number,
      "unit": "m2" | "m3" | "FF" | "u",
      "quantity": number,
      "unit_price_xaf": number
    }
  ]
}`;

    const candidateModels = ["deepseek/deepseek-v4-flash", "mistralai/mistral-large-2407", "google/gemini-2.5-flash"];
    let estimateResult: any = null;

    if (process.env.OPENROUTER_API_KEY) {
      for (const model of candidateModels) {
        try {
          const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
            method: "POST",
            headers: getOpenRouterHeaders(),
            body: JSON.stringify({
              model,
              temperature: 0.1,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content: `Tu es un expert métreur BTP au Cameroun (MINMAP 2026).
CONTEXTE OFFICIEL MINMAP 2026 (${city}) :
• Ciment CPJ 42.5 le sac 50kg : 4 900 FCFA (Yaoundé) / 4 600 FCFA (Douala).
• Sable Sanaga le m3 : 8 500 FCFA. Gravier concassé 15/25 le m3 : 18 500 FCFA.
• Fer à béton HA FeE500 : 620 000 FCFA / tonne.
• Bois d'œuvre massif Iroko : 145 000 FCFA le m3.
Réponds TOUJOURS en JSON strict conforme aux prix ci-dessus.`,
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
            estimateResult = JSON.parse(cleaned.substring(cleaned.search(/[{]/)));
            if (estimateResult && estimateResult.total_estimated_xaf) {
              break;
            }
          }
        } catch (err) {
          console.warn(`[Estimate API] Model ${model} failed:`, err);
        }
      }
    }

    // Fallback souverain calcul local
    if (!estimateResult || !estimateResult.total_estimated_xaf) {
      const baseRate = standing === "luxe" ? 350000 : standing === "economique" ? 180000 : 250000;
      const totalCost = Math.round(effectiveM2 * baseRate);
      estimateResult = {
        currency: "FCFA",
        total_estimated_xaf: totalCost,
        breakdown: [
          {
            category: "Gros Œuvre & Structure BAEL 91",
            description: "Fondations, maçonnerie parpaings 20cm, poteaux & dalles",
            cost_xaf: Math.round(totalCost * 0.45),
            unit: "m2",
            quantity: effectiveM2,
            unit_price_xaf: Math.round(baseRate * 0.45),
          },
          {
            category: "Revêtements Sols & Salles d'Eau",
            description: "Carrelage grès cérame, faïence & étanchéité",
            cost_xaf: Math.round(totalCost * 0.22),
            unit: "m2",
            quantity: effectiveM2,
            unit_price_xaf: Math.round(baseRate * 0.22),
          },
          {
            category: "Menuiseries Iroko & Aluminium",
            description: "Portes bois massif Iroko, fenêtres alu vitrées",
            cost_xaf: Math.round(totalCost * 0.18),
            unit: "FF",
            quantity: 1,
            unit_price_xaf: Math.round(totalCost * 0.18),
          },
          {
            category: "Électricité, Plomberie & VRD",
            description: "Câblage aux normes NFC 15-100, sanitaires & fosses",
            cost_xaf: Math.round(totalCost * 0.15),
            unit: "FF",
            quantity: 1,
            unit_price_xaf: Math.round(totalCost * 0.15),
          },
        ],
      };
    }

    return NextResponse.json(estimateResult);
  } catch (error: any) {
    console.error("Erreur dans /api/btp/estimate :", error);
    return NextResponse.json({ error: "Erreur lors du calcul de devis." }, { status: 500 });
  }
}
