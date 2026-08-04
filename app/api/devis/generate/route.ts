import { NextResponse, NextRequest } from 'next/server';
import { generateAgenticEstimate } from '@/lib/agentic-devis-engine';
import { verifyFirebaseToken } from '@/lib/firebase-server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  try {
    const firebaseToken = request.cookies.get("firebaseToken")?.value;
    const user = await verifyFirebaseToken(firebaseToken || "");
    const bypassAuth = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

    if (!user && !bypassAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    
    // Récupérer le fichier et les paramètres
    const file = formData.get('file') as File | null;
    const style = (formData.get('style') as string) || 'moyen';
    const ville = (formData.get('ville') as string) || 'Yaounde';
    
    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier (IFC, PDF ou Image) fourni.' },
        { status: 400 }
      );
    }
    
    // 1. Sauvegarder le fichier temporairement pour que Python (MCP) puisse le lire
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // On utilise le dossier temporaire du système d'exploitation
    const tempDir = os.tmpdir();
    const filePath = join(tempDir, `${Date.now()}_${file.name}`);
    await writeFile(filePath, buffer);
    
    // 2. Lancer le Cerveau Agentic RAG
    const estimate = await generateAgenticEstimate({
      ifcFilePath: filePath,
      margeBetPct: 5,
      margeAleasPct: 3,
      ville,
      standing: style
    });

    // 3. Foster+Partners Standards : Audit de Qualité BIM & Diagnostic IFC (Model Checking)
    let bimAuditReport = {
      lod: 300, // Niveau de développement par défaut
      complianceScore: 100, // Score sur 100
      issues: [] as string[],
      elementCounts: {
        walls: 0,
        slabs: 0,
        beams: 0,
        columns: 0,
        doors: 0,
        windows: 0,
      }
    };

    if (file.name.endsWith('.ifc')) {
      const content = buffer.toString('utf-8');
      
      // Compter les éléments structurels IFC clés
      bimAuditReport.elementCounts.walls = (content.match(/IFCWALL/gi) || []).length;
      bimAuditReport.elementCounts.slabs = (content.match(/IFCSLAB/gi) || []).length;
      bimAuditReport.elementCounts.beams = (content.match(/IFCBEAM/gi) || []).length;
      bimAuditReport.elementCounts.columns = (content.match(/IFCCOLUMN/gi) || []).length;
      bimAuditReport.elementCounts.doors = (content.match(/IFCDOOR/gi) || []).length;
      bimAuditReport.elementCounts.windows = (content.match(/IFCWINDOW/gi) || []).length;

      // Diagnostics Qualité
      const hasSpace = content.includes('IFCSPACE');
      const hasProject = content.includes('IFCPROJECT');
      const hasSite = content.includes('IFCSITE');
      
      if (!hasSpace) {
        bimAuditReport.issues.push("Avertissement : Aucun élément IFCSPACE détecté. Les calculs de volumes intérieurs peuvent être dégradés.");
        bimAuditReport.complianceScore -= 15;
      }
      if (!hasProject) {
        bimAuditReport.issues.push("Erreur : Métadonnées IFCPROJECT absentes. Structure organisationnelle du projet non conforme ISO 19650.");
        bimAuditReport.complianceScore -= 20;
      }
      if (!hasSite) {
        bimAuditReport.issues.push("Avertissement : Coordonnées du terrain IFCSITE absentes. Le géoréférencement sur le globe de relief Cesium 3D utilisera les valeurs par défaut.");
        bimAuditReport.complianceScore -= 15;
      }

      // Déduction du LOD (Level Of Development)
      const hasReinforcingBar = content.includes('IFCREINFORCINGBAR'); // Pour les aciers
      if (hasReinforcingBar) {
        bimAuditReport.lod = 400; // LOD très élevé contenant le ferraillage de détail
      } else if (bimAuditReport.elementCounts.beams > 0 && bimAuditReport.elementCounts.columns > 0) {
        bimAuditReport.lod = 300; // LOD standard avec structure porteuse
      } else {
        bimAuditReport.lod = 200; // LOD schématique
      }
    } else {
      bimAuditReport.issues.push("Le fichier importé n'est pas un fichier IFC standard. Rapport d'audit géométrique non disponible.");
      bimAuditReport.complianceScore = 0;
      bimAuditReport.lod = 100;
    }

    // Retourner le résultat avec succès + métadonnées fichier
    return NextResponse.json({
      success: true,
      estimate,
      meta: {
        fileName: file.name,
        fileSize: file.size,
        ville,
        generatedAt: new Date().toISOString(),
        bimAudit: bimAuditReport, // Intégration du rapport de conformité technique
      }
    });
    
  } catch (error: any) {
    console.error('Erreur dans /api/devis/generate :', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne lors de la génération du devis.' },
      { status: 500 }
    );
  }
}
