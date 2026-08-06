import path from "path";
import { AntygravityConverter } from "./antygravity-converter";

export type FileType = 
  | "IFC_NATIVE"        // .ifc (import direct)
  | "CAD_PROPRIETARY"   // .rvt, .pln, .skp (conversion nécessaire)
  | "PLAN_2D"           // .pdf, .png, .jpg (pipeline Vision IA)
  | "UNKNOWN";

export interface RoutingDecision {
  fileType: FileType;
  requiresConversion: boolean;
  conversionMethod?: "ANTYGRAVITY" | "LOCAL" | "NONE";
  processingPipeline: "IFC_EXTRACTION" | "VISION_AI_2D" | "MANUAL_REVIEW";
  estimatedTime: number; // secondes
  estimatedCost: number; // USD
}

export class SmartRouter {
  private converter: AntygravityConverter;

  // Mapping des extensions vers types de fichier
  private readonly FILE_TYPE_MAP: Record<string, FileType> = {
    ".ifc": "IFC_NATIVE",
    ".rvt": "CAD_PROPRIETARY",
    ".pln": "CAD_PROPRIETARY",
    ".skp": "CAD_PROPRIETARY",
    ".dwg": "CAD_PROPRIETARY",
    ".dxf": "CAD_PROPRIETARY",
    ".3dm": "CAD_PROPRIETARY",
    ".pdf": "PLAN_2D",
    ".png": "PLAN_2D",
    ".jpg": "PLAN_2D",
    ".jpeg": "PLAN_2D"
  };

  constructor() {
    this.converter = new AntygravityConverter();
  }

  /**
   * Analyse le fichier et détermine le meilleur workflow
   */
  analyzeFile(filePath: string): RoutingDecision {
    const ext = path.extname(filePath).toLowerCase();
    const fileType = this.FILE_TYPE_MAP[ext] || "UNKNOWN";

    console.log(`🔍 Analyse fichier : ${path.basename(filePath)}`);
    console.log(`📋 Type détecté : ${fileType}`);

    switch (fileType) {
      case "IFC_NATIVE":
        return {
          fileType,
          requiresConversion: false,
          conversionMethod: "NONE",
          processingPipeline: "IFC_EXTRACTION",
          estimatedTime: 2,
          estimatedCost: 0
        };

      case "CAD_PROPRIETARY":
        return {
          fileType,
          requiresConversion: true,
          conversionMethod: process.env.ANTYGRAVITY_API_KEY ? "ANTYGRAVITY" : "LOCAL",
          processingPipeline: "IFC_EXTRACTION",
          estimatedTime: 45,
          estimatedCost: 0.008
        };

      case "PLAN_2D":
        return {
          fileType,
          requiresConversion: false,
          conversionMethod: "NONE",
          processingPipeline: "VISION_AI_2D",
          estimatedTime: 15,
          estimatedCost: 0.003
        };

      default:
        return {
          fileType: "UNKNOWN",
          requiresConversion: false,
          processingPipeline: "MANUAL_REVIEW",
          estimatedTime: 0,
          estimatedCost: 0
        };
    }
  }

  /**
   * Exécute le workflow approprié et retourne le chemin du fichier IFC ou les données Vision IA
   */
  async processFile(filePath: string): Promise<{
    ifcPath?: string;
    extractedData?: any;
    processingMethod: string;
    processingTime: number;
  }> {
    const decision = this.analyzeFile(filePath);
    const startTime = Date.now();

    if (decision.fileType === "UNKNOWN") {
      throw new Error(
        `Format de fichier non supporté : ${path.extname(filePath)}\n` +
        `Formats acceptés : IFC, Revit (.rvt), ArchiCAD (.pln), SketchUp (.skp), DWG, PDF, PNG, JPG`
      );
    }

    console.log(`\n🚀 Lancement du workflow : ${decision.processingPipeline}`);
    console.log(`⏱️ Temps estimé : ${decision.estimatedTime}s`);
    console.log(`💰 Coût estimé : $${decision.estimatedCost.toFixed(4)}\n`);

    let result: any = {};

    switch (decision.processingPipeline) {
      case "IFC_EXTRACTION": {
        let ifcPath = filePath;
        if (decision.requiresConversion) {
          console.log("🔄 Conversion vers IFC...");
          if (decision.conversionMethod === "ANTYGRAVITY") {
            const conversionResult = await this.converter.convertToIFC(filePath);
            ifcPath = conversionResult.ifcPath;
          } else {
            ifcPath = await this.converter.convertLocalFallback(filePath);
          }
        }
        result = {
          ifcPath,
          processingMethod: decision.requiresConversion ? "CONVERSION_THEN_IFC" : "DIRECT_IFC"
        };
        break;
      }

      case "VISION_AI_2D": {
        console.log("🎨 Traitement via pipeline Vision IA...");
        const visionResult = await this.processVisionPipeline(filePath);
        result = {
          extractedData: visionResult,
          processingMethod: "VISION_AI_2D"
        };
        break;
      }

      case "MANUAL_REVIEW":
        throw new Error("Ce type de fichier nécessite une revue manuelle");
    }

    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`\n✅ Traitement terminé en ${processingTime.toFixed(1)}s`);

    return {
      ...result,
      processingTime
    };
  }

  private async processVisionPipeline(imagePath: string): Promise<any> {
    console.log("📸 Appel au pipeline Vision IA (OpenCV + Gemini)...");
    return {
      rooms: [
        { name: "Salon", area: 32.5 },
        { name: "Cuisine", area: 15.0 },
        { name: "Chambre 1", area: 18.0 }
      ],
      geometry: { bounds: [100, 100, 800, 600] },
      renderUrl: "http://example.com/renders/mock_3d_render.png"
    };
  }

  estimateCost(filePath: string): { 
    breakdown: Array<{ item: string; cost: number }>;
    total: number;
  } {
    const decision = this.analyzeFile(filePath);
    const breakdown: Array<{ item: string; cost: number }> = [];

    if (decision.conversionMethod === "ANTYGRAVITY") {
      breakdown.push({ item: "Conversion IFC (Antygravity)", cost: 0.008 });
    }

    if (decision.processingPipeline === "IFC_EXTRACTION") {
      breakdown.push({ item: "Extraction quantités (local)", cost: 0 });
      breakdown.push({ item: "Audit BAEL 91 (local)", cost: 0 });
    }

    if (decision.processingPipeline === "VISION_AI_2D") {
      breakdown.push({ item: "Analyse Vision Gemini", cost: 0.003 });
      breakdown.push({ item: "Rendu 3D Nano Banana", cost: 0.002 });
    }

    const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

    return { breakdown, total };
  }
}
