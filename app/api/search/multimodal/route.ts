import { NextResponse } from "next/server";

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
    const { query: textQuery, imageBase64 } = body;

    let vector: number[] = [];

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const res = await fetch(`${OPENROUTER_API_URL}/embeddings`, {
          method: "POST",
          headers: getOpenRouterHeaders(),
          body: JSON.stringify({
            model: "google/gemini-embedding-2",
            input: textQuery || "Villa duplex moderne avec terrasse Yaoundé",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          vector = data.data?.[0]?.embedding || [];
        }
      } catch (e) {
        console.warn("[Multimodal Search API] Notice embedding API:", e);
      }
    }

    // Mock/duckdb search results
    const results = [
      {
        id: "proj_001",
        title: "Duplex R+1 Luxe Bastos (Yaoundé)",
        surface: 180,
        similarity: vector.length > 0 ? 0.94 : 0.88,
        previewUrl: "/renders/demo_bastos_duplex.png",
      },
      {
        id: "proj_002",
        title: "Villa Basse Tropique Bonapriso (Douala)",
        surface: 140,
        similarity: vector.length > 0 ? 0.89 : 0.82,
        previewUrl: "/renders/demo_bonapriso_villa.png",
      },
    ];

    return NextResponse.json({
      success: true,
      query: textQuery || "Multimodal Sketch/Text Search",
      vectorLength: vector.length,
      results,
    });
  } catch (error: any) {
    console.error("Erreur dans /api/search/multimodal :", error);
    return NextResponse.json({ error: "Erreur recherche multimodale." }, { status: 500 });
  }
}
