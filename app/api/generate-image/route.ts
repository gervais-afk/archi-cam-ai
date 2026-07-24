import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Le prompt est requis." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "La clé API GEMINI_API_KEY est manquante dans l'environnement." }, { status: 500 });
    }

    // Call the official Google AI Studio Imagen 3 model (codenamed nanobanana pro / image-generation)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`;

    console.log("Calling Imagen 3 via Google AI API with prompt:", prompt.slice(0, 100) + "...");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: "16:9",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Imagen API Error response:", errorText);
      return NextResponse.json({ error: `Erreur API Google: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    const base64Image = data.generatedImages?.[0]?.image?.imageBytes;

    if (!base64Image) {
      console.error("No image bytes returned in response:", data);
      return NextResponse.json({ error: "Aucune image générée n'a été retournée par l'API Google." }, { status: 500 });
    }

    // Return the base64 image data to the client
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;
    return NextResponse.json({ imageUrl });

  } catch (error: any) {
    console.error("Image generation route error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur lors de la génération de l'image." }, { status: 500 });
  }
}
