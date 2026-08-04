import fs from "fs";
import path from "path";

/**
 * Convertit un fichier local (PNG, JPG, WEBP, PDF) en Data URI Base64.
 * Indispensable pour l'envoi direct vers les APIs Cloud sans dépendre de localhost.
 */
export async function fileToDataUri(filePath: string, defaultMime: string = "image/png"): Promise<string | null> {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let mimeType = defaultMime;
    if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".pdf") mimeType = "application/pdf";

    const base64 = fileBuffer.toString("base64");
    return `data:${mimeType};base64,${base64}`;
  } catch (err) {
    console.warn(`[fileToDataUri] Notice lors de la conversion de ${filePath}:`, err);
    return null;
  }
}
