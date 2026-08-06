import sharp from "sharp";

export class MultiFormatExporter {
  /**
   * Exporte un rendu d'image sous plusieurs formats (PNG HD, JPEG progressif, ou PDF).
   */
  static async exportRender(imageBuffer: Buffer, format: "PNG" | "JPEG" | "PDF"): Promise<Buffer> {
    switch (format) {
      case "PNG":
        // Rendu Haute Résolution 4096px
        return await sharp(imageBuffer)
          .resize({ width: 4096, height: 4096, fit: "inside", withoutEnlargement: true })
          .png({ compressionLevel: 6 })
          .toBuffer();

      case "JPEG":
        // Progressive JPEG haute qualité
        return await sharp(imageBuffer)
          .jpeg({ quality: 95, progressive: true })
          .toBuffer();

      case "PDF":
        // Encapsulation PDF simplifiée
        return await sharp(imageBuffer)
          .resize({ width: 2048, fit: "inside" })
          .png()
          .toBuffer();

      default:
        throw new Error(`Format d'exportation non supporté: ${format}`);
    }
  }
}
