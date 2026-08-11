import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "L'image est requise." }, { status: 400 });
    }

    console.log("VIM Orchestrator: Lancement du pipeline Audit Ready...");

    // Dans un vrai environnement, nous ferions 3 appels en parallèle (YOLO, MLSD, OCR)
    // const [yolo, mlsd, ocr] = await Promise.all([
    //   fetch('http://localhost:8000/detect', ...),
    //   fetch('http://localhost:8000/vectorize/mlsd', ...),
    //   fetch('http://localhost:8000/read/spatial', ...)
    // ]);
    
    // MOCK DATA : Simulation de murs brisés et de textes pour tester TopologyBuilder
    const mockMlsdLines = [
      [0, 0, 10, 0], [10.02, 0, 20, 0], // Mur du bas cassé au milieu (gap de 0.02)
      [20, 0, 20, 10], // Mur droit
      [20, 10, 0, 10], // Mur haut
      [0, 10, 0, 0.04] // Mur gauche quasi-fermé
    ];
    
    const mockOcrTexts = [
      {
        "type": "region",
        "bbox": [2, 2, 8, 8],
        "label": "chambre parent",
        "value_type": "area",
        "numerical_value": 18.17,
        "unit": "m2"
      }
    ];

    const mockYoloSymbols = [
      {"type": "door", "bbox": [9, -1, 11, 1]}
    ];

    // Envoi vers le Worker Python spécialisé (VIM) sur le port 8001
    console.log("Transmission au noyau géométrique VIM (Shapely)...");
    const vimResponse = await fetch('http://127.0.0.1:8001/build-topology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walls: mockMlsdLines,
        symbols: mockYoloSymbols,
        texts: mockOcrTexts
      })
    });

    if (!vimResponse.ok) {
      const errorData = await vimResponse.json().catch(() => null);
      console.error("Erreur VIM:", errorData);
      return NextResponse.json({ 
        error: "Plan illisible : topologie non fermable. Demandez un scan de meilleure qualité.",
        details: errorData 
      }, { status: 400 });
    }

    const planGraph = await vimResponse.json();

    return NextResponse.json({ 
      message: "Géométrie reconstruite avec succès (Audit Ready)",
      data: planGraph
    });

  } catch (error: any) {
    console.error("Vectorize route error:", error);
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 });
  }
}
