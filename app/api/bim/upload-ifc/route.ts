import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { SmartRouter } from "@/lib/converters/smart-router";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = req.headers.get("x-user-id") || "test_user_id";

    if (!file) {
      return Response.json({ error: "Missing file payload" }, { status: 400 });
    }

    // 1. Sauvegarder temporairement dans un dossier local sous Windows
    const uploadDir = path.join(process.cwd(), "scripts", "uploads", userId);
    fs.mkdirSync(uploadDir, { recursive: true });
    const tempPath = path.join(uploadDir, file.name);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempPath, buffer);

    // 2. Traiter le fichier via le Smart Router
    const router = new SmartRouter();
    const routerResult = await router.processFile(tempPath);

    // Nettoyer le fichier source d'entrée d'origine
    try {
      fs.unlinkSync(tempPath);
    } catch {}

    // 3. Si pipeline IFC_EXTRACTION, appeler l'extracteur Python rapide
    if (routerResult.ifcPath) {
      const outputJsonPath = path.join(
        process.cwd(),
        "scripts",
        "uploads",
        userId,
        `${path.basename(routerResult.ifcPath, ".ifc")}_quantities.json`
      );

      console.log(`🐍 Lancement de fast_extract_quantities.py sur ${routerResult.ifcPath}...`);
      
      const pythonCommand = `python scripts/fast_extract_quantities.py "${routerResult.ifcPath}" "${outputJsonPath}"`;
      const { stdout } = await execAsync(pythonCommand);
      console.log("Python stdout:", stdout);

      // Lire les quantités extraites
      const quantities = JSON.parse(fs.readFileSync(outputJsonPath, "utf-8"));

      // Nettoyer les fichiers de travail
      try {
        fs.unlinkSync(routerResult.ifcPath);
        fs.unlinkSync(outputJsonPath);
      } catch {}

      return Response.json({
        success: true,
        pipeline: "IFC_EXTRACTION",
        processingMethod: routerResult.processingMethod,
        processingTime: routerResult.processingTime,
        quantities
      });
    }

    // 4. Si pipeline VISION_AI_2D, retourner directement les données extraites
    return Response.json({
      success: true,
      pipeline: "VISION_AI_2D",
      processingMethod: routerResult.processingMethod,
      processingTime: routerResult.processingTime,
      extractedData: routerResult.extractedData
    });

  } catch (err: any) {
    console.error("[API BIM Upload] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
