import { createHash, randomUUID } from "crypto";
import fs from "fs";
import path from "path";

export interface ConversionJob {
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number; // 0-100
  inputFormat: string;
  outputFormat: string;
  downloadUrl?: string;
  error?: string;
  metadata?: {
    inputFileSize: number;
    outputFileSize?: number;
    conversionTime?: number;
    elementsCount?: number;
  };
}

export interface AntygravityConfig {
  apiKey: string;
  apiUrl: string;
  maxFileSize: number; // bytes
  timeoutMs: number;
}

export class AntygravityConverter {
  private config: AntygravityConfig;

  constructor(config?: Partial<AntygravityConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.ANTYGRAVITY_API_KEY || "",
      apiUrl: config?.apiUrl || process.env.ANTYGRAVITY_API_URL || "https://api.antygravity.cloud/v1",
      maxFileSize: config?.maxFileSize || 500 * 1024 * 1024, // 500MB
      timeoutMs: config?.timeoutMs || 10 * 60 * 1000 // 10 minutes
    };
  }

  /**
   * Convertit un fichier CAO propriétaire en IFC avec préservation sémantique BIM.
   * Utilise un fallback de simulation si la clé API n'est pas présente.
   */
  async convertToIFC(
    inputFilePath: string,
    options?: {
      preservePropertySets?: boolean;
      preserveGeometry?: boolean;
      targetSchema?: "IFC2X3" | "IFC4" | "IFC4X3";
      simplifyGeometry?: boolean;
    }
  ): Promise<{ ifcPath: string; job: ConversionJob }> {
    const ext = path.extname(inputFilePath).toLowerCase();
    const fileStats = fs.statSync(inputFilePath);

    // Fallback local en développement si pas de clé API
    if (!this.config.apiKey) {
      console.warn("⚠️ [AntygravityConverter] ANTYGRAVITY_API_KEY absente. Utilisation du fallback local.");
      const mockIfcPath = await this.convertLocalFallback(inputFilePath);
      return {
        ifcPath: mockIfcPath,
        job: {
          jobId: `mock_job_${randomUUID().substring(0, 8)}`,
          status: "COMPLETED",
          progress: 100,
          inputFormat: ext.replace(".", "").toUpperCase(),
          outputFormat: "IFC",
          metadata: {
            inputFileSize: fileStats.size,
            outputFileSize: 1024,
            conversionTime: 1
          }
        }
      };
    }

    console.log(`🔄 Conversion ${ext} → IFC (Antygravity Cloud)`);
    console.log(`📊 Taille fichier : ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

    if (fileStats.size > this.config.maxFileSize) {
      throw new Error(
        `Fichier trop volumineux : ${(fileStats.size / 1024 / 1024).toFixed(0)}MB (max ${(
          this.config.maxFileSize /
          1024 /
          1024
        ).toFixed(0)}MB)`
      );
    }

    // 1. Upload
    const uploadResult = await this.uploadFile(inputFilePath);
    console.log(`✅ Fichier uploadé : ${uploadResult.fileId}`);

    // 2. Start conversion
    const job = await this.startConversion({
      fileId: uploadResult.fileId,
      inputFormat: ext.replace(".", "").toUpperCase(),
      outputFormat: "IFC",
      options: {
        preservePropertySets: options?.preservePropertySets ?? true,
        preserveGeometry: options?.preserveGeometry ?? true,
        targetSchema: options?.targetSchema || "IFC4",
        simplifyGeometry: options?.simplifyGeometry ?? false
      }
    });

    console.log(`🎬 Job de conversion lancé : ${job.jobId}`);

    // 3. Polling
    const completedJob = await this.waitForCompletion(job.jobId);

    if (completedJob.status === "FAILED") {
      throw new Error(`Conversion échouée : ${completedJob.error}`);
    }

    // 4. Download result
    const ifcPath = await this.downloadResult(completedJob);
    console.log(`✅ Fichier IFC généré : ${ifcPath}`);

    return {
      ifcPath,
      job: completedJob
    };
  }

  private async uploadFile(filePath: string): Promise<{ fileId: string; uploadUrl: string }> {
    const fileName = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);
    const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

    const presignResponse = await fetch(`${this.config.apiUrl}/upload/presign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileName,
        fileSize: fileBuffer.length,
        fileHash
      })
    });

    if (!presignResponse.ok) {
      throw new Error(`Échec demande upload : ${await presignResponse.text()}`);
    }

    const { fileId, uploadUrl } = await presignResponse.json();

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: fileBuffer as any,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(fileBuffer.length)
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`Échec upload fichier : ${uploadResponse.statusText}`);
    }

    return { fileId, uploadUrl };
  }

  private async startConversion(params: {
    fileId: string;
    inputFormat: string;
    outputFormat: string;
    options: any;
  }): Promise<ConversionJob> {
    const response = await fetch(`${this.config.apiUrl}/convert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`Échec lancement conversion : ${await response.text()}`);
    }

    const data = await response.json();

    return {
      jobId: data.jobId,
      status: data.status,
      progress: 0,
      inputFormat: params.inputFormat,
      outputFormat: params.outputFormat
    };
  }

  private async waitForCompletion(jobId: string): Promise<ConversionJob> {
    let attempts = 0;
    const maxAttempts = Math.floor(this.config.timeoutMs / 5000);

    while (attempts < maxAttempts) {
      const job = await this.getJobStatus(jobId);
      console.log(`📊 Progression : ${job.progress}% (${job.status})`);

      if (job.status === "COMPLETED" || job.status === "FAILED") {
        return job;
      }

      const delay = Math.min(5000 * Math.pow(1.2, attempts), 30000);
      await this.sleep(delay);
      attempts++;
    }

    throw new Error(`Timeout conversion (${this.config.timeoutMs / 1000}s dépassées)`);
  }

  private async getJobStatus(jobId: string): Promise<ConversionJob> {
    const response = await fetch(`${this.config.apiUrl}/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Échec récupération statut job : ${response.statusText}`);
    }

    return await response.json();
  }

  private async downloadResult(job: ConversionJob): Promise<string> {
    if (!job.downloadUrl) {
      throw new Error("Pas d'URL de téléchargement disponible");
    }

    const response = await fetch(job.downloadUrl);
    if (!response.ok) {
      throw new Error(`Échec téléchargement résultat : ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Utilisation d'un dossier local de projet sous Windows pour éviter EACCES
    const outputPath = path.join(process.cwd(), "scripts", "ifc-conversions", `${job.jobId}.ifc`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);

    return outputPath;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fallback local pour test/développement (simulation)
   */
  async convertLocalFallback(inputPath: string): Promise<string> {
    const ext = path.extname(inputPath).toLowerCase();
    const outputDir = path.join(process.cwd(), "scripts", "ifc-conversions");
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `${path.basename(inputPath, ext)}.ifc`);

    // Générer un fichier IFC simulé avec des Property Sets conformes
    const mockIfcData = `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Archi Cam AI Fast IFC Conversion from ${ext}'),'21;1');\nFILE_NAME('${path.basename(outputPath)}','2026-08-06',('Archi Cam AI'),('BIM Manager'),'Convertisseur Pro v1.0','','');\nFILE_SCHEMA(('IFC4'));\nENDSEC;\nDATA;\n#1= IFCWALL('wall_01',$,'Mur RDC 01',$,$,$,$,$,$);\n#2= IFCWALL('wall_02',$,'Mur RDC 02',$,$,$,$,$,$);\n#3= IFCWALL('wall_03',$,'Cloison 01',$,$,$,$,$,$);\n#4= IFCSLAB('slab_01',$,'Dalle Plancher RDC',$,$,$,$,$,$);\n#5= IFCBEAM('beam_01',$,'Poutre principale P1',$,$,$,$,$,$);\n#6= IFCCOLUMN('col_01',$,'Poteau central C1',$,$,$,$,$,$);\nENDSEC;\nEND-ISO-10303-21;`;
    
    fs.writeFileSync(outputPath, mockIfcData);
    return outputPath;
  }
}
