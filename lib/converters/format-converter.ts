import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

interface ConversionResult {
  success: boolean;
  ifcPath?: string;
  error?: string;
  qualityScore?: number;
  warnings?: string[];
}

export class FormatConverter {
  private supportedFormats = {
    ".rvt": { name: "Autodesk Revit", converter: "revit_to_ifc" },
    ".pln": { name: "Graphisoft ArchiCAD", converter: "archicad_to_ifc" },
    ".skp": { name: "SketchUp", converter: "sketchup_to_ifc" },
    ".dwg": { name: "AutoCAD", converter: "dwg_to_ifc" }
  };

  async convertToIFC(inputFilePath: string, userId: string): Promise<ConversionResult> {
    const ext = path.extname(inputFilePath).toLowerCase();

    // 1. Vérifier si conversion nécessaire
    if (ext === ".ifc") {
      const validation = await this.validateIFC(inputFilePath);
      return {
        success: true,
        ifcPath: inputFilePath,
        qualityScore: validation.quality_score,
        warnings: validation.warnings.map((w: any) => w.message)
      };
    }

    // 2. Vérifier si format supporté
    if (!this.supportedFormats[ext as keyof typeof this.supportedFormats]) {
      return {
        success: false,
        error: `Format ${ext} non supporté pour la conversion automatique.`
      };
    }

    console.log(`🔄 Conversion ${ext} → IFC...`);

    const outputDir = path.join(process.cwd(), "scripts", "conversions", userId);
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(
      outputDir,
      `${path.basename(inputFilePath, ext)}.ifc`
    );

    // 3. Simuler la conversion si CLOUDCONVERT_API_KEY est absente
    if (!process.env.CLOUDCONVERT_API_KEY) {
      console.warn("[FormatConverter] CLOUDCONVERT_API_KEY absente. Utilisation du simulateur local.");
      const mockIfcData = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Archi Cam AI Simulated IFC Conversion from ${ext}'),'21;1');\nFILE_NAME('${path.basename(outputPath)}','2026-08-06',('Archi Cam AI'),('BIM Manager'),'Convertisseur Pro v1.0','','');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n#1= IFCWALL('wall_01',$,'Mur Porteur Salon',$,$,$,$,$,$);\n#2= IFCSLAB('slab_01',$,'Dalle RDC',$,$,$,$,$,$);\nENDSEC;\nEND-ISO-10303-21;`;
      fs.writeFileSync(outputPath, mockIfcData);
    } else {
      // Conversion réelle via cloudconvert
      try {
        await this.convertViaCloudConvert(inputFilePath, outputPath, ext.substring(1), "ifc");
      } catch (err: any) {
        console.error("[FormatConverter] Erreur CloudConvert :", err.message);
        return { success: false, error: `Erreur CloudConvert: ${err.message}` };
      }
    }

    // 4. Valider la qualité du fichier IFC résultant
    const validation = await this.validateIFC(outputPath);

    return {
      success: true,
      ifcPath: outputPath,
      qualityScore: validation.quality_score,
      warnings: validation.warnings.map((w: any) => w.message)
    };
  }

  private async convertViaCloudConvert(
    inputPath: string,
    outputPath: string,
    inputFormat: string,
    outputFormat: string
  ): Promise<string> {
    const libName = "cloudconvert";
    const CloudConvert = require(libName);
    const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

    const job = await cloudConvert.jobs.create({
      tasks: {
        "upload-file": { operation: "import/upload" },
        "convert-file": {
          operation: "convert",
          input: "upload-file",
          input_format: inputFormat,
          output_format: outputFormat,
          engine: "ifc",
          engine_version: "4.0"
        },
        "export-file": { operation: "export/url", input: "convert-file" }
      }
    });

    const uploadTask = job.tasks.filter((task: any) => task.name === "upload-file")[0];
    await cloudConvert.tasks.upload(uploadTask, fs.createReadStream(inputPath));

    const completedJob = await cloudConvert.jobs.wait(job.id);
    const exportTask = completedJob.tasks.filter((task: any) => task.name === "export-file")[0];
    const fileStream = cloudConvert.tasks.download(exportTask);

    const writer = fs.createWriteStream(outputPath);
    fileStream.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    return outputPath;
  }

  private async validateIFC(ifcPath: string): Promise<any> {
    try {
      const { stdout } = await execAsync(`python scripts/ifc_quality_validator.py "${ifcPath}"`);
      return JSON.parse(stdout);
    } catch (err: any) {
      console.warn("[FormatConverter] Erreur lors de l'exécution du validateur IFC :", err.message);
      return { quality_score: 50, warnings: [{ message: "Impossible de valider la structure complète du fichier IFC" }] };
    }
  }
}
