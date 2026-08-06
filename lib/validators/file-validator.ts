import path from "path";

export class FileValidator {
  private allowedExtensions = [".ifc", ".rvt", ".pln", ".skp", ".dwg", ".dxf", ".3dm", ".pdf", ".png", ".jpg", ".jpeg"];

  private magicBytesMap: Record<string, string> = {
    ".ifc": "49534f",     // ISO (STEP file)
    ".pdf": "25504446",   // %PDF
    ".png": "89504e47",   // PNG signature
    ".jpg": "ffd8ff",     // JPEG SOI marker
    ".jpeg": "ffd8ff",    // JPEG SOI marker
    ".dwg": "414331",     // AC1 (AutoCAD magic)
    ".rvt": "d0cf11e0"    // OLE Compound File (Revit magic)
  };

  /**
   * Valide un buffer binaire côté serveur Next.js
   */
  validateBuffer(
    buffer: Buffer,
    fileName: string
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validation de la taille (max 500 Mo)
    const maxSize = 500 * 1024 * 1024;
    if (buffer.length > maxSize) {
      errors.push(
        `Fichier trop volumineux : ${(buffer.length / 1024 / 1024).toFixed(0)}MB (max 500MB)`
      );
    }

    // 2. Validation de l'extension
    const ext = path.extname(fileName).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      errors.push(`Format de fichier non supporté : ${ext}`);
    }

    // 3. Validation de nom de fichier trop long
    if (fileName.length > 200) {
      warnings.push("Nom de fichier supérieur à 200 caractères (sera tronqué)");
    }

    // 4. Validation des Magic Bytes (Signature de fichier)
    const hexSignature = buffer.toString("hex", 0, 8);
    const expectedSignature = this.magicBytesMap[ext];

    if (expectedSignature && !hexSignature.startsWith(expectedSignature)) {
      errors.push(`Fichier corrompu ou extension incorrecte pour ${ext}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valide un objet File côté client (Browser)
   */
  async validateBeforeUpload(file: File): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`Fichier trop volumineux : ${(file.size / 1024 / 1024).toFixed(0)}MB (max 500MB)`);
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!this.allowedExtensions.includes(ext)) {
      errors.push(`Format de fichier non supporté : ${ext}`);
    }

    if (file.name.length > 200) {
      warnings.push("Nom de fichier supérieur à 200 caractères (sera tronqué)");
    }

    try {
      const arrayBuffer = await file.slice(0, 8).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const hexSignature = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const expectedSignature = this.magicBytesMap[ext];
      if (expectedSignature && !hexSignature.startsWith(expectedSignature)) {
        errors.push(`Signature de fichier invalide (corrompu ou renommé de force en ${ext})`);
      }
    } catch (err: any) {
      errors.push(`Erreur lors de l'inspection de la signature binaire : ${err.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
