import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { IFCAnalysisCache } from "@/lib/ifc/ifc-analysis-cache";

const execAsync = promisify(exec);

export async function GET() {
  try {
    const userId = "test_bim_user";
    const dummyIfcContent = Buffer.from("dummy-ifc-file-data-stream-" + Date.now());

    // 1. Tester la mise en cache IFC (getOrAnalyze)
    console.log("Testing IFC Analysis Cache...");
    const cacheManager = new IFCAnalysisCache();
    
    // Premier appel (Cache Miss -> Analyse & Écriture)
    const result1 = await cacheManager.getOrAnalyze(dummyIfcContent, userId);
    
    // Deuxième appel (Cache Hit -> Lecture directe)
    const result2 = await cacheManager.getOrAnalyze(dummyIfcContent, userId);

    // 2. Tester l'exportateur BCF en exécutant le script Python
    console.log("Testing BCF Exporter script...");
    const bcfOutputPath = path.join(process.cwd(), "scripts", "test_clashes.bcfzip");
    
    const clashesPayload = JSON.stringify(result1.clashes);
    // Éviter les problèmes d'échappement de chaînes Windows command line
    const escapedClashes = clashesPayload.replace(/"/g, '\\"');
    
    const bcfCommand = `python scripts/bcf_exporter.py "${escapedClashes}" "${bcfOutputPath}"`;
    const bcfExecResult = await execAsync(bcfCommand);
    console.log("BCF Execution output:", bcfExecResult.stdout);

    // 3. Tester le chargeur Neo4j en exécutant le script Python
    console.log("Testing Neo4j Loader script...");
    const quantitiesPayload = JSON.stringify(result1);
    const escapedQuantities = quantitiesPayload.replace(/"/g, '\\"');
    
    const neo4jCommand = `python scripts/ifc_to_neo4j.py "${escapedQuantities}" "bolt://localhost:7687" "neo4j" "password"`;
    const neo4jExecResult = await execAsync(neo4jCommand);
    console.log("Neo4j Execution output:", neo4jExecResult.stdout);

    return Response.json({
      success: true,
      ifcCacheResult: {
        clashCount: result2.clashes.length,
        wallCount: result2.walls.length,
        columnCount: result2.columns.length,
        slabCount: result2.slabs.length
      },
      bcfOutput: bcfExecResult.stdout.trim(),
      neo4jOutput: neo4jExecResult.stdout.trim()
    });
  } catch (err: any) {
    console.error("[API Test IFC Neo4j] Error:", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
