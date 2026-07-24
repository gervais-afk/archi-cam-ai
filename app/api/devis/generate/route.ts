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
        { error: 'Aucun fichier IFC fourni.' },
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
    
    // Retourner le résultat avec succès
    return NextResponse.json({
      success: true,
      estimate
    });
    
  } catch (error: any) {
    console.error('Erreur dans /api/devis/generate :', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne lors de la génération du devis.' },
      { status: 500 }
    );
  }
}
