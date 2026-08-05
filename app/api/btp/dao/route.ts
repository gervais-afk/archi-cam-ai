import { NextResponse } from "next/server";
import { deductCredits } from "@/lib/credits/credit-manager";

export const dynamic = "force-dynamic";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

function getOpenRouterHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  return {
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "Archi Cam AI DAO",
    "Content-Type": "application/json",
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectName = "Construction Bâtiment Administrative R+2", city = "Yaoundé", estimatedCostXaf = 120000000, userId = "demo-user" } = body;

    // Déduction de 5 crédits pour la Génération de DAO MINMAP
    const creditCheck = await deductCredits(userId, "VIDEO_RENDER"); // Equivalent 5 crédits
    if (!creditCheck.success) {
      return NextResponse.json({ error: creditCheck.error, code: "PAYMENT_REQUIRED" }, { status: 402 });
    }

    const prompt = `Rédige un Dossier d'Appel d'Offres (DAO) conforme au Code des Marchés Publics du Cameroun (MINMAP / ARMP 2026).
Projet : ${projectName} à ${city}.
Budget prévisionnel : ${estimatedCostXaf} FCFA.

Retourne un JSON STRICT au schéma exact :
{
  "project_name": "${projectName}",
  "city": "${city}",
  "rpao_summary": string,
  "technical_memory": [
    { "section": string, "details": string }
  ],
  "sdpu": [
    { "item_code": string, "designation": string, "unit": string, "unit_price_xaf": number }
  ],
  "execution_duration_months": number
}`;

    let daoResult: any = null;

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: "POST",
          headers: getOpenRouterHeaders(),
          body: JSON.stringify({
            model: "deepseek/deepseek-v4-flash",
            temperature: 0.1,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: "Tu es un expert juriste en Marchés Publics au Cameroun (ARMP/MINMAP 2026). Réponds en JSON strict.",
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
          daoResult = JSON.parse(cleaned.substring(cleaned.search(/[{]/)));
        }
      } catch (err) {
        console.warn("[DAO MINMAP API] Notice OpenRouter call:", err);
      }
    }

    if (!daoResult || !daoResult.technical_memory) {
      daoResult = {
        project_name: projectName,
        city,
        rpao_summary: "Soumission sous pli fermé en 7 exemplaires (1 original + 6 copies) auprès de la Commission Régionale de Passation des Marchés.",
        technical_memory: [
          {
            section: "1. Organigramme & Moyens Humains",
            details: "Ingénieur de Suivi Civil (10 ans d'expérience enregistré à l'ONIGC) + Chef de Chantier certifié.",
          },
          {
            section: "2. Matériel & Engins",
            details: "Bétonnières 500L, Vibreurs à béton, Camion Benne 12m3 et Échafaudages métalliques tubulaires.",
          },
        ],
        sdpu: [
          { item_code: "101", designation: "Installation de chantier & Panneau de chantier", unit: "FF", unit_price_xaf: 1500000 },
          { item_code: "201", designation: "Terrassement & Fouilles en rigoles en terrain ordinaire", unit: "m3", unit_price_xaf: 4500 },
          { item_code: "301", designation: "Béton armé dosé à 350kg/m3 pour poteaux et dalles", unit: "m3", unit_price_xaf: 185000 },
        ],
        execution_duration_months: 6,
      };
    }

    return NextResponse.json(daoResult);
  } catch (error: any) {
    console.error("Erreur /api/btp/dao :", error);
    return NextResponse.json({ error: "Erreur lors de la génération du DAO." }, { status: 500 });
  }
}
