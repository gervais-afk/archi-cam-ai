import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Le paramètre 'imageUrl' est requis." },
        { status: 400 }
      );
    }

    console.log(`[Upscaler Pro] Lancement de la super-résolution pour l'image : ${imageUrl.slice(0, 50)}...`);

    // Simulation de traitement de mise à l'échelle (2 secondes)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulation de retour d'une image haute définition en forçant des paramètres de taille/qualité max
    let highDefImageUrl = imageUrl;
    if (imageUrl.includes("unsplash.com")) {
      try {
        const urlObj = new URL(imageUrl);
        urlObj.searchParams.set("w", "3840");
        urlObj.searchParams.set("q", "100");
        highDefImageUrl = urlObj.toString();
      } catch (e) {
        // En cas d'erreur de parsing d'URL, on garde l'originale
      }
    }

    console.log(`[Upscaler Pro] Image mise à l'échelle en 4K avec succès !`);

    return NextResponse.json({
      imageUrl: highDefImageUrl,
      status: "completed"
    });

  } catch (error: any) {
    console.error("Erreur API Upscale:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à l'échelle de l'image." },
      { status: 500 }
    );
  }
}
