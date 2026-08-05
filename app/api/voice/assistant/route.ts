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
    const { question, audioBase64, userId = "demo-user" } = body;

    // Contrôle du solde de crédits
    const creditCheck = await deductCredits(userId, "VOICE_ASSISTANT");
    if (!creditCheck.success) {
      return NextResponse.json({ error: creditCheck.error, code: "PAYMENT_REQUIRED" }, { status: 402 });
    }

    const userText = question || "Combien coûte le carrelage pour un salon de 25m2 au Cameroun ?";

    const systemPrompt = `Tu es l'assistant vocal intelligent d'Archi Cam AI, expert BTP au Cameroun.
CONTEXTE RAG JURIDIQUE & TARIFS MINMAP 2026 :
- Sac de Ciment CPJ 42.5 : 4 900 FCFA (Yaoundé) / 4 600 FCFA (Douala).
- Sable Sanaga : 8 500 FCFA/m3. Fer à béton HA FeE500 : 620 000 FCFA/tonne.
- Loi Urbanisme 2004/003 : Permis de bâtir obligatoire pour R+1 et supérieur délivré par la Communauté Urbaine.
Fournis des réponses courtes, concrètes, rassurantes et précises exprimées en Francs CFA (FCFA).`;

    let answerText = "Pour un salon de 25m², comptez environ 15 000 à 22 000 FCFA par m² soit un budget total estimé à 450 000 FCFA pour un carrelage grès cérame de standing moyen.";

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const res = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
          method: "POST",
          headers: getOpenRouterHeaders(),
          body: JSON.stringify({
            model: "openai/gpt-audio-mini",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: audioBase64
                  ? [
                      { type: "input_audio", input_audio: { data: audioBase64, format: "mp3" } },
                      { type: "text", text: userText },
                    ]
                  : userText,
              },
            ],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const choice = data.choices?.[0]?.message;
          answerText = choice?.content || choice?.audio?.transcript || answerText;
        } else {
          // Fallback gpt-audio-mini vers gemini-2.5-flash
          const resFallback = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
            method: "POST",
            headers: getOpenRouterHeaders(),
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userText },
              ],
            }),
          });
          if (resFallback.ok) {
            const dataFallback = await resFallback.json();
            answerText = dataFallback.choices?.[0]?.message?.content || answerText;
          }
        }
      } catch (e) {
        console.warn("[Voice Assistant API] Notice OpenRouter call:", e);
      }
    }

    return NextResponse.json({
      answerText,
      status: "success",
    });
  } catch (error: any) {
    console.error("Erreur dans /api/voice/assistant :", error);
    return NextResponse.json({ error: "Erreur serveur assistant vocal." }, { status: 500 });
  }
}
