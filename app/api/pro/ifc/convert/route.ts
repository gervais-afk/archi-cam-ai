import fs from "fs";
import path from "path";
import { FormatConverter } from "@/lib/converters/format-converter";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = req.headers.get("x-user-id") || "test_user_id";

    if (!file) {
      return Response.json({ error: "Missing file payload" }, { status: 400 });
    }

    // 1. Sauvegarder temporairement dans un dossier local pour éviter les restrictions EACCES Windows
    const uploadDir = path.join(process.cwd(), "scripts", "uploads", userId);
    fs.mkdirSync(uploadDir, { recursive: true });
    const tempPath = path.join(uploadDir, file.name);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(tempPath, buffer);

    // 2. Convertir en IFC
    const converter = new FormatConverter();
    const result = await converter.convertToIFC(tempPath, userId);

    // Nettoyer le fichier d'entrée temporaire
    try {
      fs.unlinkSync(tempPath);
    } catch {}

    if (!result.success || !result.ifcPath) {
      return Response.json({ error: result.error || "Échec de conversion" }, { status: 400 });
    }

    // 3. Lire le fichier IFC généré
    const ifcBuffer = fs.readFileSync(result.ifcPath);

    // Nettoyer le fichier de sortie temporaire
    try {
      fs.unlinkSync(result.ifcPath);
    } catch {}

    // 4. Renvoyer le fichier IFC converti et audité
    return new Response(ifcBuffer, {
      headers: {
        "Content-Type": "application/x-step",
        "Content-Disposition": `attachment; filename="${path.basename(result.ifcPath)}"`,
        "X-Quality-Score": String(result.qualityScore || 100),
        "X-Warnings": JSON.stringify(result.warnings || [])
      }
    });
  } catch (err: any) {
    console.error("[API IFC Convert] Error:", err.message);
    return Response.json({ error: err.message }, { status: 550 });
  }
}
