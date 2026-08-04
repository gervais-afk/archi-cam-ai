import { NextRequest, NextResponse } from "next/server";
import { compileOkfProjectFolder, OkfProjectMetadata } from "@/lib/okf-project-compiler";
import { calculateDeterministicDevis } from "@/lib/metrique-engine";
import { generateLightweightIfc } from "@/lib/ifc-generator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      projectId = `PROJECT-${Date.now().toString().slice(-6)}`,
      projectTitle = "Maison d'Habitation Contemporaine",
      clientName = "Client Archi Cam AI",
      mode = "b2c", // "b2c" ou "b2b"
      rooms = [
        { name: "Séjour", surface_m2: 43.32, category: "SEJOUR" },
        { name: "Chambre 1", surface_m2: 12.49, category: "CHAMBRE" },
        { name: "Cuisine", surface_m2: 9.31, category: "PIECE_EAU" },
      ],
      ifcEntities,
      numberOfFloors = "R+1",
    } = body;

    // 1. Calcul Métrique Déterministe (Zéro LLM Arithmétique)
    const devisResult = calculateDeterministicDevis({
      mode,
      spaces: rooms,
      ifcEntities,
    });

    const totalBudgetFCFA = devisResult.financialSummary.totalHT;
    const totalSurfaceM2 = rooms.reduce((sum: number, r: any) => sum + (r.surface_m2 || 0), 0) || 160;

    // 2. Compilation du Dossier OKF v0.2 (/projects/<projectId>/)
    const okfMeta: OkfProjectMetadata = {
      projectId,
      projectTitle,
      clientName,
      totalSurfaceM2,
      totalBudgetFCFA,
      bioclimaticScore: "A+",
      numberOfFloors,
      rendered2DPath: "/output_2d_etage_plan.png",
      rooms: rooms.map((r: any) => ({
        name: r.name,
        area_m2: r.surface_m2,
        materialCode: r.category === "SEJOUR" ? "MAT-REV-MARBRE-01" : "MAT-REV-PARQUET-01",
        materialName: r.category === "SEJOUR" ? "Marbre Poli Carrara" : "Parquet Iroko",
      })),
      devisLines: devisResult.items.map((item) => ({
        description: item.designation,
        quantity: item.quantity,
        unit: item.unit,
        unitPriceFCFA: item.unitPriceFCFA,
      })),
    };

    const compilationResult = compileOkfProjectFolder(okfMeta);

    // 3. Pont Bidirectionnel Particulier ➔ Pro : Génération IFC Léger
    let generatedIfcPath = null;
    if (mode === "b2c") {
      const ifcGen = generateLightweightIfc(projectId, rooms);
      generatedIfcPath = ifcGen.ifcPath;
    }

    return NextResponse.json({
      success: true,
      projectId,
      mode,
      okfDirectory: compilationResult.projectDir,
      filesGenerated: compilationResult.files,
      generatedIfcPath,
      devisSummary: devisResult.financialSummary,
      complianceChecks: devisResult.complianceChecks,
    });
  } catch (error: any) {
    console.error("Erreur Compilation Projet OKF v0.2 :", error);
    return NextResponse.json(
      { error: "Échec de compilation du projet OKF v0.2.", details: error.message },
      { status: 500 }
    );
  }
}
